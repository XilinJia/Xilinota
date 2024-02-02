import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Banner, ActivityIndicator } from 'react-native-paper';
import { _, languageName } from '@xilinota/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@xilinota/lib/hooks/useAsyncEffect';
import { getVosk, Recorder, startRecording, Vosk } from '../../services/voiceTyping/vosk';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import { modelIsDownloaded } from '../../services/voiceTyping/vosk.android';

interface Props {
	locale: string;
	onDismiss: () => void;
	onText: (text: string) => void;
}

enum RecorderState {
	Loading = 1,
	Recording = 2,
	Processing = 3,
	Error = 4,
	Downloading = 5,
}

const useVosk = (locale: string): [Error | undefined, boolean, Vosk] => {
	const [vosk, setVosk] = useState<Vosk>();
	const [error, setError] = useState<Error>();
	const [mustDownloadModel, setMustDownloadModel] = useState<boolean>();

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (!mustDownloadModel) return;

		try {
			const v = await getVosk(locale);
			if (event.cancelled) return;
			setVosk(v);
		} catch (error) {
			setError(error as Error);
		} finally {
			setMustDownloadModel(false);
		}
	}, [locale, mustDownloadModel]);

	useAsyncEffect(async (_event: AsyncEffectEvent) => {
		setMustDownloadModel(!(await modelIsDownloaded(locale)));
	}, [locale]);

	return [error, mustDownloadModel ?? false, vosk];
};

export default (props: Props) => {
	const [recorder, setRecorder] = useState<Recorder>();
	const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.Loading);
	const [voskError, mustDownloadModel, vosk] = useVosk(props.locale);

	useEffect(() => {
		if (voskError) {
			setRecorderState(RecorderState.Error);
		} else if (vosk) {
			setRecorderState(RecorderState.Recording);
		}
	}, [vosk, voskError]);

	useEffect(() => {
		if (mustDownloadModel) {
			setRecorderState(RecorderState.Downloading);
		}
	}, [mustDownloadModel]);

	useEffect(() => {
		if (recorderState === RecorderState.Recording) {
			setRecorder(startRecording(vosk, {
				onResult: (text: string) => {
					props.onText(text);
				},
			}));
		}
	}, [recorderState, vosk, props.onText]);

	const onDismiss = useCallback(() => {
		if (recorder) recorder.cleanup();
		props.onDismiss();
	}, [recorder, props.onDismiss]);

	const renderContent = () => {
		const components: Record<RecorderState, Function> = {
			[RecorderState.Loading]: () => _('Loading...'),
			[RecorderState.Recording]: () => _('Please record your voice...'),
			[RecorderState.Processing]: () => _('Converting speech to text...'),
			[RecorderState.Downloading]: () => _('Downloading %s language files...', languageName(props.locale)),
			[RecorderState.Error]: () => _('Error: %s', voskError?.message),
		};

		return components[recorderState]();
	};

	const renderIcon = () => {
		const components: Record<RecorderState, IconSource> = {
			[RecorderState.Loading]: ({ size }: { size: number }) => <ActivityIndicator animating={true} style={{ width: size, height: size }} />,
			[RecorderState.Recording]: 'microphone',
			[RecorderState.Processing]: 'microphone',
			[RecorderState.Downloading]: ({ size }: { size: number }) => <ActivityIndicator animating={true} style={{ width: size, height: size }} />,
			[RecorderState.Error]: 'alert-circle-outline',
		};

		return components[recorderState];
	};

	return (
		<Banner
			visible={true}
			icon={renderIcon()}
			actions={[
				{
					label: _('Done'),
					onPress: onDismiss,
				},
			]}>
			{`${_('Voice typing...')}\n${renderContent()}`}
		</Banner>
	);
};
