# Custom CSS

Rendered markdown can be customized by placing a userstyle file in the profile directory `~/.config/xilinota-desktop/userstyle.css` (This path might be different on your device - check at the top of the `General` page of the [Configuration screen](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/config_screen.md) for the exact path). This file supports standard CSS syntax. Xilinota ***must*** be restarted for the new css to be applied, please ensure that Xilinota is not closing to the tray, but is actually exiting. Note that this file is used for both displaying the notes and printing the notes. Be aware how the CSS may look printed (for example, printing white text over a black background is usually not wanted).

The whole UI can be customized by placing a custom editor style file in the profile directory `~/.config/xilinota-desktop/userchrome.css`.

Important: userstyle.css and userchrome.css are provided for your convenience, but they are advanced settings, and styles you define may break from one version to the next. If you want to use them, please know that it might require regular development work from you to keep them working. The Xilinota team cannot make a commitment to keep the application HTML structure stable.
