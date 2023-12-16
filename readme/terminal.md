# Xilinota

Xilinota is a free, open source note taking and to-do application, which can handle a large number of notes organised into notebooks. The notes are searchable, can be copied, tagged and modified with your own text editor.

Notes exported from Evernote via .enex files [can be imported](https://xilinotaapp.org/help/#importing) into Xilinota, including the formatted content (which is converted to Markdown), resources (images, attachments, etc.) and complete metadata (geolocation, updated time, created time, etc.). Plain Markdown files can also be imported.

The notes can be [synchronised](#synchronisation) with various targets including the file system (for example with a network directory), Nextcloud, Dropbox, OneDrive or WebDAV. When synchronising the notes, notebooks, tags and other metadata are saved to plain text files which can be easily inspected, backed up and moved around.

<img src="https://raw.githubusercontent.com/xilinjia/xilinota/dev/Assets/WebsiteAssets/images/ScreenshotTerminal.png" style="max-width: 60%">

# Installation

Operating system | Method
-----------------|----------------
macOS, Linux, or Windows (via [WSL](https://docs.microsoft.com/en-us/windows/wsl/faq)) | 1. First, [install Node 12+](https://nodejs.org/en/download/package-manager/).<br/><br/>2. Issue the following commands to install Xilinota Terminal: <br/>`NPM_CONFIG_PREFIX=~/.xilinota-bin npm install -g xilinota`<br/>`sudo ln -s ~/.xilinota-bin/bin/xilinota /usr/bin/xilinota`<br><br>3. Enter the following command to start Xilinota Terminal:<br>`xilinota`<br><br>By default, the application binary will be installed under `~/.xilinota-bin`. You may change this directory if needed. Alternatively, if your npm permissions are setup as described [here](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory) (Option 2) then simply running `npm -g install xilinota` would work.

## Unsupported methods

There are other ways to install the terminal application. However, they are not supported and problems must be reported to the upstream projects.

Operating system | Method
-----------------|----------------
Arch Linux       | An Arch Linux package is available [here](https://aur.archlinux.org/packages/xilinota/). To install it, use an AUR wrapper such as yay: `yay -S xilinota`. Both the CLI tool (type `xilinota`) and desktop app (type `xilinota-desktop`) are packaged. You can also install a compiled version with the [chaotic-aur](https://wiki.archlinux.org/index.php/Unofficial_user_repositories#chaotic-aur) repository. For support, please go to the [GitHub repo](https://github.com/masterkorp/xilinota-pkgbuild).

# Usage

To start the application type `xilinota`. This will open the user interface, which has three main panes: Notebooks, Notes and the text of the current note. There are also additional panels that can be toggled on and off via [shortcuts](#shortcuts).

<img src="https://raw.githubusercontent.com/xilinjia/xilinota/dev/Assets/WebsiteAssets/images/ScreenshotTerminalCaptions.png" height="450px">

## Input modes

Xilinota user interface is partly based on the text editor Vim and offers two different modes to interact with the notes and notebooks:

### Normal mode

Allows moving from one pane to another using the `Tab` and `Shift-Tab` keys, and to select/view notes using the arrow keys. Text area can be scrolled using the arrow keys too. Press `Enter` to edit a note. Various other [shortcuts](#shortcuts) are available.

### Command-line mode

Press `:` to enter command line mode. From there, the Xilinota commands such as `mknote` or `search` are available. See the [full list of commands](#commands).

It is possible to refer to a note or notebook by title or ID. However the simplest way is to refer to the currently selected item using one of these shortcuts:

Shortcut | Description
---------|------------
`$n`     | Refers to the currently selected note
`$b`     | Refers to the currently selected notebook
`$c`     | Refers to the currently selected item. For example, if the note list is current active, `$c` will refer to the currently selected note.

**Examples:**

Create a new note with title "Wednesday's meeting":

	mknote "Wednesday's meeting"

Create a new to-do:

	mktodo "Buy bread"

Move the currently selected note ($n) to the notebook with title "Personal"

	mv $n "Personal"

Rename the currently selected notebook ($b) to "Something":

	ren $b "Something"

Attach a local file to the currently selected note ($n):

	attach $n /home/laurent/pictures/Vacation12.jpg

The configuration can also be changed from command-line mode. For example, to change the current editor to Sublime Text:

	config editor "subl -w"

## Editing a note

To edit a note, select it and press `ENTER`. Or, in command-line mode, type `edit $n` to edit the currently selected note, or `edit "Note title"` to edit a particular note.

## Getting help

The complete usage information is available from command-line mode, by typing one of these commands:

Command | Description
--------|-------------------
`help`  | General help information
`help keymap` | Lists the available shortcuts
`help [command]` | Displays information about a particular command

If the help is not fully visible, press `Tab` multiple times till the console is in focus and use the arrow keys or page up/down to scroll the text.

For general information relevant to all the applications, see also [Xilinota home page](https://xilinotaapp.org).

# Importing notes from Evernote

To import Evernote data, follow these steps:

* First, export your Evernote notebooks to ENEX files as described [here](https://help.evernote.com/hc/en-us/articles/209005557-How-to-back-up-export-and-restore-import-notes-and-notebooks).
* In Xilinota, in [command-line mode](#command-line-mode), type `import /path/to/file.enex`. This will import the notes into a new notebook named after the filename.
* Then repeat the process for each notebook that needs to be imported.

# Synchronisation

One of the goals of Xilinota is to avoid being tied to any particular company or service, whether it is Evernote, Google or Microsoft. As such the synchronisation is designed without any hard dependency to any particular service. Most of the synchronisation process is done at an abstract level and access to external services, such as Nextcloud or Dropbox, is done via lightweight drivers. It is easy to support new services by creating simple drivers that provide a filesystem-like interface, i.e. the ability to read, write, delete and list items. It is also simple to switch from one service to another.

Currently, synchronisation is possible with Joplin Cloud, Nextcloud, S3, WebDAV, Dropbox, OneDrive or the local filesystem. To enable synchronisation please follow the instructions below. After that, the application will synchronise in the background whenever it is running, or you can click on "Synchronise" to start a synchronisation manually. Xilinota will background sync automatically after any content change is made on the local application.

If the **terminal client** has been installed, it is possible to also synchronise outside of the user interface by typing `xilinota sync` from the terminal. This can be used to setup a cron script to synchronise at a regular interval. For example, this would do it every 30 minutes:

 */30 * * * * /path/to/xilinota sync

## Nextcloud synchronisation

You will need to set the `sync.target` config variable and all the `sync.5.path`, `sync.5.username` and `sync.5.password` config variables to, respectively the Nextcloud WebDAV URL, your username and your password. This can be done from the command line mode using:

	:config sync.target 5
	:config sync.5.path https://example.com/nextcloud/remote.php/webdav/Xilinota
	:config sync.5.username YOUR_USERNAME
	:config sync.5.password YOUR_PASSWORD

If synchronisation does not work, please consult the logs in the app profile directory (`~/.config/xilinota`)- it is often due to a misconfigured URL or password. The log should indicate what the exact issue is.

## WebDAV synchronisation

Select the "WebDAV" synchronisation target and follow the same instructions as for Nextcloud above (for the **terminal application** you will need to select sync target 6 rather than 5).

For WebDAV-compatible services that are known to work with Xilinota see [WebDAV synchronisation](https://github.com/XilinJia/Xilinota#webdav-synchronisation).


## Dropbox synchronisation

You will need to set the `sync.target` config variable from the command line mode using:

	:config sync.target 7

When syncing with Dropbox, Xilinota creates a sub-directory in Dropbox, in `/Apps/Xilinota` and read/write the notes and notebooks from it. The application does not have access to anything outside this directory.

To initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application.

## Local filesystem synchronisation

Local filesystem sync can be initiated after starting the xilinota terminal app by using the [command-line mode](#command-line-mode)

	:config sync.target 2
	:config sync.2.path <path to local sync dir>

## OneDrive synchronisation

When syncing with OneDrive, Xilinota creates a sub-directory in OneDrive, in /Apps/Xilinota and read/write the notes and notebooks from it. The application does not have access to anything outside this directory.

To initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive).

# URLs

When Ctrl+Clicking a URL (or opening with the shortcut 'o' while it is highlighted), most terminals will open that URL in the default browser. However, one issue, especially with long URLs, is that they can end up like this:

<img src="https://raw.githubusercontent.com/xilinjia/xilinota/dev/Assets/WebsiteAssets/images/UrlCut.png" width="300px">

Not only it makes the text hard to read, but the link, being cut in two, will also not be clickable.

As a solution Xilinota tries to start a mini-server in the background and, if successful, all the links will be converted to a much shorter URL:

<img src="https://raw.githubusercontent.com/xilinjia/xilinota/dev/Assets/WebsiteAssets/images/UrlNoCut.png" width="300px">

Since this is still an actual URL, the terminal will still make it clickable. And with shorter URLs, the text is more readable and the links unlikely to be cut. Both resources (files that are attached to notes) and external links are handled in this way.

# Attachments / Resources

In Markdown, links to resources are represented as a simple ID to the resource. In order to give access to these resources, they will be, like links, converted to local URLs. Clicking this link will then open a browser, which will handle the file - i.e. display the image, open the PDF file, etc.

# Shell mode

Commands can also be used directly from a shell. To view the list of available commands, type `xilinota help all`. To reference a note, notebook or tag you can either use the ID (type `xilinota ls -l` to view the ID) or by title.

For example, this will create a new note "My note" in the notebook "My notebook":

	$ xilinota mkbook "My notebook"
	$ xilinota use "My notebook"
	$ xilinota mknote "My note"

To view the newly created note:

	$ xilinota ls -l
	fe889 07/12/2017 17:57 My note

Give a new title to the note:

	$ xilinota set fe889 title "New title"

# Shortcuts

There are two types of shortcuts: those that manipulate the user interface directly, such as `TAB` to move from one pane to another, and those that are simply shortcuts to actual commands. In a way similar to Vim, these shortcuts are generally a verb followed by an object. For example, typing `mn` ([m]ake [n]ote), is used to create a new note: it will switch the interface to command line mode and pre-fill it with `mknote ""` from where the title of the note can be entered. See below for the full list of default shortcuts:

	:                 enter_command_line_mode
	TAB               focus_next
	SHIFT_TAB         focus_previous
	UP                move_up
	DOWN              move_down
	PAGE_UP           page_up
	PAGE_DOWN         page_down
	ENTER             activate
	DELETE, BACKSPACE delete
	(SPACE)           todo toggle $n
	n                 next_link
	b                 previous_link
	o                 open_link
	tc                toggle_console
	tm                toggle_metadata
	/                 search ""
	mn                mknote ""
	mt                mktodo ""
	mb                mkbook ""
	yn                cp $n ""
	dn                mv $n ""

Shortcut can be configured by adding a keymap file to the profile directory in `~/.config/xilinota/keymap.json`. The content of this file is a JSON array with each entry defining a command and the keys associated with it.

As an example, this is the default keymap, but read below for a detailed explanation of each property.

```json
[
	{ "keys": [":"], "type": "function", "command": "enter_command_line_mode" },
	{ "keys": ["TAB"], "type": "function", "command": "focus_next" },
	{ "keys": ["SHIFT_TAB"], "type": "function", "command": "focus_previous" },
	{ "keys": ["UP"], "type": "function", "command": "move_up" },
	{ "keys": ["DOWN"], "type": "function", "command": "move_down" },
	{ "keys": ["PAGE_UP"], "type": "function", "command": "page_up" },
	{ "keys": ["PAGE_DOWN"], "type": "function", "command": "page_down" },
	{ "keys": ["ENTER"], "type": "function", "command": "activate" },
	{ "keys": ["DELETE", "BACKSPACE"], "type": "function", "command": "delete" },
	{ "keys": [" "], "command": "todo toggle $n" },
	{ "keys": ["n"], "type": "function", "command": "next_link" },
	{ "keys": ["b"], "type": "function", "command": "previous_link" },
	{ "keys": ["o"], "type": "function", "command": "open_link" },
	{ "keys": ["tc"], "type": "function", "command": "toggle_console" },
	{ "keys": ["tm"], "type": "function", "command": "toggle_metadata" },
	{ "keys": ["/"], "type": "prompt", "command": "search \"\"", "cursorPosition": -2 },
	{ "keys": ["mn"], "type": "prompt", "command": "mknote \"\"", "cursorPosition": -2 },
	{ "keys": ["mt"], "type": "prompt", "command": "mktodo \"\"", "cursorPosition": -2 },
	{ "keys": ["mb"], "type": "prompt", "command": "mkbook \"\"", "cursorPosition": -2 },
	{ "keys": ["yn"], "type": "prompt", "command": "cp $n \"\"", "cursorPosition": -2 },
	{ "keys": ["dn"], "type": "prompt", "command": "mv $n \"\"", "cursorPosition": -2 }
]
```

Each entry can have the following properties:

Name | Description
-----|------------
`keys` | The array of keys that will trigger the action. Special keys such as page up, down arrow, etc. needs to be specified UPPERCASE. See the [list of available special keys](https://github.com/cronvel/terminal-kit/blob/3114206a9556f518cc63abbcb3d188fe1995100d/lib/termconfig/xterm.js#L531). For example, `['DELETE', 'BACKSPACE']` means the command will run if the user pressed either the delete or backspace key. Key combinations can also be provided - in that case specify them lowercase. For example "tc" means that the command will be executed when the user pressed "t" then "c". Special keys can also be used in this fashion - simply write them one after the other. For instance, `CTRL_WCTRL_W` means the action would be executed if the user pressed "ctrl-w ctrl-w".
`type` | The command type. It can have the value "exec", "function" or "prompt". **exec**: Simply execute the provided [command](#commands). For example `edit $n` would edit the selected note. **function**: Run a special commands (see below for the list of functions). **prompt**: A bit similar to "exec", except that the command is not going to be executed immediately - this allows the user to provide additional data. For example `mknote ""` would fill the command line with this command and allow the user to set the title. A prompt command can also take a `cursorPosition` parameter (see below)
`command` | The command that needs to be executed
`cursorPosition` | An integer. For prompt commands, tells where the cursor (caret) should start at. This is convenient for example to position the cursor between quotes. Use a negative value to set a position starting from the end. A value of "0" means positioning the caret at the first character. A value of "-1" means positioning it at the end.

This is the list of special functions:

Name | Description
-----|------------
enter_command_line_mode | Enter command line mode
focus_next | Focus next pane (or widget)
focus_previous | Focus previous pane (or widget)
move_up | Move up (in a list for example)
move_down | Move down (in a list for example)
page_up | Page up
page_down | Page down
next_link | Select the next link in the currently opened note (the first link will be selected if no link is currently selected)
previous_link | Select the previous link in the currently opened note (the last link will be selected if no link is currently selected)
open_link | Open the currently selected link externally
activate | Activates the selected item. If the item is a note for example it will be open in the editor
delete | Deletes the selected item
toggle_console | Toggle the console
toggle_metadata | Toggle note metadata

# Commands

The following commands are available in [command-line mode](#command-line-mode):

	attach <note> <file>

	    Attaches the given file to the note.

	batch <file-path>

	    Runs the commands contained in the text file. There should be one command
	    per line.

	cat <note>

	    Displays the given note.

	    -v, --verbose  Displays the complete information about note.

	config [name] [value]

	    Gets or sets a config value. If [value] is not provided, it will show the
	    value of [name]. If neither [name] nor [value] is provided, it will list
	    the current configuration.

	    -v, --verbose         Also displays unset and hidden config variables.
	    --export              Writes all settings to STDOUT as JSON including
	                          secure variables.
	    --import              Reads in JSON formatted settings from STDIN.
	    --import-file <file>  Reads in settings from <file>. <file> must contain
	                          valid JSON.

	Possible keys/values:

	    sync.target                    Synchronisation target.
	                                   The target to synchronise to. Each sync
	                                   target may have additional parameters which
	                                   are named as `sync.NUM.NAME` (all
	                                   documented below).
	                                   Type: Enum.
	                                   Possible values: 0 ((None)), 2 (File
	                                   system), 3 (OneDrive), 5 (Nextcloud), 6
	                                   (WebDAV), 7 (Dropbox), 8 (S3 (Beta)), 9
	                                   (Xilinota Server (Beta)), 10 (Joplin Cloud).
	                                   Default: 0

	    sync.2.path                    Directory to synchronise with (absolute
	                                   path).
	                                   Attention: If you change this location,
	                                   make sure you copy all your content to it
	                                   before syncing, otherwise all files will be
	                                   removed! See the FAQ for more details:
	                                   https://xilinotaapp.org/faq/
	                                   Type: string.

	    sync.5.path                    Nextcloud WebDAV URL.
	                                   Attention: If you change this location,
	                                   make sure you copy all your content to it
	                                   before syncing, otherwise all files will be
	                                   removed! See the FAQ for more details:
	                                   https://xilinotaapp.org/faq/
	                                   Type: string.

	    sync.5.username                Nextcloud username.
	                                   Type: string.

	    sync.5.password                Nextcloud password.
	                                   Type: string.

	    sync.6.path                    WebDAV URL.
	                                   Attention: If you change this location,
	                                   make sure you copy all your content to it
	                                   before syncing, otherwise all files will be
	                                   removed! See the FAQ for more details:
	                                   https://xilinotaapp.org/faq/
	                                   Type: string.

	    sync.6.username                WebDAV username.
	                                   Type: string.

	    sync.6.password                WebDAV password.
	                                   Type: string.

	    sync.8.path                    AWS S3 bucket.
	                                   Attention: If you change this location,
	                                   make sure you copy all your content to it
	                                   before syncing, otherwise all files will be
	                                   removed! See the FAQ for more details:
	                                   https://xilinotaapp.org/faq/
	                                   Type: string.

	    sync.8.url                     AWS S3 URL.
	                                   Type: string.
	                                   Default: "https://s3.amazonaws.com/"

	    sync.8.region                  AWS region.
	                                   Type: string.

	    sync.8.username                AWS access key.
	                                   Type: string.

	    sync.8.password                AWS secret key.
	                                   Type: string.

	    sync.8.forcePathStyle          Force path style.
	                                   Type: bool.
	                                   Default: false

	    sync.9.path                    Xilinota Server URL.
	                                   Attention: If you change this location,
	                                   make sure you copy all your content to it
	                                   before syncing, otherwise all files will be
	                                   removed! See the FAQ for more details:
	                                   https://xilinotaapp.org/faq/
	                                   Type: string.

	    sync.9.username                Xilinota Server email.
	                                   Type: string.

	    sync.9.password                Xilinota Server password.
	                                   Type: string.

	    sync.10.username               Joplin Cloud email.
	                                   Type: string.

	    sync.10.password               Joplin Cloud password.
	                                   Type: string.

	    sync.maxConcurrentConnections  Max concurrent connections.
	                                   Type: int.
	                                   Default: 5

	    locale                         Language.
	                                   Type: Enum.
	                                   Possible values: ar (Arabic (93%)), eu
	                                   (Basque (27%)), bs_BA (Bosnian (Bosna i
	                                   Hercegovina) (67%)), bg_BG (Bulgarian
	                                   (България) (53%)), ca (Catalan (93%)),
	                                   hr_HR (Croatian (Hrvatska) (97%)), cs_CZ
	                                   (Czech (Česká republika) (89%)), da_DK
	                                   (Dansk (Danmark) (97%)), de_DE (Deutsch
	                                   (Deutschland) (97%)), et_EE (Eesti Keel
	                                   (Eesti) (51%)), en_GB (English (United
	                                   Kingdom) (100%)), en_US (English (United
	                                   States of America) (100%)), es_ES (Español
	                                   (España) (93%)), eo (Esperanto (30%)),
	                                   fi_FI (Finnish (Suomi) (93%)), fr_FR
	                                   (Français (France) (100%)), gl_ES (Galician
	                                   (España) (34%)), id_ID (Indonesian
	                                   (Indonesia) (92%)), it_IT (Italiano
	                                   (Italia) (90%)), hu_HU (Magyar
	                                   (Magyarország) (78%)), nl_BE (Nederlands
	                                   (België, Belgique, Belgien) (81%)), nl_NL
	                                   (Nederlands (Nederland) (85%)), nb_NO
	                                   (Norwegian (Norge, Noreg) (90%)), fa
	                                   (Persian (64%)), pl_PL (Polski (Polska)
	                                   (84%)), pt_BR (Português (Brasil) (94%)),
	                                   pt_PT (Português (Portugal) (84%)), ro
	                                   (Română (59%)), sl_SI (Slovenian
	                                   (Slovenija) (93%)), sv (Svenska (97%)),
	                                   th_TH (Thai (ประเทศไทย) (43%)), vi (Tiếng
	                                   Việt (90%)), tr_TR (Türkçe (Türkiye)
	                                   (93%)), uk_UA (Ukrainian (Україна) (83%)),
	                                   el_GR (Ελληνικά (Ελλάδα) (87%)), ru_RU
	                                   (Русский (Россия) (93%)), sr_RS (српски
	                                   језик (Србија) (76%)), zh_CN (中文 (简体)
	                                   (97%)), zh_TW (中文 (繁體) (90%)), ja_JP (日本語
	                                   (日本) (98%)), ko (한국어 (89%)).
	                                   Default: "en_GB"

	    dateFormat                     Date format.
	                                   Type: Enum.
	                                   Possible values: DD/MM/YYYY (30/01/2017),
	                                   DD/MM/YY (30/01/17), MM/DD/YYYY
	                                   (01/30/2017), MM/DD/YY (01/30/17),
	                                   YYYY-MM-DD (2017-01-30), DD.MM.YYYY
	                                   (30.01.2017), YYYY.MM.DD (2017.01.30),
	                                   YYMMDD (170130), YYYY/MM/DD (2017/01/30).
	                                   Default: "DD/MM/YYYY"

	    timeFormat                     Time format.
	                                   Type: Enum.
	                                   Possible values: HH:mm (20:30), h:mm A
	                                   (8:30 PM).
	                                   Default: "HH:mm"

	    uncompletedTodosOnTop          Uncompleted to-dos on top.
	                                   Type: bool.
	                                   Default: true

	    showCompletedTodos             Show completed to-dos.
	                                   Type: bool.
	                                   Default: true

	    notes.sortOrder.field          Sort notes by.
	                                   Type: Enum.
	                                   Possible values: user_updated_time (Updated
	                                   date), user_created_time (Created date),
	                                   title (Title), order (Custom order).
	                                   Default: "user_updated_time"

	    notes.sortOrder.reverse        Reverse sort order.
	                                   Type: bool.
	                                   Default: true

	    folders.sortOrder.field        Sort notebooks by.
	                                   Type: Enum.
	                                   Possible values: title (Title),
	                                   last_note_user_updated_time (Updated date).
	                                   Default: "title"

	    folders.sortOrder.reverse      Reverse sort order.
	                                   Type: bool.
	                                   Default: false

	    trackLocation                  Save geo-location with notes.
	                                   Type: bool.
	                                   Default: true

	    sync.interval                  Synchronisation interval.
	                                   Type: Enum.
	                                   Possible values: 0 (Disabled), 300 (5
	                                   minutes), 600 (10 minutes), 1800 (30
	                                   minutes), 3600 (1 hour), 43200 (12 hours),
	                                   86400 (24 hours).
	                                   Default: 300

	    editor                         Text editor command.
	                                   The editor command (may include arguments)
	                                   that will be used to open a note. If none
	                                   is provided it will try to auto-detect the
	                                   default editor.
	                                   Type: string.

	    net.customCertificates         Custom TLS certificates.
	                                   Comma-separated list of paths to
	                                   directories to load the certificates from,
	                                   or path to individual cert files. For
	                                   example: /my/cert_dir, /other/custom.pem.
	                                   Note that if you make changes to the TLS
	                                   settings, you must save your changes before
	                                   clicking on "Check synchronisation
	                                   configuration".
	                                   Type: string.

	    net.ignoreTlsErrors            Ignore TLS certificate errors.
	                                   Type: bool.
	                                   Default: false

	    sync.wipeOutFailSafe           Fail-safe.
	                                   Fail-safe: Do not wipe out local data when
	                                   sync target is empty (often the result of a
	                                   misconfiguration or bug)
	                                   Type: bool.
	                                   Default: true


	    revisionService.enabled        Enable note history.
	                                   Type: bool.
	                                   Default: true

	    revisionService.ttlDays        Keep note history for.
	                                   Type: int.
	                                   Default: 90

	    layout.folderList.factor       Notebook list growth factor.
	                                   The factor property sets how the item will
	                                   grow or shrink to fit the available space
	                                   in its container with respect to the other
	                                   items. Thus an item with a factor of 2 will
	                                   take twice as much space as an item with a
	                                   factor of 1.Restart app to see changes.
	                                   Type: int.
	                                   Default: 1

	    layout.noteList.factor         Note list growth factor.
	                                   The factor property sets how the item will
	                                   grow or shrink to fit the available space
	                                   in its container with respect to the other
	                                   items. Thus an item with a factor of 2 will
	                                   take twice as much space as an item with a
	                                   factor of 1.Restart app to see changes.
	                                   Type: int.
	                                   Default: 1

	    layout.note.factor             Note area growth factor.
	                                   The factor property sets how the item will
	                                   grow or shrink to fit the available space
	                                   in its container with respect to the other
	                                   items. Thus an item with a factor of 2 will
	                                   take twice as much space as an item with a
	                                   factor of 1.Restart app to see changes.
	                                   Type: int.
	                                   Default: 2

	cp <note> [notebook]

	    Duplicates the notes matching <note> to [notebook]. If no notebook is
	    specified the note is duplicated in the current notebook.

	done <note>

	    Marks a to-do as done.

	e2ee <command> [path]

	    Manages E2EE configuration. Commands are `enable`, `disable`, `decrypt`,
	    `status`, `decrypt-file`, and `target-status`.

	    -p, --password <password>  Use this password as master password (For
	                               security reasons, it is not recommended to use
	                               this option).
	    -v, --verbose              More verbose output for the `target-status`
	                               command
	    -o, --output <directory>   Output directory
	    --retry-failed-items       Applies to `decrypt` command - retries
	                               decrypting items that previously could not be
	                               decrypted.

	edit <note>

	    Edit note.

	export <path>

	    Exports Xilinota data to the given path. By default, it will export the
	    complete database including notebooks, notes, tags and resources.

	    --format <format>      Destination format: jex (Xilinota Export File), raw
	                           (Xilinota Export Directory), md (Markdown),
	                           md_frontmatter (Markdown + Front Matter)
	    --note <note>          Exports only the given note.
	    --notebook <notebook>  Exports only the given notebook.

	geoloc <note>

	    Displays a geolocation URL for the note.

	help [command]

	    Displays usage information.

	import <path> [notebook]

	    Imports data into Xilinota.

	    --format <format>                Source format: auto, jex, md,
	                                     md_frontmatter, raw, enex, enex
	    -f, --force                      Do not ask for confirmation.
	    --output-format <output-format>  Output format: md, html

	ls [note-pattern]

	    Displays the notes in the current notebook. Use `ls /` to display the list
	    of notebooks.

	    -n, --limit <num>      Displays only the first top <num> notes.
	    -s, --sort <field>     Sorts the item by <field> (eg. title, updated_time,
	                           created_time).
	    -r, --reverse          Reverses the sorting order.
	    -t, --type <type>      Displays only the items of the specific type(s).
	                           Can be `n` for notes, `t` for to-dos, or `nt` for
	                           notes and to-dos (eg. `-tt` would display only the
	                           to-dos, while `-tnt` would display notes and
	                           to-dos.
	    -f, --format <format>  Either "text" or "json"
	    -l, --long             Use long list format. Format is ID, NOTE_COUNT (for
	                           notebook), DATE, TODO_CHECKED (for to-dos), TITLE

	mkbook <new-notebook>

	    Creates a new notebook.

	mknote <new-note>

	    Creates a new note.

	mktodo <new-todo>

	    Creates a new to-do.

	mv <note> [notebook]

	    Moves the notes matching <note> to [notebook].

	ren <item> <name>

	    Renames the given <item> (note or notebook) to <name>.

	rmbook <notebook>

	    Deletes the given notebook.

	    -f, --force  Deletes the notebook without asking for confirmation.

	rmnote <note-pattern>

	    Deletes the notes matching <note-pattern>.

	    -f, --force  Deletes the notes without asking for confirmation.

	server <command>

	    Start, stop or check the API server. To specify on which port it should
	    run, set the api.port config variable. Commands are (start|stop|status).
	    This is an experimental feature - use at your own risks! It is recommended
	    that the server runs off its own separate profile so that no two CLI
	    instances access that profile at the same time. Use --profile to specify
	    the profile path.

	set <note> <name> [value]

	    Sets the property <name> of the given <note> to the given [value].
	    Possible properties are:

	    parent_id (text), title (text), body (text), created_time (int),
	    updated_time (int), is_conflict (int), latitude (numeric), longitude
	    (numeric), altitude (numeric), author (text), source_url (text), is_todo
	    (int), todo_due (int), todo_completed (int), source (text),
	    source_application (text), application_data (text), order (numeric),
	    user_created_time (int), user_updated_time (int), encryption_cipher_text
	    (text), encryption_applied (int), markup_language (int), is_shared (int),
	    share_id (text), conflict_original_id (text), master_key_id (text)

	status

	    Displays summary about the notes and notebooks.

	sync

	    Synchronises with remote storage.

	    --target <target>   Sync to provided target (defaults to sync.target
	                        config value)
	    --upgrade           Upgrade the sync target to the latest version.
	    --use-lock <value>  Disable local locks that prevent multiple clients from
	                        synchronizing at the same time (Default = 1)

	tag <tag-command> [tag] [note]

	    <tag-command> can be "add", "remove", "list", or "notetags" to assign or
	    remove [tag] from [note], to list notes associated with [tag], or to list
	    tags associated with [note]. The command `tag list` can be used to list
	    all the tags (use -l for long option).

	    -l, --long  Use long list format. Format is ID, NOTE_COUNT (for notebook),
	                DATE, TODO_CHECKED (for to-dos), TITLE

	todo <todo-command> <note-pattern>

	    <todo-command> can either be "toggle" or "clear". Use "toggle" to toggle
	    the given to-do between completed and uncompleted state (If the target is
	    a regular note it will be converted to a to-do). Use "clear" to convert
	    the to-do back to a regular note.

	undone <note>

	    Marks a to-do as non-completed.

	use <notebook>

	    Switches to [notebook] - all further operations will happen within this
	    notebook.

	version

	    Displays version information

# License

Copyright (c) 2016-2023 Laurent Cozic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
