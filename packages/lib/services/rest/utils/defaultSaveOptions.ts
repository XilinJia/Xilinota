export default function(requestMethod: string, modelId: string = '') {
	const options: any = { userSideValidation: true };
	if (requestMethod === 'POST' && modelId) options.isNew = true;
	return options;
}
