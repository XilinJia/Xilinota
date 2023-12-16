# Other notable features

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
