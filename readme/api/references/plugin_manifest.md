# Plugin Manifest

The manifest file is a JSON file that describes various properties of the plugin. If you use the Yeoman generator, it should be automatically generated based on the answers you've provided. The supported properties are:

Name | Type | Required? | Description
--- | --- | --- | ---
`manifest_version` | number | **Yes** | For now should always be "1".
`name` | string | **Yes** | Name of the plugin. Should be a user-friendly string, as it will be displayed in the UI.
`version` | string | **Yes** | Version number such as "1.0.0".
`app_min_version` | string | **Yes** | Minimum version of Xilinota that the plugin is compatible with. In general it should be whatever version you are using to develop the plugin.
`description` | string | No | Detailed description of the plugin.
`author` | string | No | Plugin author name.
`keywords` | string[] | No | Keywords associated with the plugins. They are used in search in particular.
`homepage_url` | string | No | Homepage URL of the plugin. It can also be, for example, a link to a GitHub repository.
`repository_url` | string | No | Repository URL where the plugin source code is hosted.
`categories` | string[] | No | [Categories](#categories) that describes the functionality of the plugin. 
`screenshots` | Screenshot[] | No  | [Screenshots](#Screenshot) are used for listing on Xilinota Plugin website.
`icons` | Icons | No | If [Icons](#Icons) is not supplied, a standard extension icon will be used by default. You should supply at least a main icon, ideally 48x48 px in size. This is the icon that will be used in various plugin pages. You may, however, supply icons of any size and Xilinota will attempt to find the best icon to display in different components. Only PNG icons are allowed.

## Categories

| Category | Description |
| --- | --- |
| appearance | dealing with appearance of some element/s of the app. For example line numbers, layout, etc. |
| developer tools |  built for the developers. |
| editor |  enhancing note editor. |
| files |  dealing with files. For example import, export, backup, etc. |
| integrations | integrating third party services or apps. |
| personal knowledge management | managing and organizing notes. |
| productivity | making Xilinota more productive to use. |
| search |  enhancing search inside the app. |
| tags |  dealing with note tags. |
| themes |  changing theme of the app. |
| viewer | enhancing the rendering of a note. |

## Screenshot

| Properties | Description |
| --- | --- |
| src | a relative path to src dir. |
| label | description of the image. |

## Icons

| Properties | Description |
| --- | --- |
| 16 | a relative path to a PNG icon. |
| 32 | a relative path to a PNG icon. |
| 48 | a relative path to a PNG icon. |
| 128 | a relative path to a PNG icon. |

## Manifest example

```json
{
    "manifest_version": 1,
    "name": "Xilinota Simple Plugin",
    "description": "To test loading and running a plugin",
    "version": "1.0.0",
    "author": "John Smith",
    "app_min_version": "1.4",
    "homepage_url": "https://xilinotaapp.org",
    "screenshots": [{
        "src": "path/to/image.png",
        "label": "image description"
    }],
    "icons": {
      "16": "path/to/icon16.png",
      "32": "path/to/icon32.png",
      "48": "path/to/icon48.png",
      "128": "path/to/icon128.png"
    }
}
```
