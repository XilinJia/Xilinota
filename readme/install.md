---
sidebar_position: 0.5
---

# Installation

Three types of applications are available: for **desktop** (Windows, macOS and Linux), for **mobile** (Android and iOS) and for **terminal** (Windows, macOS, Linux and FreeBSD). All the applications have similar user interfaces and can synchronise with each other.

## Desktop applications

Operating System | Download
---|---
Windows (32 and 64-bit) | <a href='https://objects.xilinotausercontent.com/v2.12.19/Xilinota-Setup-2.12.19.exe?source=XilinotaWebsite&type=New'><img alt='Get it on Windows' width="134px" src='https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/BadgeWindows.png'/></a>
macOS | <a href='https://objects.xilinotausercontent.com/v2.12.19/Xilinota-2.12.19.dmg?source=XilinotaWebsite&type=New'><img alt='Get it on macOS' width="134px" src='https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/BadgeMacOS.png'/></a>
Linux | <a href='https://objects.xilinotausercontent.com/v2.12.19/Xilinota-2.12.19.AppImage?source=XilinotaWebsite&type=New'><img alt='Get it on Linux' width="134px" src='https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/BadgeLinux.png'/></a>

**On Windows**, you may also use the <a href='https://objects.xilinotausercontent.com/v2.12.19/XilinotaPortable.exe?source=XilinotaWebsite&type=New'>Portable version</a>. The [portable application](https://en.wikipedia.org/wiki/Portable_application) allows installing the software on a portable device such as a USB key. Simply copy the file XilinotaPortable.exe in any directory on that USB key ; the application will then create a directory called "XilinotaProfile" next to the executable file.

**On Linux**, the recommended way is to use the following installation script as it will handle the desktop icon too:

<pre><code style="word-break: break-all">wget -O - https://raw.githubusercontent.com/xilinjia/xilinota/main/Joplin_install_and_update.sh | bash</code></pre>

The install and update script supports the [following flags](https://github.com/XilinJia/Xilinota/blob/main/Joplin_install_and_update.sh#L50) (around line 50 at the time of this writing).

## Mobile applications

Operating System | Download | Alt. Download
---|---|---
Android | <a href='https://play.google.com/store/apps/details?id=ac.mdiq.xilinota&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' style="max-height: 40px;" src='https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/BadgeAndroid.png'/></a> | or download the [APK file](https://objects.xilinotausercontent.com/v2.12.3/xilinota-v2.12.3.apk?source=XilinotaWebsite&type=New)
iOS | <a href='https://itunes.apple.com/us/app/xilinota/id1315599797'><img alt='Get it on the App Store' style="max-height: 40px;" src='https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/BadgeIOS.png'/></a> | -

## Terminal application

Operating system | Method
-----------------|----------------
macOS, Linux, or Windows (via [WSL](https://msdn.microsoft.com/en-us/commandline/wsl/faq?f=255&MSPPError=-2147217396)) | **Important:** First, [install Node 12+](https://nodejs.org/en/download/package-manager/).<br/><br/>`NPM_CONFIG_PREFIX=~/.xilinota-bin npm install -g xilinota`<br/>`sudo ln -s ~/.xilinota-bin/bin/xilinota /usr/bin/xilinota`<br><br>By default, the application binary will be installed under `~/.xilinota-bin`. You may change this directory if needed. Alternatively, if your npm permissions are setup as described [here](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory) (Option 2) then simply running `npm -g install xilinota` would work.

To start it, type `xilinota`.

For usage information, please refer to the full [Xilinota Terminal Application Documentation](https://xilinotaapp.org/help/apps/terminal/).

## Web Clipper

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. For more information on how to install and use it, see the [Web Clipper Help Page](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/clipper.md).

## Unofficial Alternative Distributions

There are a number of unofficial alternative Xilinota distributions. If you do not want to or cannot use appimages or any of the other officially supported releases then you may wish to consider these.

However these come with a caveat in that they are not officially supported so certain issues may not be supportable by the main project. Rather support requests, bug reports and general advice would need to go to the maintainers of these distributions.

A community maintained list of these distributions can be found here: [Unofficial Xilinota distributions](https://discourse.xilinotaapp.org/t/unofficial-alternative-xilinota-distributions/23703)
