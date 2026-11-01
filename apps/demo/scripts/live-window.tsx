/**
 * Opens a demo in a real window behind the active app (`GPUIX_BACKGROUND=1`)
 * and hands back the app's own renderer as an automation `App`, so a script in
 * the same process can click through it and capture it with `window-pixels`.
 * No OS input is posted and no other app is touched.
 */
import { GpuixRenderer, render, useGpuixRequired } from '@ghia/solid';
import { connectTest, liveRendererAsTest } from '@ghia/solid/automation';
import { setPanelStorage } from 'ghia-swiftui';
import { App } from '#src/app.tsx';
import { windowOptions } from '#src/window-options.ts';

export const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

function Probe(props: {
	onRenderer: (renderer: ReturnType<typeof useGpuixRequired>) => void;
}) {
	props.onRenderer(useGpuixRequired());
	return null;
}

export async function openLiveWindow(options: {
	demo: string;
	/** Paints an opaque window under the app, so what the glass samples does not depend on the desktop. */
	backdrop: boolean;
}) {
	if (process.env.GPUIX_BACKGROUND !== '1') {
		throw new Error(
			'Set GPUIX_BACKGROUND=1: the window must open behind the active app',
		);
	}
	const memory = new Map<string, string>();
	setPanelStorage({
		get: (key) => memory.get(key),
		set: (key, value) => {
			memory.set(key, value);
		},
	});
	let renderer: ReturnType<typeof useGpuixRequired> | undefined;
	render(
		() => (
			<>
				<App initial={options.demo} windowBackdrop={options.backdrop} />
				<Probe onRenderer={(value) => (renderer = value)} />
			</>
		),
		windowOptions,
	);
	await sleep(2500);
	if (!(renderer instanceof GpuixRenderer)) {
		throw new Error('The window has no live renderer');
	}
	// The same adapter the automation preload serves: the app drives its own window.
	return connectTest(liveRendererAsTest(renderer));
}
