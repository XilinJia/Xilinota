# Dropbox synchronisation

When syncing with Dropbox, Xilinota creates a sub-directory in Dropbox, in `/Apps/Xilinota` and reads/writes the notes and notebooks in it. The application does not have access to anything outside this directory.

In the **desktop application** or **mobile application**, select "Dropbox" as the synchronisation target in the [Configuration screen](https://github.com/XilinJia/Xilinota/blob/dev/readme/apps/config_screen.md) (it is selected by default). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

In the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application.