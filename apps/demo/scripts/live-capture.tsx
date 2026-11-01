/**
 * Opens one demo in a real window behind the active app (`GPUIX_BACKGROUND=1`)
 * and captures what WindowServer composited: the only capture that holds
 * native glass (`captureScreenshot` is the Metal frame alone). The app's own
 * renderer is driven in-process, so no OS input is posted and no other app is
 * touched.
 *
 *   pnpm live-capture <demo> [step...] [--out dir]
 *
 * Steps run in order: `shot=<name>` writes `<name>.png`, `click=<testId>`,
 * `rightclick=<testId>`, `hover=<testId>`, `wheel=<testId>:<deltaY>`, `key=<key>`, `wait=<ms>`, `dark`, `light`,
 * `system` (the shell's scheme choices). `--backdrop` paints an opaque window
 * under the app, so what the glass samples does not depend on the desktop.
 */
import { mkdirSync } from 'node:fs';
import { GpuixRenderer, render, useGpuixRequired } from '@ghia/solid';
import { connectTest, liveRendererAsTest } from '@ghia/solid/automation';
import { applyColorScheme, setPanelStorage } from 'ghia-swiftui';
import { App } from '#src/app.tsx';
import { demos } from '#src/demos/index.ts';
import { windowOptions } from '#src/window-options.ts';
import { captureWindow, countViews } from './window-pixels.ts';

const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const outDir =
	outFlag === -1
		? new URL('../screenshots/live/', import.meta.url).pathname
		: `${args.splice(outFlag, 2)[1]}/`;
const backdropFlag = args.indexOf('--backdrop');
const backdrop = backdropFlag !== -1;
if (backdrop) args.splice(backdropFlag, 1);
const [demo, ...steps] = args;
if (demo === undefined || !demos.some((candidate) => candidate.name === demo)) {
	console.error(
		`usage: pnpm live-capture <${demos.map((candidate) => candidate.name).join('|')}> [step...]`,
	);
	process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const memory = new Map<string, string>();
setPanelStorage({
	get: (key) => memory.get(key),
	set: (key, value) => {
		memory.set(key, value);
	},
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Probe(props: {
	onRenderer: (renderer: ReturnType<typeof useGpuixRequired>) => void;
}) {
	props.onRenderer(useGpuixRequired());
	return null;
}

let renderer: ReturnType<typeof useGpuixRequired> | undefined;
render(
	() => (
		<>
			<App initial={demo} windowBackdrop={backdrop} />
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
const app = await connectTest(liveRendererAsTest(renderer));
for (const step of steps) {
	const [name, value] = step.split('=');
	switch (name) {
		case 'shot': {
			if (value === undefined) throw new Error('shot needs a name');
			await sleep(400);
			const capture = await captureWindow(`${outDir}${value}.png`);
			console.log(
				`captured ${outDir}${value}.png (${capture.width}x${capture.height})`,
			);
			break;
		}
		case 'click':
		case 'rightclick':
		case 'hover': {
			if (value === undefined) throw new Error(`${name} needs a test id`);
			const target = app.getByTestId(value);
			if (name === 'hover') await target.hover();
			else if (name === 'click') await target.click();
			else await target.click({ button: 2 });
			await sleep(500);
			break;
		}
		case 'count':
			console.log(
				`NSGlassEffectView in the window: ${countViews('NSGlassEffectView')}`,
			);
			break;
		case 'wheel': {
			const [testId, delta] = (value ?? '').split(':');
			if (testId === undefined || delta === undefined) {
				throw new Error('wheel needs <testId>:<deltaY>');
			}
			await app.getByTestId(testId).wheel(0, Number(delta));
			await sleep(500);
			break;
		}
		case 'key': {
			if (value === undefined) throw new Error('key needs a key');
			await app.getByTestId('page').press(value);
			await sleep(400);
			break;
		}
		case 'wait':
			await sleep(Number(value));
			break;
		case 'dark':
			applyColorScheme(true);
			await sleep(600);
			break;
		case 'light':
			applyColorScheme(false);
			await sleep(600);
			break;
		default:
			throw new Error(`Unknown step ${step}`);
	}
}
process.exit(0);
