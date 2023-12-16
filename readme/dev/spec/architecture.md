# Xilinota architecture

Xilinota as a project is organised around three main components:

- The user applications: For [desktop](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/desktop.md), [mobile](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/mobile.md) and [CLI](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/terminal.md))
- [Xilinota Server](https://github.com/XilinJia/Xilinota/blob/main/packages/server/README.md)
- [Web Clipper](https://github.com/XilinJia/Xilinota/blob/main/readme/apps/clipper.md)

## User applications

The desktop, mobile and CLI applications have the same architecture and mostly the same backend. The main difference is for the UI, where they each use a different framework, and for system integration (eg. notifications, importing or exporting files, etc.).

The overall architecture for each application is as such:

- Front end: The user facing part of the app. This is different for each applications (see below for the difference between applications)

- Back end: This is shared by all applications. It is made of:

  - Services: Provide high-level functionalities, such as the [search engine](https://github.com/XilinJia/Xilinota/tree/main/packages/lib/services/searchengine), [plugin system](https://github.com/XilinJia/Xilinota/tree/main/packages/lib/services/plugins) or [synchroniser](https://github.com/XilinJia/Xilinota/blob/main/packages/lib/Synchronizer.ts).

  - Models: The model layer sits between the services and database. They provide a higher level abstraction than SQL and utility functions to easily save data, such as notes, notebooks, etc.

  - Database: All applications use a local [SQLite database](https://sqlite.org/index.html) to store notes, settings, cache, etc. This is only a local database.

- Configuration: The application is configured using a `settings.json` file. Its schema is available online: <https://xilinotaapp.org/schema/settings.json>

<img src="https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/architecture/Application.png" style="max-width: 100%;"/>

### Desktop application

The desktop application is developed using [Electron](https://www.electronjs.org/), with a front end done in [React](https://react.dev/). The backend runs on [Node.js](https://nodejs.org/).

### Mobile application

The mobile application is developed using [React Native](https://reactnative.dev/). The backend runs on React Native's own [Hermes JavaScript engine](https://hermesengine.dev/).

### CLI application

This application is to use Xilinota from the terminal. It is developed using [terminal-kit](https://github.com/cronvel/terminal-kit). The backend runs on Node.js.

## Xilinota Server

Xilinota Server is used to synchronise the application data between multiple devices. Thus, a user can have their notes on their laptop, and on the go, on their phone. Xilinota Server also allows user to share notebooks with others, and publish notes to the internet. Because it is designed specifically for Xilinota, it also offers improved performance, compared to other synchronisation targets.

A typical Xilinota Server installation will use the following elements:

- The [Xilinota Server application](https://github.com/XilinJia/Xilinota/blob/main/packages/server/README.md). This is a Node.js application. It exposes a REST API that is used by the Xilinota clients to upload or download notes, notebooks, and other Xilinota objects.

- [PostgreSQL](https://www.postgresql.org/): it is used to save the "item" metadata. An "item" can be a note, a notebook, a tag, etc. It is also used to save other informations, such as user accounts, access logs, etc.

- [AWS S3](https://aws.amazon.com/s3/): it is used to save the item content. In other words, the note body, the file attachments, etc.

- [Nginx](https://www.nginx.com/): It is used as a reverse proxy and for TLS termination.

- A configuration file: A `.env` file, which contains environement variables used to configure the server.

This is a typical Xilinota Server installation, but many of its components can be configured - for example it is possible to use a different database engine, or to use the filesystem instead of AWS S3. Any reverse proxy would also work - using Nginx is not required.

<img src="https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/WebsiteAssets/images/architecture/XilinotaServer.png" style="max-width: 100%;"/>

## Web Clipper

The Web Clipper is a browser extension for Firefox and Chrome. It is used to capture a web page, a part of a page, or a screenshot from the browser, and save it to Xilinota.

It is developed using the [WebExtensions API](https://extensionworkshop.com/documentation/develop/about-the-webextensions-api/) with the popup being done using React.

## More information

- [Plugin Architecture spec](https://github.com/XilinJia/Xilinota/blob/main/readme/dev/spec/plugins.md)
- [E2EE: Technical spec](https://github.com/XilinJia/Xilinota/blob/main/readme/dev/spec/e2ee.md)
- [E2EE: Workflow](https://github.com/XilinJia/Xilinota/blob/main/readme/dev/spec/e2ee/workflow.md)
- [All Xilinota technical specifications](https://github.com/XilinJia/Xilinota/tree/main/readme/dev/spec)
