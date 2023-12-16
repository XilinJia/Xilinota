# Importing and exporting

## Importing

### Importing from Evernote

Xilinota was designed as a replacement for Evernote and so can import complete Evernote notebooks, as well as notes, tags, resources (attached files) and note metadata (such as author, geo-location, etc.) via ENEX files. In terms of data, the only two things that might slightly differ are:

- Recognition data - Evernote images, in particular scanned (or photographed) documents have [recognition data](https://en.wikipedia.org/wiki/Optical_character_recognition) associated with them. It is the text that Evernote has been able to recognise in the document. This data is not preserved when the note are imported into Xilinota. However, should it become supported in the search tool or other parts of Xilinota, it should be possible to regenerate this recognition data since the actual image would still be available.

- Colour, font sizes and faces - Evernote text is stored as HTML and this is converted to Markdown during the import process. For notes that are mostly plain text or with basic formatting (bold, italic, bullet points, links, etc.) this is a lossless conversion, and the note, once rendered back to HTML should be very similar. Tables are also imported and converted to Markdown tables. For very complex notes, some formatting data might be lost - in particular colours, font sizes and font faces will not be imported. The text itself however is always imported in full regardless of formatting. If it is essential that this extra data is preserved then Xilinota also allows import of ENEX files as HTML.

To import Evernote data, first export your Evernote notebooks to ENEX files as described [here](https://help.evernote.com/hc/en-us/articles/209005557-How-to-back-up-export-and-restore-import-notes-and-notebooks). Then follow these steps:

In the **desktop application**, open File > Import > ENEX and select your file. The notes will be imported into a new separate notebook. If needed they can then be moved to a different notebook, or the notebook can be renamed, etc.

In the **terminal application**, in [command-line mode](https://github.com/XilinJia/Xilinota/blob/dev/readme/apps/terminal.md#command-line-mode), type `import /path/to/file.enex`. This will import the notes into a new notebook named after the filename.

### Importing from Markdown files

Xilinota can import notes from plain Markdown file. You can either import a complete directory of Markdown files or individual files.

In the **desktop application**:

* **File import**: Go to File > Import > MD - Markdown (file) and select the Markdown file. This file will then be imported to the currently selected Notebook.
* **Directory import**: Go to File > Import > MD - Markdown (directory) and select the top level of the directory that is being imported. Directory (folder) structure will be preserved in the Notebook > Subnotebook > Note structure within Xilinota.

In the **terminal application**, in [command-line mode](https://github.com/XilinJia/Xilinota/blob/dev/readme/apps/terminal.md#command-line-mode):

Type `import --format md /path/to/file.md` or `import --format md /path/to/directory/`.

### Importing from other applications

In general the way to import notes from any application into Xilinota is to convert the notes to ENEX files (Evernote format) and to import these ENEX files into Xilinota using the method above. Most note-taking applications support ENEX files so it should be relatively straightforward. For help about specific applications, see below:

* Standard Notes: Please see [this tutorial](https://programadorwebvalencia.com/migrate-notes-from-standard-notes-to-xilinota/)
* Tomboy Notes: Export the notes to ENEX files [as described here](https://askubuntu.com/questions/243691/how-can-i-export-my-tomboy-notes-into-evernote/608551) for example, and import these ENEX files into Xilinota.
* OneNote: First [import the notes from OneNote into Evernote](https://discussion.evernote.com/topic/107736-is-there-a-way-to-import-from-onenote-into-evernote-on-the-mac/). Then export the ENEX file from Evernote and import it into Xilinota.
* NixNote: Synchronise with Evernote, then export the ENEX files and import them into Xilinota. More info [in this thread](https://discourse.xilinotaapp.org/t/import-from-nixnote/183/3).

## Exporting

Xilinota can export to the JEX format (Xilinota Export file), which is a tar file that can contain multiple notes, notebooks, etc. This is a lossless format in that all the notes, but also metadata such as geo-location, updated time, tags, etc. are preserved. This format is convenient for backup purposes and can be re-imported into Xilinota. A "raw" format is also available. This is the same as the JEX format except that the data is saved to a directory and each item represented by a single file.

Xilinota is also capable of exporting to a number of other formats including HTML and PDF which can be done for single notes, notebooks or everything.