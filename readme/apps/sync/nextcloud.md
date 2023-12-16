# Nextcloud synchronisation

<img src="https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/nextcloud-logo-background.png" width="100" align="left"> <a href="https://nextcloud.com/">Nextcloud</a> is a self-hosted, private cloud solution. It can store documents, images and videos but also calendars, passwords and countless other things and can sync them to your laptop or phone. As you can host your own Nextcloud server, you own both the data on your device and infrastructure used for synchronisation. As such it is a good fit for Xilinota. The platform is also well supported and with a strong community, so it is likely to be around for a while - since it's open source anyway, it is not a service that can be closed, it can exist on a server for as long as one chooses.

In the **desktop application** or **mobile application**, go to the [Configuration screen](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/config_screen.md) and select Nextcloud as the synchronisation target. Then input the WebDAV URL (to get it, click on Settings in the bottom left corner of the page, in Nextcloud), this is normally `https://example.com/nextcloud/remote.php/webdav/Xilinota` (**make sure to create the "Xilinota" directory in Nextcloud**), and set the username and password. If it does not work, please [see this explanation](https://github.com/XilinJia/Xilinota/issues/61#issuecomment-373282608) for more details.

In the **terminal application**, you will need to set the `sync.target` config variable and all the `sync.5.path`, `sync.5.username` and `sync.5.password` config variables to, respectively the Nextcloud WebDAV URL, your username and your password. This can be done from the command line mode using:

 :config sync.5.path <https://example.com/nextcloud/remote.php/webdav/Xilinota>
 :config sync.5.username YOUR_USERNAME
 :config sync.5.password YOUR_PASSWORD
 :config sync.target 5

If synchronisation does not work, please consult the logs in the app profile directory - it is often due to a misconfigured URL or password. The log should indicate what the exact issue is.
