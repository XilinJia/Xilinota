import shim from '@xilinota/lib/shim';
import Setting from '@xilinota/lib/models/Setting';
import Note from '@xilinota/lib/models/Note';
// import BaseModel from '@xilinota/lib/BaseModel';
import Resource from '@xilinota/lib/models/Resource';
const bridge = require('@electron/remote').require('./bridge').default;
import ResourceFetcher from '@xilinota/lib/services/ResourceFetcher';
import htmlUtils from '@xilinota/lib/htmlUtils';
import rendererHtmlUtils, { extractHtmlBody } from '@xilinota/renderer/htmlUtils';
import Logger from '@xilinota/utils/Logger';
import { fileUriToPath } from '@xilinota/utils/url';
import xilinotaRendererUtils from '@xilinota/renderer/utils';
import { clipboard } from 'electron';
import mimeUtils from '@xilinota/lib/mime-utils';
import md5 from 'md5';
import path from 'path';
import { ResourceEntity, ResourceLocalStateEntity } from '@xilinota/lib/services/database/types';

const logger = Logger.create('resourceHandling');

export async function handleResourceDownloadMode(noteBody: string): Promise<void> {
	if (noteBody && Setting.value('sync.resourceDownloadMode') === 'auto') {
		const resourceIds = await Note.linkedResourceIds(noteBody);
		await ResourceFetcher.instance().markForDownload(resourceIds);
	}
}

interface ResourceProps {
	item: ResourceEntity | null;
	localState: ResourceLocalStateEntity;
};

type ResourceCache = { [id: string]: ResourceProps };
let resourceCache_: ResourceCache = {};

export function clearResourceCache(): void {
	resourceCache_ = {};
}

export async function attachedResources(noteBody: string, _resourceIds: string[] = []): Promise<ResourceCache> {
	if (!noteBody && !_resourceIds.length) return {};
	const resourceIds = _resourceIds.length ? _resourceIds : await Note.linkedResourceIds(noteBody);

	const output: ResourceCache = {};
	for (let i = 0; i < resourceIds.length; i++) {
		const id = resourceIds[i];

		if (resourceCache_[id]) {
			output[id] = resourceCache_[id];
		} else {
			const resource: ResourceEntity | null = await Resource.load(id);
			const localState: ResourceLocalStateEntity = resource ? await Resource.localState(resource) : {};

			const o = {
				item: resource,
				localState: localState,
			};

			resourceCache_[id] = o;
			output[id] = o;
		}
	}

	return output;
}

export async function commandAttachFileToBody(body: string, filePaths: string[] = [], options: any = null): Promise<string | null> {
	options = {
		createFileURL: false,
		position: 0,
		...options,
	};

	if (!filePaths) {
		filePaths = await bridge().showOpenDialog({
			properties: ['openFile', 'createDirectory', 'multiSelections'],
		});
		if (!filePaths || !filePaths.length) return null;
	}

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths[i];
		try {
			logger.info(`Attaching ${filePath}`);
			const newBody = await shim.attachFileToNoteBody(body, filePath, options.position, {
				createFileURL: options.createFileURL,
				resizeLargeImages: Setting.value('imageResizing'),
			});

			if (!newBody) {
				logger.info('File attachment was cancelled');
				return null;
			}

			body = newBody;
			logger.info('File was attached.');
		} catch (error) {
			logger.error(error);
			bridge().showErrorMessageBox((error as Error).message);
		}
	}

	return body;
}

export function resourcesStatus(resourceInfos: any): "ready" | "error" | "notDownloaded" | "downloading" | "encrypted" {
	let lowestIndex = xilinotaRendererUtils.resourceStatusIndex('ready');
	for (const id in resourceInfos) {
		const s = xilinotaRendererUtils.resourceStatus(Resource, resourceInfos[id]);
		const idx = xilinotaRendererUtils.resourceStatusIndex(s);
		if (idx < lowestIndex) lowestIndex = idx;
	}
	return xilinotaRendererUtils.resourceStatusName(lowestIndex);
}

export async function getResourcesFromPasteEvent(event: any): Promise<string[]> {
	const output = [];
	const formats = clipboard.availableFormats();
	for (let i = 0; i < formats.length; i++) {
		const format = formats[i].toLowerCase();
		const formatType = format.split('/')[0];

		if (formatType === 'image') {
			if (event) event.preventDefault();

			const image = clipboard.readImage();

			const fileExt = mimeUtils.toFileExtension(format);
			const filePath = `${Setting.value('tempDir')}/${md5(Date.now().toString())}.${fileExt}`;

			await shim.writeImageToFile(image, format, filePath);
			const md = await commandAttachFileToBody('', [filePath]);
			await shim.fsDriver().remove(filePath);

			if (md) output.push(md);
		}
	}
	return output;
}

export async function processPastedHtml(html: string): Promise<string> {
	const allImageUrls: string[] = [];
	const mappedResources: Record<string, string> = {};

	// When copying text from eg. GitHub, the HTML might contain non-breaking
	// spaces instead of regular spaces. If these non-breaking spaces are
	// inserted into the TinyMCE editor (using insertContent), they will be
	// dropped. So here we convert them to regular spaces.
	// https://stackoverflow.com/a/31790544/561309
	html = html.replace(/[\u202F\u00A0]/g, ' ');

	htmlUtils.replaceImageUrls(html, (src: string) => {
		allImageUrls.push(src);
	});

	for (const imageSrc of allImageUrls) {
		if (!mappedResources[imageSrc]) {
			try {
				if (imageSrc.startsWith('file')) {
					const imageFilePath = path.normalize(fileUriToPath(imageSrc));
					const resourceDirPath = path.normalize(Setting.value('resourceDir'));

					if (imageFilePath.startsWith(resourceDirPath)) {
						mappedResources[imageSrc] = imageSrc;
					} else {
						const createdResource = await shim.createResourceFromPath(imageFilePath);
						mappedResources[imageSrc] = `file://${encodeURI(Resource.fullPath(createdResource))}`;
					}
				} else if (imageSrc.startsWith('data:')) {
					// Data URIs
					mappedResources[imageSrc] = imageSrc;
				} else {
					const filePath = `${Setting.value('tempDir')}/${md5(Date.now().toString() + Math.random())}`;
					await shim.fetchBlob(imageSrc, { path: filePath });
					const createdResource = await shim.createResourceFromPath(filePath);
					await shim.fsDriver().remove(filePath);
					mappedResources[imageSrc] = `file://${encodeURI(Resource.fullPath(createdResource))}`;
				}
			} catch (error) {
				logger.warn(`Error creating a resource for ${imageSrc}.`, error);
				mappedResources[imageSrc] = imageSrc;
			}
		}
	}

	return extractHtmlBody(
		rendererHtmlUtils.sanitizeHtml(
			htmlUtils.replaceImageUrls(html, (src: string): string => {
				return mappedResources[src];
			}),
			{
				allowedFilePrefixes: [Setting.value('resourceDir')],
			},
		),
	);
}
