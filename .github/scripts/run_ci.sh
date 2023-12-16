#!/bin/bash

# =============================================================================
# Setup environment variables
# =============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$SCRIPT_DIR/../.."

IS_PULL_REQUEST=0
IS_DEV_BRANCH=0
IS_LINUX=0
IS_MACOS=0

if [ "$GITHUB_EVENT_NAME" == "pull_request" ]; then
	IS_PULL_REQUEST=1
fi

if [ "$GITHUB_REF" == "refs/heads/dev" ]; then
	IS_DEV_BRANCH=1
fi

if [ "$RUNNER_OS" == "Linux" ]; then
	IS_LINUX=1
	IS_MACOS=0
else
	IS_LINUX=0
	IS_MACOS=1
fi

# =============================================================================
# Print environment
# =============================================================================

echo "GITHUB_WORKFLOW=$GITHUB_WORKFLOW"
echo "GITHUB_EVENT_NAME=$GITHUB_EVENT_NAME"
echo "GITHUB_REF=$GITHUB_REF"
echo "RUNNER_OS=$RUNNER_OS"
echo "GIT_TAG_NAME=$GIT_TAG_NAME"
echo "BUILD_SEQUENCIAL=$BUILD_SEQUENCIAL"
echo "SERVER_REPOSITORY=$SERVER_REPOSITORY"
echo "SERVER_TAG_PREFIX=$SERVER_TAG_PREFIX"

echo "IS_CONTINUOUS_INTEGRATION=$IS_CONTINUOUS_INTEGRATION"
echo "IS_PULL_REQUEST=$IS_PULL_REQUEST"
echo "IS_DEV_BRANCH=$IS_DEV_BRANCH"
echo "IS_LINUX=$IS_LINUX"
echo "IS_MACOS=$IS_MACOS"

echo "Node $( node -v )"
echo "Npm $( npm -v )"
echo "Yarn $( yarn -v )"

# =============================================================================
# Install packages
# =============================================================================

cd "$ROOT_DIR"
yarn install
testResult=$?
if [ $testResult -ne 0 ]; then
	echo "Yarn installation failed. Search for 'exit code 1' in the log for more information."
	exit $testResult
fi

# =============================================================================
# Run test units. Only do it for pull requests and dev branch because we don't
# want it to randomly fail when trying to create a desktop release.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	echo "Step: Running tests..."

	# On Linux, we run the Xilinota Server tests using PostgreSQL
	if [ "$IS_LINUX" == "1" ]; then
		echo "Running Xilinota Server tests using PostgreSQL..."
		sudo docker-compose --file docker-compose.db-dev.yml up -d
		export XILINOTA_TESTS_SERVER_DB=pg
	else
		echo "Running Xilinota Server tests using SQLite..."
	fi

	# Need this because we're getting this error:
	#
	# @xilinota/lib: FATAL ERROR: Ineffective mark-compacts near heap limit
	# Allocation failed - JavaScript heap out of memory
	#
	# https://stackoverflow.com/questions/38558989
	export NODE_OPTIONS="--max-old-space-size=32768"
	yarn run test-ci
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi

# =============================================================================
# Run linter for pull requests only. We also don't want this to make the desktop
# release randomly fail.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	echo "Step: Running linter..."

	yarn run linter-ci ./
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi

	yarn run packageJsonLint
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi

# =============================================================================
# Validate translations - this is needed as some users manually edit .po files
# (and often make mistakes) instead of using a proper tool like poedit. Doing it
# for Linux only is sufficient.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	if [ "$IS_LINUX" == "1" ]; then
		echo "Step: Validating translations..."

		node packages/tools/validate-translation.js
		testResult=$?
		if [ $testResult -ne 0 ]; then
			exit $testResult
		fi
	fi
fi

# =============================================================================
# Check that we didn't lose any string due to gettext not being able to parse
# newly modified or added scripts. This is convenient to quickly view on GitHub
# what commit may have broken translation building.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	if [ "$IS_LINUX" == "1" ]; then
		echo "Step: Checking for lost translation strings..."

		xgettext --version

		node packages/tools/build-translation.js --missing-strings-check-only
		testResult=$?
		if [ $testResult -ne 0 ]; then
			exit $testResult
		fi
	fi
fi

# =============================================================================
# Check .gitignore and .eslintignore files - they should be updated when
# new TypeScript files are added by running `yarn run updateIgnored`.
# See coding_style.md
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	if [ "$IS_LINUX" == "1" ]; then
		echo "Step: Checking for files that should have been ignored..."

		node packages/tools/checkIgnoredFiles.js 
		testResult=$?
		if [ $testResult -ne 0 ]; then
			exit $testResult
		fi
	fi
fi

# =============================================================================
# Check that the website still builds
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	echo "Step: Check that the website still builds..."

	mkdir -p ../xilinota-website/docs
	SKIP_SPONSOR_PROCESSING=1 yarn run buildWebsite
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi

# =============================================================================
# Find out if we should run the build or not. Electron-builder gets stuck when
# building PRs so we disable it in this case. The Linux build should provide
# enough info if the app builds or not.
# https://github.com/electron-userland/electron-builder/issues/4263
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	if [ "$IS_MACOS" == "1" ]; then
		echo "Step: Not building Electron app"
		exit 0
	fi
fi

# =============================================================================
# Build the Electron app or Docker image depending on the current tag.
#
# If the current tag is a desktop release tag (starts with "v", such as
# "v1.4.7"), we build and publish to GitHub. Otherwise we only build but don't
# publish to GitHub. It helps finding out any issue in pull requests and dev
# branch.
# =============================================================================

cd "$ROOT_DIR/packages/app-desktop"

if [[ $GIT_TAG_NAME = v* ]]; then
	echo "Step: Building and publishing desktop application..."
	# cd "$ROOT_DIR/packages/tools"
	# node bundleDefaultPlugins.js
	cd "$ROOT_DIR/packages/app-desktop"

	if [ "$IS_MACOS" == "1" ]; then
		# This is to fix this error:
		# 
		# Exit code: ENOENT. spawn /usr/bin/python ENOENT
		#
		# Ref: https://github.com/electron-userland/electron-builder/issues/6767#issuecomment-1096589528
		#
		# It can be removed once we upgrade to electron-builder@23, however we
		# cannot currently do this due to this error:
		# https://github.com/XilinJia/xilinota/issues/8149
		#
		# electron-builder@24, however, still expects the python binary to be named
		# "python" and seems to no longer respect the PYTHON_PATH environment variable.
		# We work around this by aliasing python.
		alias python=$(which python3)

		# https://github.com/actions/runner/issues/2958#issuecomment-1793782647
		sudo -H pip install setuptools

		USE_HARD_LINKS=false yarn run dist
	else
		USE_HARD_LINKS=false yarn run dist
	fi	
else
	echo "Step: Building but *not* publishing desktop application..."
	
	if [ "$IS_MACOS" == "1" ]; then
		# See above why we need to specify Python
		alias python=$(which python3)

		# https://github.com/actions/runner/issues/2958#issuecomment-1793782647
		sudo -H pip install setuptools

		# We also want to disable signing the app in this case, because
		# it randomly fails and we don't even need it
		# https://www.electron.build/code-signing#how-to-disable-code-signing-during-the-build-process-on-macos
		export CSC_IDENTITY_AUTO_DISCOVERY=false
		npm pkg set 'build.mac.identity'=null --json
		
		USE_HARD_LINKS=false yarn run dist --publish=never
	else
		USE_HARD_LINKS=false yarn run dist --publish=never
	fi
fi
