# Notes and markdown files

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
