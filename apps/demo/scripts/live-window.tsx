/**
 * Opens a demo in a real window behind the active app (`GPUIX_BACKGROUND=1`)
 * and hands back the app's own renderer as an automation `App`, so a script in
 * the same process can click through it and capture it with `window-pixels`.
 * No OS input is posted and no other app is touched.
 */
import './background.ts';
import { document, GpuixRenderer, render, useGpuixRequired } from '@ghia/solid';
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

/** The test id of the element holding focus, or `undefined` when it has none. */
export function focusedTestId() {
	const element = document.activeElement;
	if (element === null) return undefined;
	const testId = element.props.get('testId');
	return typeof testId === 'string' ? testId : `<${element.type}>`;
}

export async function openLiveWindow(options: {
	demo: string;
	/** Panel storage entries the window starts with, as a resize drag would have saved them. */
	storage?: Record<string, string>;
}) {
	const memory = new Map<string, string>(Object.entries(options.storage ?? {}));
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
				<App initial={options.demo} />
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
