/**
 * Side by side: the reference app's page on the left, the demo's on the right,
 * same scale, same backdrop, both windows inactive.
 *
 *   pnpm compare <shot|all> [--scheme light|dark] [--out dir] [--zoom x:y:w:h@N [--zoom-ours x:y:w:h]]
 *
 * Writes `<out>/<shot>-<scheme>.png` (`/tmp/ghia-compare` by default), plus the
 * two halves under `<out>/reference/` and `<out>/ours/`. `--zoom` crops both
 * sides to the same rect (points, from the compared region's top-left) and
 * scales it up N times, to read radii, edges and padding. `--zoom-ours` gives
 * the demo's side its own rect when the same control sits elsewhere.
 *
 * The demo is captured by `apps/demo/scripts/live-capture.tsx` (real window,
 * `GPUIX_BACKGROUND=1`), parked with a strip on the screen's edge so another
 * app's window does not cover it.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import {
	type Capture,
	loadPng,
	writeRgbaPng,
} from '../demo/scripts/window-pixels.ts';
import { captureReference, screenSize } from './capture.ts';
import {
	DEMO_PAGE,
	DEMO_SIZE,
	REFERENCE_SIZE,
	type Rect,
	shots,
} from './shots.ts';

const demoDir = new URL('../demo/', import.meta.url).pathname;
const GAP = 10;

function captureOurs(shot: string, scheme: string, outDir: string): string {
	const definition = shots[shot];
	if (definition === undefined) throw new Error(`Unknown shot ${shot}`);
	const screen = screenSize();
	mkdirSync(outDir, { recursive: true });
	const name = `${shot}-${scheme}`;
	const result = spawnSync(
		'bun',
		[
			'scripts/live-capture.tsx',
			definition.demo,
			'--out',
			outDir,
			`move=${screen.width - 60}:300`,
			scheme,
			...(definition.steps ?? []),
			`shot=${name}`,
		],
		{
			cwd: demoDir,
			env: { ...process.env, GPUIX_BACKGROUND: '1' },
			encoding: 'utf8',
		},
	);
	if (result.status !== 0) {
		throw new Error(
			`live-capture ${definition.demo}: ${result.stderr}${result.stdout}`,
		);
	}
	return `${outDir}/${name}.png`;
}

function crop(source: Capture, rect: Rect, scale: number): Capture {
	const x0 = Math.round(rect.x * scale);
	const y0 = Math.round(rect.y * scale);
	const width = Math.min(Math.round(rect.width * scale), source.width - x0);
	const height = Math.min(Math.round(rect.height * scale), source.height - y0);
	const rgba = new Uint8Array(width * height * 4);
	for (let y = 0; y < height; y++) {
		const from = ((y0 + y) * source.width + x0) * 4;
		rgba.set(source.rgba.subarray(from, from + width * 4), y * width * 4);
	}
	return { width, height, rgba, scale };
}

function enlarge(source: Capture, factor: number): Capture {
	const width = source.width * factor;
	const height = source.height * factor;
	const rgba = new Uint8Array(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const from =
				(Math.floor(y / factor) * source.width + Math.floor(x / factor)) * 4;
			rgba.set(source.rgba.subarray(from, from + 4), (y * width + x) * 4);
		}
	}
	return { width, height, rgba, scale: source.scale * factor };
}

function sideBySide(left: Capture, right: Capture, gap: number): Capture {
	const width = left.width + gap + right.width;
	const height = Math.max(left.height, right.height);
	const rgba = new Uint8Array(width * height * 4);
	for (let at = 0; at < rgba.length; at += 4) {
		rgba.set([255, 0, 255, 255], at);
	}
	const blit = (source: Capture, x0: number) => {
		for (let y = 0; y < source.height; y++) {
			const from = y * source.width * 4;
			rgba.set(
				source.rgba.subarray(from, from + source.width * 4),
				(y * width + x0) * 4,
			);
		}
	};
	blit(left, 0);
	blit(right, left.width + gap);
	return { width, height, rgba, scale: left.scale };
}

function compare(
	shot: string,
	scheme: 'light' | 'dark',
	outDir: string,
	zoom?: { rect: Rect; oursRect?: Rect; factor: number },
) {
	const definition = shots[shot];
	if (definition === undefined) throw new Error(`Unknown shot ${shot}`);
	const referencePath = captureReference(shot, scheme, `${outDir}/reference/`);
	const oursPath = captureOurs(shot, scheme, `${outDir}/ours`);
	const referenceFull = loadPng(referencePath, 1);
	const oursFull = loadPng(oursPath, 1);
	const referenceSize = definition.refSize ?? REFERENCE_SIZE;
	const referenceScale = referenceFull.width / referenceSize.width;
	const oursScale = oursFull.width / DEMO_SIZE.width;
	if (referenceScale !== oursScale) {
		throw new Error(
			`Different scales: reference ${referenceScale}, ours ${oursScale}`,
		);
	}
	const referenceRect = definition.ref ?? { x: 0, y: 0, ...referenceSize };
	let left = crop(referenceFull, referenceRect, referenceScale);
	let right = crop(oursFull, definition.ours ?? DEMO_PAGE, oursScale);
	if (zoom !== undefined) {
		left = enlarge(crop(left, zoom.rect, referenceScale), zoom.factor);
		right = enlarge(
			crop(right, zoom.oursRect ?? zoom.rect, oursScale),
			zoom.factor,
		);
	}
	const combined = sideBySide(left, right, GAP);
	const path = `${outDir}/${shot}-${scheme}${zoom === undefined ? '' : '-zoom'}.png`;
	writeRgbaPng(combined.rgba, combined.width, combined.height, path);
	return path;
}

const args = process.argv.slice(2);
const take = (flag: string) => {
	const index = args.indexOf(flag);
	return index === -1 ? undefined : args.splice(index, 2)[1];
};
const scheme = take('--scheme');
const outDir = (take('--out') ?? '/tmp/ghia-compare').replace(/\/$/, '');
const zoomArg = take('--zoom');
const oursZoomArg = take('--zoom-ours');
const [name] = args;
if (name === undefined) {
	console.error(
		`usage: pnpm compare <${Object.keys(shots).join('|')}|all> [--scheme light|dark] [--out dir] [--zoom x:y:w:h@N [--zoom-ours x:y:w:h]]`,
	);
	process.exit(1);
}
let zoom: { rect: Rect; oursRect?: Rect; factor: number } | undefined;
if (zoomArg !== undefined) {
	const [rect, factor] = zoomArg.split('@');
	const [x, y, width, height] = (rect ?? '').split(':').map(Number);
	if (x === undefined || y === undefined || !width || !height || !factor) {
		throw new Error('--zoom needs x:y:w:h@N');
	}
	const [ox, oy, ow, oh] = (oursZoomArg ?? '').split(':').map(Number);
	zoom = {
		rect: { x, y, width, height },
		oursRect:
			oursZoomArg === undefined
				? undefined
				: { x: ox ?? 0, y: oy ?? 0, width: ow ?? width, height: oh ?? height },
		factor: Number(factor),
	};
}
for (const shot of name === 'all' ? Object.keys(shots) : [name]) {
	for (const each of scheme === undefined
		? (['light', 'dark'] as const)
		: [scheme as 'light' | 'dark']) {
		console.log(compare(shot, each, outDir, zoom));
	}
}
process.exit(0);
