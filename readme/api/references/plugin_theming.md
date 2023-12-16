# Plugin theming

## CSS

Plugins add custom content to the UI using
[webview panels](https://xilinotaapp.org/api/references/plugin_api/classes/xilinotaviewspanels.html).
The HTML content of a a panel is styled with CSS.

To keep the look and feel of a plugin consistent with the rest of the Xilinota UI,
you are automatically provided with variables derived from the current theme.

Variables follow the naming convention `--xilinota-{property}` and are used
in your plugin's stylesheet as shown here.

```css
/* webview.css */
.container {
 color: var(--xilinota-color);
 font-family: var(--xilinota-font-family);
}
```

## Icons

In addition to variables, you have access to a set of standard font assets that ship with Xilinota.
These include:

* [Roboto](https://fonts.google.com/specimen/Roboto?preview.text_type=custom) - (the standard UI font, `font-family` referenced above)
* [Font Awesome](https://fontawesome.com/icons?d=gallery&p=2&m=free) - icon library
* [icoMoon](https://icomoon.io/#preview-free) - icon library (subset, see [style.css](https://github.com/XilinJia/Xilinota/blob/main/packages/app-desktop/style/icons/style.css))

To display an icon, use CSS and HTML like the following.

```css
/* style icons to match the theme */
.toolbarIcon {
    font-size: var(--xilinota-toolbar-icon-size);
}
.primary {
    color: var(--xilinota-color);
}
.secondary {
    color: var(--xilinota-color-2);
}
```

```html
<i class="toolbarIcon primary fas fa-music"></i> Font Awesome music icon
<br />
<i class="toolbarIcon secondary icon-notebooks"></i> icoMoon notebook icon
```
