# Synchronising your notes

Xilinota supports all synchronization means include Dropbox, Nextcloud, OneDrive or WebDAV, and Joplin Cloud.  For instructions, refer to related Joplin documents.

In addition, Xilinota propose a new way for you to sync your notes: instant sync, which surely is more convenient. 

## Instant sync across devices

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