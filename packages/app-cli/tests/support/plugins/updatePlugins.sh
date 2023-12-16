#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$SCRIPT_DIR/jpl_test/" && yo xilinota --update --skip-install --silent
sed -i /*.jpl/d .gitignore

cd "$SCRIPT_DIR/codemirror_content_script/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/content_script/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/dialog/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/editor_context_menu/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/events/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/json_export/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/menu/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/multi_selection/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/register_command/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/selected_text/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/settings/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/toc/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/withExternalModules/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/post_messages/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/nativeModule/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/external_assets/" && yo xilinota --update --skip-install --silent
cd "$SCRIPT_DIR/user_data/" && yo xilinota --update --skip-install --silent
