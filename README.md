![](./Assets/XilinotaLogoBlue.png)

<img width="100" src="https://raw.githubusercontent.com/xilinjia/xilinota/main/Assets/LinuxIcons/256x256.png" align="left" style="margin-right:15px"/>

is a free and open source (FOSS) note-taking and to-do project delivering applications running on multiple platforms (Linux, Windows, MacOS, Android, and iOS), capable of handling large number of notes organised in notebooks, and syncing notes across the platforms in various ways.

This is based on a fork from Joplin (the popular note-taking project) and is currently updated with the original codebase of version 2.13.4.

The aim of this project is to extend and enhance features in various directions, among which currently implemented are syncing notes with markdown files on the file system, virtual notebooks for improved organization, instant and delayed instant syncing across devices, and efficiency enhancements, and at the same time, maintain compatibility with Joplin in most aspects.

## Notable features included

Majority of notable features from Joplin remain, including importing notes from various other software like Evernote, saving web-pages from a web-clipper, working with notes in standard markdown format, using links with anything possible, full-text searching, extending with community plugins and themes.

To know more about Joplin, refer to <https://joplinapp.org/>

## To start

You can install the app and run it afresh, or, as it's compatible with Joplin's database, you may also choose with continue with what you have in Joplin.  To do that, simply copy and rename the two config directories under (on Linux) ~/.config to Xilinota and xilinota-desktop, respectively.

## New feature #1: Notes and markdown files

The central belief of this feature is that the notes are valuable properties of yours, likely an extension of your mind.  Xilinota keeps the notes and notebooks in a straight-forward file structure, with notes stored in markdown files each having the title as the file name.  The files and folders are maintained up-to-date with the internal database.  This gives you better access to and use of your notes outside of Xilinota.  You can create, add, edit, or delete the files with your favorite tools on your system, and the content of these files will be synced into Xilinota when you start it.  And, in any case when you change your mind about the choice of applications, the notes are in text form and you can easily adopt new ways of management.

#### Disktop application

On the desktop application, the default home directory where the notebooks and notes are saved to are under "Xilinotas" under "Documents" of the user's home directory, in Linux notion: "/home/loginname/Documents/Xilinotas/" (it can not be customized now). Under there, there are sub-directories based on your profile ID. If you haven't added additional profiles, all the notebooks and notes are saved under the "default" sub-directory. Notebooks are organized as directory trees and note files are under the associated notebook folders. (Note, if you are running a dev version from source, the directory would be "/home/loginname/Documents/XilinotasDev/").

#### Android app

The default home directory on Android is different. On Android 9 or older, the directory is "/Android/data/ac.mdiq.xilinota/files/Xilinotas". On Android 10 or newer, the directory is chosen by you upon first start of Xilinota. These directories can not be changed at the moment. (With dev version, on Android 9 or older, the directory is "/Android/data/ac.mdiq.xilinota/files/XilinotasDev".

#### Mechanisms

Upon the start of Xilinota when the home directories don't exist, Xilinota will create them and populate them with sub-directories and files. If you have lots of notes, there's going to be a short wait, (with Xilinota desktop) a popup with an animating bar indicates the task is in progress.  Sub-directories are named with the titles of the notebooks. Files are named with the titles of the notes, as: "the note title.md". In the case of a to-do note, it is named as "X - note title.md" (if the to-do is not completed), or "V - note title.md" (if the to-do has been completed).

Any special character among `?:\"*|/\\<>` in the title are removed.

You can create, update, move, delete notes or notebooks in Xilinota and the files and directories are promptly updated.

#### Resources

Resources (images or attachments in notes) are now located in the ".resources" sub-directory in the directory of every notebook ("_resources" sub-directory is reserved for future use).  Markdown file shown in external viewer now shows the related resources.  Resource files are copied when the "Xilinotas" directory first gets populated and are saved on note edit when resources are added to the note.  Resources now follow the associated note, i.e., when you move/remove note, the related resource files will be similarly handled.

Resource files are currently copied from Xilinota's config directory, so you have duplicate files on your system.  Going forward, it appears more reasonable to have the resources close to the note files, so I'm looking into the possibilities of removing the resources directory under Xilinota's config directory.  But this will be at a later stage.

Files and folders in the file system are sync'ed back to Xilinota.  The process takes place at the start of Xilinota.  With Xilinota desktop, similar to the first file population process, there is a popup with an animated bar during the sync process.  In the mobile apps, this sync process runs in the background without blocking any other functions of Xilinota.

Any added or deleted note files or folders will be synced into Xilinota (an empty folder added is ignored). A markdown file if edited after the previous exit of Xilinota is also synced.  Adding an external folder with markdown files will get all files synced in.  Removing a folder also results in getting all notes in the folder removed from Xilinota after sync (though the notebook corresponding to the folder stays).

A positive note: if you remove the home directory, or the profile directory (e.g. default) under the home directory, or all the folders and files under the profile directory, Xilinota will not delete all of your notes and notebooks in the DB, rather it will re-populate the entire home directory.

#### Special notice and limitations

Currently, moving folders in the file system is not synced into Xilinota.  Also, moving a note to another folder is not supported for syncing and this is not encouraged because manually moving a note file can result in mismatched resources linked.  So these operations are better conducted within Xilinota.

## New Feature #2: Instant sync among devices

Syncing notes through cloud, external servers, or with the assistance of third-party application like Syncthing can still be used if you like. Xilinota propose a new way for you to sync your notes: an instant way, which surely is more convenient. Certainly Xilinota runs on multiple platforms you choose, however, all those are to serve one person: you, the user.  So the capability of doing instant sync removes the process of going a long way through complicated setups and handling.  Here is how it works.

Currently, it assumes that you use your computer doing the heavy work of note-taking and your phones being assistants or doing the casual parts.  You can choose to keep only part or all the notebooks from your computer onto any phone (I like the phones being lighter and not keep all the complex professional notes that I work on my computer, but you can have your own choice).

To start, ensure to set a same private passcode in Xilinota on all your devices.  This can be done in Options (or Configuration) -> Application.

Now say you have Notebook1 and Notebook2 on your computer that you want to also keep on your PhoneA.  When the computer and PhoneA are on the same local network (they connect automatically), you select Notebook1 and Notebook2, right-click to get the popup menu and choose "Send to peers".  Then the two notebooks together with their substructures and notes are sent to PhoneA.  You can also do a similar thing from a phone to the computer or other devices.  At the moment, transfer rate is throttled to about 2 notes per second, just so that the receiver can keep up the workload.

Now your computer and PhoneA have Notebook1 and Notebook2, when you edit and save any note in the shared notebooks on any device, the note gets instantly sync'ed to the other(s).  

Your computer may have Notebook3 and PhoneA may have PhoneNotes, the editing in the unshared notebooks are not synced.  But you can send notes from these unshared notebooks to other devices instantly by selecting any notes and choosing "Send to peers" from the popup menu.  Notes received will be put to an automatically created notebook named \_InBox.

When you move a note or sub-notebook in a shared notebook, it will be moved accordingly on other devices.  If you move a note to an unshared notebook, then it will be deleted on other devices.  And if you delete a note or notebook in a shared notebook, it will also be deleted on other devices.

Offline operations on notes and notebooks are cross-sync'ed when a device comes connected with other devices (with a desktop as a hub).  Syncing of deleted notebooks offline is now being observed and not enabled in published apps.

Sending notebooks from the desktop can be targeted to a specific device or to all.

When a note has been edited on multiple devices during offline time, upon coming online, the note is copied to a notebook named "Conflicts" on each device for manual processing.

#### Special notice, limitations and todo's

Currently there is no indication on whether a device is connected with others in the network.  The connection is very instantaneous, so you can basically assume they are connected if your devices are online, the private passcode is set with the same token on all devices, and Xilinota has been started on the devices.  A way of indication will be added later.

Sending a root notebook may take some time.  Currently, there is animated popup window (on desktop only) indicating task in progress (though no progress report), and when the task finishes, the popup window is closed.  Basically for an estimate, it takes per note a half second idle time (throttled) plus a little time for sending.  Sending or syncing a single note is instantaneous and there is no need for any progress indication.

Embedded resources (images) are not sent or synced.  I plan to do on-demand-transfer when a note containing the resource is opened, and this is yet to be implemented.

Sending notes (and sending notebooks from mobile) are to all connected devices at the moment.  So if you want to send to a specific device now, ensure that Xilinota is not running on other devices.

## Other notable new features

### Virtual notebooks

Usually we put notes in notebooks (or folders).  It's a common way to organize note items.  The issue is quite often a note hardly only belongs to one notebook category.  For instance, should a note about "sports car" be put in notebook "Sports" or notebook "Cars"?  So resignedly we put it in one "more related" notebook, "Cars".  Fortunately with many tools we can use tags to assist categorization, so we tag the note with "Sport" and "Car", but that involves a lot of manual work for large amount of notes.  So here comes the virtual notebook feature to help.

To put it simple, virtual notebook can be also called automated tags.  At the moment, tags are still created by the user, either by assigning tags to a notes in the usual way, or creating loose tags.  Say with tag "Sport", which has been assigned to 8 notes manually by you, laboriously.  And as usual, when the you click on tag "Sport", Xilinota shows the 8 notes linked to the tag.  Virtual notebook goes a step further: when you right-click (or on mobile simply long-press) on tag "Sport" and choose "Virtual" from the menu, Xilinota shows you all the notes containing the word "Sport", now, 126 notes, including the aforementioned note about sports cars.  So now, tag "Sport" behaves like a notebook containing most notes related to sport.  It's kind of like doing a search, but the virtual notebook here is more about organization than the casual search.

### Daily automatic backup of DB file

On every start, Xilinota checks to see the status of the backup file.  If it's older than a day, a new backup is performed.  The backed-up file is named "database.sqlite.bak" and is stored next to the db file "database.sqlite" in the associated profile config directory.  On Linux, this should be: "/home/loginname/.config/xilinota-desktop/" or a sub-directory of it for a specific profile.

#### Special notice and limitations

This feature is only available on the desktop app.

### Efficiency improvements

One efficiency improvement is on the frequency of saving notes during editing. The mechanism was to save the edited note to DB on every key stroke, which appears quite inefficient. Now, note is saved every 60 seconds, or upon leaving the note editor.  Unchanged notes are not saved.

Editor efficiency is further improved by minimizing resource lookups during editing.

#### Limitations

Rich text editor is currently not supported.

## Versions

I've tested the apps on Linux and Android.  I don't have Mac or Windows machines and would appreciate anyone testing them.

## Special note

This project is re-branded on 11/14/2023.  Due to mass renaming (as Joplin is a trademarked name) in the re-branding, some links might become invalid.  Those will be gradually repaired.

As this is a fork from Joplin with substantial new development, it's imaginable that the organization of Joplin does not provide any assistance on issues related to this project.
