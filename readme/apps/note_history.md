# Note History

The Xilinota applications automatically save previous versions of your notes at regular intervals. These versions are synced across devices and can be viewed from the desktop application.

A common complain with many sync-based note taking apps is that they work in an opaque way - sometimes notes are changed or they disappear and it's not clear why - it could be a user error, or some bug, but regardless it makes it hard to trust the app with thousands of notes. So this feature give transparency over what's happening - if some note seems to be gone or changed when it shouldn't, the redundant data allows investigating the issue and restoring content.

### How does it work?

All the apps save a version of the modified notes every 10 minutes. These revisions are then synced across all the devices so if you're looking for a particular version of a note that was made on mobile, you can later find that version on the desktop app too.

### How to view the history of a note?

While all the apps save revisions, currently only the desktop one allow viewing these revisions.

To do so, click on the Information icon in the toolbar, then select "Previous version of this note".

![](https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/news/20190523-231026_0.png)

The next screen will show the latest version of the note. You can then choose to view a different version, if any, or to restore one of them.

To restore a note, simply click on the "Restore" button. The old version of the note will be copied in a folder called "Restored Notes". The current version of the note will not be replaced or modified.

![](https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/news/20190523-231026_1.png)

### How to configure the note history feature?

Additional options are available in the `Note History` page of the [Configuration screen](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/config_screen.md). It is possible to enable/disable the note history feature. It is also possible to specify for how long the history of a note should be kept (by default, for 90 days).

**IMPORTANT**: Please note that since all the revisions are synced across all devices, it means these settings are kind of global. So for example, if on one device you set it to keep revisions for 30 days, and on another to 100 days, the revisions older than 30 days will be deleted, and then this deletion will be synced. So in practice it means revisions are kept for whatever is the minimum number of days as set on any of the devices. In that particular case, the 100 days setting will be essentially ignored, and only the 30 days one will apply.
