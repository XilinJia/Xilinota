# Tips

The first few notes should have given you an overview of the main functionalities of Xilinota, but there's more it can do. See below for some of these features and how to get more help using the app:

## Getting started with Xilinota

You can install the app and run it afresh, or, since it's compatible with Joplin's database, you may also choose to continue with what you have in Joplin. To do that, simply copy and rename the two related config directories under (on Linux) ~/.config to Xilinota and xilinota-desktop, respectively.

## Web clipper

![](./WebClipper.png)

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. To start using it, open the Xilinota desktop application, go to the Web Clipper Options and follow the instructions.

More info on the official website: https://joplinapp.org/clipper/

## Plugins

Xilinota supports Joplin's plugin api that allows you to add new features to the app, such as tabs, a table of content for your notes, a way to manage favourite notes, and many other ones. To add a plugin, go to the "Plugins" section in the config screen. From there you can search and install plugins, as well as search or update plugins.

## Attachments

Any kind of file can be attached to a note. In Markdown, links to these files are represented as an ID. In the note viewer, these files, if they are images, will be displayed or, if they are other files (PDF, text files, etc.) they will be displayed as links. Clicking on this link will open the file in the default application.

Images can be attached either by clicking on "Attach file" or by pasting (with `Ctrl+V` or `Cmd+V`) an image directly in the editor, or by drag and dropping an image.

More info about attachments: https://xilinotaapp.org/help/#attachments

## Search

Xilinota supports advanced search queries, which are fully documented on the official website: https://xilinotaapp.org/help/#searching

## Alarms

An alarm can be associated with any to-do. It will be triggered at the given time by displaying a notification. To use this feature, see the documentation: https://xilinotaapp.org/help/#notifications

## Markdown advanced tips

Xilinota uses and renders [Github-flavoured Markdown](https://joplinapp.org/markdown/) with a few variations and additions.

For example, tables are supported:

| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebra stripes | are neat      |    $1 |

You can also create lists of checkboxes. These checkboxes can be ticked directly in the viewer, or by adding an "x" inside:

- [ ] Milk
- [ ] Eggs
- [x] Beer

Math expressions can be added using the [KaTeX notation](https://khan.github.io/KaTeX/):

$$
f(x) = \int_{-\infty}^\infty
    \hat f(\xi)\,e^{2 \pi i \xi x}
    \,d\xi
$$

Various other tricks are possible, such as using HTML, or customising the CSS. See the Markdown documentation for more info - https://xilinotaapp.org/markdown/

## Further help

- For general discussion about Xilinota, user support, software development questions, and to discuss new features, go to the [Xilinota Forum](https://github.com/XilinJia/Xilinota/discussions). It is possible to login with your GitHub account.
- The latest news are posted [on the Patreon page](https://www.patreon.com/xilinota).
- For bug reports and feature requests, go to the [GitHub Issue Tracker](https://github.com/XilinJia/Xilinota/issues).

## Donations

Donations to Xilinota support the development of the project. Developing quality applications mostly takes time, but there are also some expenses, such as digital certificates to sign the applications, app store fees, hosting, etc. Most of all, your donation will make it possible to keep up the current development standard.

Please see the [donation page](https://xilinotaapp.org/donate/) for information on how to support the development of Xilinota.