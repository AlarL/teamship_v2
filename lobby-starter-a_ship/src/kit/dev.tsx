import DevFrame from './dev-frame';

interface Props {
	nPlayerWindows?: number;
}

function Dev({ nPlayerWindows = 4 }: Props) {
	const frames = Array.from({ length: nPlayerWindows }).map((_, i) => (
		<DevFrame key={`player${i + 1}`} context={{ host: false }} />
	));

	return (
		<div className="grid h-dvh grid-rows-[1fr] bg-[#E4D8B4]">
			{/* <DevFrame id="host" context={{ host: true, playCode: "play" }} /> */}
			<div className="grid grid-flow-col auto-rows-fr gap-0.5">{frames}</div>
		</div>
	);
}

export default Dev;
