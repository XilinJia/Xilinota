import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import Resource from '@xilinota/lib/models/Resource';

export const declaration: CommandDeclaration = {
	name: 'openPdfViewer',
	label: () => _('Open PDF viewer'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, resourceId: string, pageNo: number) => {

			const resource = await Resource.load(resourceId);
			if (!resource) throw new Error(`No such resource: ${resourceId}`);
			if (resource.mime !== 'application/pdf') throw new Error(`Not a PDF: ${resource.mime}`);
			context.dispatch({
				type: 'DIALOG_OPEN',
				name: 'pdfViewer',
				props: {
					resource,
					pageNo: pageNo,
				},
			});
		},
	};
};
