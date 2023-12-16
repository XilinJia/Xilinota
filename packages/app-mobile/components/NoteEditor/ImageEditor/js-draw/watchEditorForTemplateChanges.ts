import { Editor, BackgroundComponent, EditorEventType, Vec2 } from 'js-draw';

const watchEditorForTemplateChanges = (
	editor: Editor, initialTemplate: string, updateTemplate: (templateData: string)=> void,
) => {
	const computeTemplate = (): string => {
		let backgroundSize: Vec2|null = null;

		// Only store the background size if the size isn't determined
		// by the editor content. In this case, the background always
		// appears to be full screen.
		if (!editor.image.getAutoresizeEnabled()) {
			backgroundSize = editor.getImportExportRect().size;

			// Constrain the size: Don't allow an extremely small or extremely large tempalte.
			// Map components to constrained components.
			backgroundSize = backgroundSize.map(component => {
				const minDimen = 45;
				const maxDimen = 5000;

				return Math.max(Math.min(component, maxDimen), minDimen);
			});
		}

		// Find the topmost background component (if any)
		let backgroundComponent: BackgroundComponent|null = null;
		for (const component of editor.image.getBackgroundComponents()) {
			if (component instanceof BackgroundComponent) {
				backgroundComponent = component;
			}
		}

		const templateData = {
			imageSize: backgroundSize?.xy,
			backgroundData: backgroundComponent?.serialize(),
			autoresize: editor.image.getAutoresizeEnabled(),
		};
		return JSON.stringify(templateData);
	};

	let lastTemplate = initialTemplate;
	const updateTemplateIfNecessary = () => {
		const newTemplate = computeTemplate();

		if (newTemplate !== lastTemplate) {
			updateTemplate(newTemplate);
			lastTemplate = newTemplate;
		}
	};

	// Whenever a command is done/undone, re-calculate the template & save.
	editor.notifier.on(EditorEventType.CommandDone, () => {
		updateTemplateIfNecessary();
	});

	editor.notifier.on(EditorEventType.CommandUndone, () => {
		updateTemplateIfNecessary();
	});
};

export default watchEditorForTemplateChanges;
