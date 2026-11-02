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
 * `rightclick=<testId>`, `hover=<testId>`, `wheel=<testId>:<deltaY>`, `bounds=<testId>` (prints the box), `drag=<testId>:<dx>` (a horizontal drag by `dx` points, fractions allowed), `key=<key>`, `wait=<ms>`, `dark`, `light`,
 * `system` (the shell's scheme choices), `trace=<name>:<testId>:<x>:<y>:<w>:<h>[:<ms>]` (click `testId` while a worker samples that box, in points from the window's top-left, at the highest rate WindowServer gives, and write every distinct composited frame to `<out>/<name>/` with a `timeline.txt`), `move=<x>:<y>` (the window's bottom-left corner in screen points; park it with a strip on the screen's edge showing when other windows cover it). `--storage <key>=<json>` starts the window with a saved panel layout (a sidebar at a fractional width: `ghia-swiftui-demo-2={"0":243.37}`). `--backdrop` paints an opaque window
 * under the app, so what the glass samples does not depend on the desktop.
 */
import { mkdirSync } from 'node:fs';
import { applyColorScheme } from 'ghia-swiftui';
import { demos } from '#src/demos/index.ts';
import { traceAction } from './frame-trace.ts';
import { openLiveWindow, sleep } from './live-window.tsx';
import { captureWindow, countViews, moveWindow } from './window-pixels.ts';

const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const outDir =
	outFlag === -1
		? new URL('../screenshots/live/', import.meta.url).pathname
		: `${args.splice(outFlag, 2)[1]}/`;
const backdropFlag = args.indexOf('--backdrop');
const backdrop = backdropFlag !== -1;
if (backdrop) args.splice(backdropFlag, 1);
const storage: Record<string, string> = {};
for (
	let index = args.indexOf('--storage');
	index !== -1;
	index = args.indexOf('--storage')
) {
	const entry = args.splice(index, 2)[1];
	const split = entry?.indexOf('=') ?? -1;
	if (entry === undefined || split === -1) {
		throw new Error('--storage needs <key>=<value>');
	}
	storage[entry.slice(0, split)] = entry.slice(split + 1);
}
const [demo, ...steps] = args;
if (demo === undefined || !demos.some((candidate) => candidate.name === demo)) {
	console.error(
		`usage: pnpm live-capture <${demos.map((candidate) => candidate.name).join('|')}> [step...]`,
	);
	process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const app = await openLiveWindow({ demo, backdrop, storage });
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
		case 'move': {
			const [x, y] = (value ?? '').split(':');
			if (x === undefined || y === undefined) {
				throw new Error('move needs <x>:<y>');
			}
			moveWindow(Number(x), Number(y));
			await sleep(600);
			break;
		}
		case 'trace': {
			const [name, testId, x, y, width, height, duration] = (value ?? '').split(
				':',
			);
			if ([name, testId, x, y, width, height].includes(undefined)) {
				throw new Error('trace needs <name>:<testId>:<x>:<y>:<w>:<h>');
			}
			await traceAction({
				dir: `${outDir}${name}`,
				crop: {
					x: Number(x),
					y: Number(y),
					width: Number(width),
					height: Number(height),
				},
				durationMs: Number(duration ?? 1500),
				action: () => app.getByTestId(testId as string).click(),
			});
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
		case 'bounds': {
			if (value === undefined) throw new Error('bounds needs a test id');
			console.log(value, JSON.stringify(await app.getByTestId(value).bounds()));
			break;
		}
		case 'drag': {
			const [testId, delta] = (value ?? '').split(':');
			if (testId === undefined || delta === undefined) {
				throw new Error('drag needs <testId>:<dx>');
			}
			await app.getByTestId(testId).dragBy(Number(delta), 0);
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
