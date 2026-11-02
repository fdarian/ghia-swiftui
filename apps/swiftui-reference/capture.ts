/**
 * Captures the reference app's pages as WindowServer composited them.
 *
 *   pnpm --filter ghia-swiftui-reference capture <shot|all> [--scheme light|dark] [--key none|panel]
 *
 * Writes `screenshots/<shot>-<scheme>.png`. The app captures its own window
 * (`CGWindowListCreateImage` by window id needs no screen-recording permission
 * for a process's own windows, and another process's pixels are not readable
 * without it), so this script only launches it.
 *
 * `--key none` (default) leaves the window inactive, as the demo's live capture
 * does, so glass tints match. `--key panel` makes it a non-activating panel that
 * becomes key; the demo's window cannot, so the two then differ in tint.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { shots } from './shots.ts';

const root = new URL('.', import.meta.url).pathname;
const binary = `${root}.build/swiftui-reference`;
const sources = [
	'Sources/Kit.swift',
	'Sources/Pages.swift',
	'Sources/main.swift',
];

export type Scheme = 'light' | 'dark';

export function build() {
	const built = existsSync(binary) ? statSync(binary).mtimeMs : 0;
	if (sources.every((source) => statSync(`${root}${source}`).mtimeMs < built)) {
		return;
	}
	const result = spawnSync(`${root}build.sh`, { stdio: 'inherit' });
	if (result.status !== 0) throw new Error('swift build failed');
}

export function screenSize(): { width: number; height: number } {
	const result = spawnSync(binary, ['--screen'], { encoding: 'utf8' });
	const [width, height] = result.stdout.trim().split(' ').map(Number);
	if (!width || !height) throw new Error(`--screen printed ${result.stdout}`);
	return { width, height };
}

/** Launches the app for one shot and returns the PNG's path. Retries when the window turned key by itself (exit 3). */
export function captureReference(
	shot: string,
	scheme: Scheme,
	key: 'none' | 'panel' = 'none',
	outDir = `${root}screenshots/`,
): string {
	const definition = shots[shot];
	if (definition === undefined) {
		throw new Error(`Unknown shot ${shot}: ${Object.keys(shots).join(', ')}`);
	}
	build();
	mkdirSync(outDir, { recursive: true });
	const out = `${outDir}${shot}-${scheme}.png`;
	for (let attempt = 0; attempt < 6; attempt++) {
		const result = spawnSync(
			binary,
			[
				definition.page,
				'--scheme',
				scheme,
				'--key',
				key,
				'--out',
				out,
				...(definition.refSize === undefined
					? []
					: [
							'--size',
							`${definition.refSize.width}x${definition.refSize.height}`,
						]),
				...(definition.refArgs ?? []),
			],
			{ encoding: 'utf8' },
		);
		if (result.status === 0) {
			process.stderr.write(result.stderr.replace(/windows .*\n/, ''));
			return out;
		}
		if (result.status !== 3) {
			throw new Error(`${shot} ${scheme}: ${result.stderr}`);
		}
	}
	throw new Error(`${shot} ${scheme}: the window kept turning key by itself`);
}

if (import.meta.main) {
	const args = process.argv.slice(2);
	const take = (flag: string) => {
		const index = args.indexOf(flag);
		return index === -1 ? undefined : args.splice(index, 2)[1];
	};
	const scheme = take('--scheme');
	const key = take('--key') ?? 'none';
	if (key !== 'none' && key !== 'panel') throw new Error('--key none|panel');
	const [name] = args;
	if (name === undefined) {
		console.error(
			`usage: capture <${Object.keys(shots).join('|')}|all> [--scheme light|dark] [--key none|panel]`,
		);
		process.exit(1);
	}
	const schemes: Scheme[] =
		scheme === undefined ? ['light', 'dark'] : [scheme as Scheme];
	for (const shot of name === 'all' ? Object.keys(shots) : [name]) {
		for (const each of schemes) {
			console.log(captureReference(shot, each, key));
		}
	}
}
