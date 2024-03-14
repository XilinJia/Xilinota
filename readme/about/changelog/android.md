# Xilinota Android Changelog

## [android-v2.15.1](https://https://github.com/XilinJia/Xilinota/releases/tag/v2.15.1) (Pre-release) - 2024-01-030T10:46:28Z

* removed fingerprint function due to security vulnerability of the dependency
* migrated to the well maintained library react-native-vision-camera for camera functions
* set newArchEnabled=false as some dependencies don't support fabric yet
* fixed "text must be in <Text>" bug

## [android-v2.15.0](https://https://github.com/XilinJia/Xilinota/releases/tag/v2.15.0) (Pre-release) - 2024-01-030T10:46:28Z

This is a major updates based on massive technical enhancements.
* Large and broad dependencies updates, including React Native 0.73.2
* Code quality enhancements
* Converted many JavaScript codes to TypeScript
* Converted most CJS syntax to ESM
* Replaced many usage of 'any'
* Clarified many signatures of functions and interfaces
* Ensured strict type and null safety checking
* Upgrade Gradle to 8.5
* Partly migrated codebase from Java to Kotlin
* Fixed a major problems in editor and local files sync related to Android 11 and newer
* The full resources directory remains in the app's private space.

## [android-v2.14.1](https://https://github.com/XilinJia/Xilinota/releases/tag/v2.14.1) (Pre-release) - 2024-01-08T10:46:28Z

Updated in-app instructions


## [android-v2.14.0](https://https://github.com/XilinJia/Xilinota/releases/tag/v2.14.0) (Pre-release) - 2024-01-07T10:46:28Z

* the full resources directory is relocated out of the config directory and into document home.
* resources within each notebook are hard-links to the full resources directory (on desktop now)
* resources formats in notes are better handled
* check about the resources section in the readme