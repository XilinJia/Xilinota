# Extending Xilinota

Xilinota provides a number of extension points to allow third-party applications to access its data, or to develop plugins.

The two main extension points are:

## Data API

The [data API](https://github.com/XilinJia/Xilinota/blob/main/readme/api/references/rest_api.md) provides access to Xilinota data to external applications. It is possible, using standard HTTP calls, to create, modify or delete notes, notebooks, tags, etc. as well as attach files to notes and retrieve these files.

This is for example how the web clipper communicates with Xilinota, and this is most likely what you will need if you have an external application that needs access to Xilinota data.

To get started with the data API, [check the documentation](https://github.com/XilinJia/Xilinota/blob/main/readme/api/references/rest_api.md).

## Plugin API

With plugins you can directly modify Xilinota by adding new features to the application. Using this API, you can:

- Access notes, folders, etc. via the data API
- Add a view to display custom data using HTML/CSS/JS
- Create a dialog to display information and get input from the user
- Create a new command and associate a toolbar button or menu item with it
- Get access to the note currently being edited and modify it
- Listen to various events and run code when they happen
- Hook into the application to set additional options and customise Xilinota's behaviour
- Create a module to export or import data into Xilinota
- Define new settings and setting sections, and get/set them from the plugin
- Create a new Markdown plugin to render custom markup.
- Create an editor plugin to modify, at a low-level, the behaviour of the Markdown editor (CodeMirror)

To get started with the plugin API, check the [Get Started](https://github.com/XilinJia/Xilinota/blob/main/readme/api/get_started/plugins.md) page or have a look at the [TOC tutorial](https://github.com/XilinJia/Xilinota/blob/main/readme/api/tutorials/toc_plugin.md).

Once you are familiar with the API, you can have a look at the [plugin API reference](https://xilinotaapp.org/api/references/plugin_api/classes/xilinota.html) for a detailed documentation about each supported feature.
