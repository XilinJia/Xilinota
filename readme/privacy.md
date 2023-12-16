# Xilinota Privacy Policy

The Xilinota applications, including the Android, iOS, Windows, macOS and Linux applications, do not send any data to any service without your authorisation. Any data that Xilinota saves, such as notes or images, are saved to your own device and you are free to delete this data at any time.

In order to provide certain features, Xilinota may need to connect to third-party services. You can disable most of these features in the application settings:

| Feature  | Description   | Default  | Can be disabled |
| -------- | ------------- | -------- | --- |
| Auto-update | Xilinota periodically connects to `objects.xilinotausercontent.com` to check for new releases. | Enabled | Yes |
| Geo-location | Xilinota saves geo-location information in note properties when you create a note. For that it will connect to either `ipwho.is` or `geoplugin.net` | Enabled | Yes |
| Synchronisation | Xilinota supports synchronisation of your notes across multiple devices. If you choose to synchronise with a third-party, such as OneDrive, the notes will be sent to your OneDrive account, in which case the third-party privacy policy applies. | Disabled | Yes |
| Wifi connection check | On mobile, Xilinota checks for Wifi connectivity to give the option to synchronise data only when Wifi is enabled. | Enabled | No <sup>(1)</sup> |
| Spellchecker dictionary | On Linux and Windows, the desktop application downloads the spellchecker dictionary from `redirector.gvt1.com`. | Enabled | Yes <sup>(2)</sup> |
| Plugin repository | The desktop application downloads the list of available plugins from the [official GitHub repository](https://github.com/xilinota/plugins). If this repository is not accessible (eg. in China) the app will try to get the plugin list from [various mirrors](https://github.com/XilinJia/Xilinota/blob/8ac6017c02017b6efd59f5fcab7e0b07f8d44164/packages/lib/services/plugins/RepositoryApi.ts#L22), in which case the plugin screen [works slightly differently](https://github.com/XilinJia/Xilinota/issues/5161#issuecomment-925226975). | Enabled | No
| Voice typing | If you use the voice typing feature on Android, the application will download the language files from https://alphacephei.com/vosk/models | Disabled | Yes

<sup>(1) https://github.com/XilinJia/Xilinota/issues/5705</sup><br/>
<sup>(2) If the spellchecker is disabled, [it will not download the dictionary](https://discourse.xilinotaapp.org/t/new-version-of-xilinota-contacting-google-servers-on-startup/23000/40?u=laurent).</sup>

For any question about Xilinota privacy policy, please leave a message [on the forum](https://discourse.xilinotaapp.org/).
