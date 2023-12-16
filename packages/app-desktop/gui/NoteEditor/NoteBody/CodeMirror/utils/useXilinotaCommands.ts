// Helper commands added to the the CodeMirror instance
export default function useXilinotaCommands(CodeMirror: any) {

	CodeMirror.defineExtension('commandExists', (name: string) => {
		return !!CodeMirror.commands[name];
	});
}
