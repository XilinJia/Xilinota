# Notes and markdown files

The central belief of this feature is that the notes are valuable properties of yours, likely an extension of your mind.  Xilinota keeps the notes and notebooks in a straight-forward file structure, with notes stored in markdown files each having the title as the file name.  The files and folders are maintained up-to-date with the internal database.  This gives you better access to and use of your notes outside of Xilinota.  You can create, add, edit, or delete the files with your favorite tools on your system, and the content of these files will be synced into Xilinota when you start it.  And, in any case when you change your mind about the choice of applications, the notes are in text form and you can easily adopt new ways of management. 

#### Disktop application

On the desktop application, the default home directory where the notebooks and notes are saved to are under "Xilinotas" under "Documents" of the user's home directory, in Linux notion: "/home/loginname/Documents/Xilinotas/" (it can not be customized now). Under there, there are sub-directories based on your profile ID. If you haven't added additional profiles, all the notebooks and notes are saved under the "default" sub-directory. Notebooks are organized as directory trees and note files are under the associated notebook folders. (Note, if you are running a dev version from source, the directory would be "/home/loginname/Documents/XilinotasDev/").

#### Android app

The default home directory on Android is different. On Android 9 or older, the directory is "/Android/data/ac.mdiq.xilinota/files/Xilinotas". On Android 10 or newer, the directory is chosen by you upon first start of Xilinota. These directories can not be changed at the moment. (With dev version, on Android 9 or older, the directory is "/Android/data/ac.mdiq.xilinota.D/files/XilinotasDev".

#### Mechanisms

Upon the start of Xilinota when the home directories don't exist, Xilinota will create them and populate them with sub-directories and files. If you have lots of notes, there's going to be a short wait, (with Xilinota desktop) a popup with an animating bar indicates the task is in progress.  Sub-directories are named with the titles of the notebooks. Files are named with the titles of the notes, as: "the note title.md". In the case of a to-do note, it is named as "X - note title.md" (if the to-do is not completed), or "V - note title.md" (if the to-do has been completed).

Any special character among `?:\"*|/\\<>` in the title are removed.

You can create, update, move, delete notes or notebooks in Xilinota and the files and directories are promptly updated.

#### Resources

Since version 2.14.0, the full resources folder is now relocated from the original config directory to the profile's home directory (e.g. "/home/loginname/Documents/Xilinotas/default/.resources"). The relocation of the directory is handled automatically when directory "resources" exists in the original config directory. Same as usual, this directory contains all resource files of notes associated with the profile.

In the directory of every notebook, there is a sub-directory ".resources" that contains all resources related to notes in the notebook. The resources files in this sub-directory are <mark>hard-links</mark> (on desktop) or <mark>copies</mark> (on mobile for now) to the ones in the full resources folder.  Markdown file shown in external viewer now shows the related resources.  Resource files are automatically populated when the "Xilinotas" directory first gets populated and are saved on note updates when resources are added to a note.  Resources now follow the associated note, i.e., when you move/remove note (within Xilinota), the related resource files will be similarly handled.

Supported formats of resources in notes are following (this is only for technical info and not a concern for normal usage of Xilinota application):
```
![image](:/f5c27bc3b7fb4116a10fbf0f1cbfefef)
![image](.resources/f5c27bc3b7fb4116a10fbf0f1cbfefef.xyz)
<img width="684" height="306" src=":/f5c27bc3b7fb4116a10fbf0f1cbfefef"/>
<img width="684" height="306" src=".resources/f5c27bc3b7fb4116a10fbf0f1cbfefef.xyz"/>
```
"_resources" sub-directory in the directory of every notebook is reserved for future use.

#### Sync of files/folders and notes/notebooks

Files and folders in the file system are sync'ed back to Xilinota.  The process takes place at the start of Xilinota.  With Xilinota desktop, similar to the first file population process, there is a popup with an animated bar during the sync process.  In the mobile apps, this sync process runs in the background without blocking any other functions of Xilinota.

Any added or deleted note files or folders will be synced into Xilinota (an empty folder added is ignored). A markdown file if edited after the previous exit of Xilinota is also synced.  Adding an external folder with markdown files will get all files synced in.  Removing a folder also results in getting all notes in the folder removed from Xilinota after sync (though the notebook corresponding to the folder stays).

A positive note: if you remove the home directory, or the profile directory (e.g. default) under the home directory, or all the folders and files under the profile directory, Xilinota will not delete all of your notes and notebooks in the DB, rather it will re-populate the entire home directory.  Also note that since the full resources folder is under the profile directory, if you delete that, it will not be re-generated.

#### Special notice and limitations

Since version 2.14.0, resources are hard-linked to each notebook folders on desktop (rather than copied as in prior versions).  While the originally copied resource files are still valid for use, it would be better to use the new link mechanism to save some disk space.  If you have used prior versions and would like to use the link mechanism, you can simply remove all folders under the profile folder of the home directory (for safety, do a backup before action).  For your default profile on Linux, this would be "/home/loginname/Documents/Xilinotas/default/".  Then when you start Xilinota, these folders will be re-populated.

Currently, moving folders in the file system is not synced into Xilinota.  Also, moving a note to another folder is not supported for syncing and this is not encouraged because manually moving a note file can result in mismatched resources linked.  So these operations are better conducted within Xilinota.

Due to the relocation of the resources folder (since version 2.14.0, if you migrated from Joplin by feeding Xilinota with renaming Joplin's config directories, and if you want to move back to using Joplin by renaming the resulting config directories back for Joplin, you will also need to manually move the resources folder back (this can only be done on the desktop).