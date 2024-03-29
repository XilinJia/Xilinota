export default function(markdownIt: any) {
	// Add `file:` protocol in linkify to allow text in the format of "file://..." to translate into
	// file-URL links in html view
	markdownIt.linkify.add('file:', {
		validate: function(text: string, pos: number, self: any) {
			const tail = text.slice(pos);
			if (!self.re.file) {
				// matches all local file URI on Win/Unix/MacOS systems including reserved characters in some OS (i.e. no OS specific sanity check)
				self.re.file = new RegExp('^[\\/]{2,3}[\\S]+');
			}
			if (self.re.file.test(tail)) {
				const mt = tail.match(self.re.file);
				return mt ? mt[0].length : 0;
			}
			return 0;
		},
	});

	markdownIt.linkify.set({
		'fuzzyLink': false,
		'fuzzyIP': false,
		'fuzzyEmail': false,
	});
}
