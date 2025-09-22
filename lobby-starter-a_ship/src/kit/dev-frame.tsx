import type { ClientContext } from '@/types';
import { useCallback, useEffect, useRef, useState, type FC } from 'react';

interface Props {
	key: string;
	context: ClientContext;
}

const DevFrame: FC<Props> = ({ key, context }) => {
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	const [contextBase64, setContextBase64] = useState(
		btoa(JSON.stringify(context))
	);

	const onMessage = useCallback(
		(event: MessageEvent) => {
			if (
				!iframeRef.current?.contentWindow ||
				event.source !== iframeRef.current?.contentWindow
			)
				return;

			if (event.data.appId) {
				iframeRef.current.contentWindow.postMessage({ clientKey: key }, '*');
			}
		},
		[key]
	);

	useEffect(() => {
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	}, [onMessage]);

	useEffect(() => {
		setContextBase64(btoa(JSON.stringify(context)));
	}, [context]);

	function clearStorage() {
		iframeRef.current?.contentWindow?.postMessage('km:clearStorage', '*');
	}

	return (
		<div className="grid grid-rows-[auto_1fr] bg-[#ECE3CA] text-[#793205]">
			<div className="inline-flex justify-center gap-3 py-2 text-sm">
				<div className="font-semibold">{key}</div>

				<a
					href={`?key=${key}&context=${contextBase64}`}
					className="hover:link"
					target="_blank"
					rel="noopener noreferrer"
				>
					New tab
				</a>
				<button className="hover:link" onClick={clearStorage}>
					Reset
				</button>
			</div>

			<iframe
				ref={iframeRef}
				className="h-full w-full"
				title={key}
				src={`?key=${key}&context=${contextBase64}`}
			/>
		</div>
	);
};

export default DevFrame;
