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

For more about importing (and exporting), read [here](readme/welcome/2_importing_and_exporting_notes.md)

## New feature #1: Notes and markdown files

The central belief of this feature is that the notes are valuable properties of yours, likely an extension of your mind.  Xilinota keeps the notes and notebooks in a straight-forward file structure, with notes stored in markdown files each having the title as the file name.  The files and folders are maintained up-to-date with the internal database.  This gives you better access to and use of your notes outside of Xilinota.  You can create, add, edit, or delete the files with your favorite tools on your system, and the content of these files will be synced into Xilinota when you start it.  And, in any case when you change your mind about the choice of applications, the notes are in text form and you can easily adopt new ways of management.

For more read [here](readme/welcome/3_Notes_and_markdown_files.md)

## New Feature #2: Instant sync among devices

Syncing notes through cloud, external servers, or with the assistance of third-party application like Syncthing can still be used if you like. Xilinota propose a new way for you to sync your notes: an instant way, which surely is more convenient. Certainly Xilinota runs on multiple platforms you choose, however, all those are to serve one person: you, the user.  So the capability of doing instant sync removes the process of going a long way through complicated setups and handling.  Here is how it works.

For more read [here](readme/welcome/4_synchronising_your_notes.md)

## Other notable new features

### Virtual notebooks

Usually we put notes in notebooks (or folders).  It's a common way to organize note items.  The issue is quite often a note hardly only belongs to one notebook category.  For instance, should a note about "sports car" be put in notebook "Sports" or notebook "Cars"?  So resignedly we put it in one "more related" notebook, "Cars".  Fortunately with many tools we can use tags to assist categorization, so we tag the note with "Sport" and "Car", but that involves a lot of manual work for large amount of notes.  So here comes the virtual notebook feature to help.

For more read [here](readme/welcome/5_Other_notable_features.md)

### Daily automatic backup of DB file

For more read [here](readme/welcome/5_Other_notable_features.md)

### Efficiency improvements

For more read [here](readme/welcome/5_Other_notable_features.md)

## Versions

I have been using the apps on Linux and Android.  I don't have Mac or Windows machines and would appreciate anyone testing them.

## Special note

This project is re-branded on 11/14/2023.  Due to mass renaming (as Joplin is a trademarked name) in the re-branding, some links might become invalid.  Those will be gradually repaired.

As this is a fork from Joplin with substantial new development, it's imaginable that the organization of Joplin does not provide any assistance on issues related to this project.
