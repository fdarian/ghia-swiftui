/**
 * Checks, in a real window and on composited pixels, that a page's header
 * shows its scrolled paint: at offset 0 it is bare, and once the page has
 * scrolled, by a trackpad's fraction of a pixel or by a screenful, the same
 * content that shows at full contrast below the header is blurred and veiled
 * under it, with a hairline on its bottom edge. Each page is opened by
 * navigation (the way a user arrives), scrolled, left, and visited again.
 *
 *   GPUIX_BACKGROUND=1 bun scripts/scroll-edge-check.tsx [out-dir] [move=<x>:<y>]
 *
 * `move` parks the window with a strip on the screen's edge when other
 * windows cover it. Exit status: 0 passed, 1 a check failed, 3 not checkable
 * (the window was covered, so it got no frames).
 */
import './background.ts';
import { mkdirSync } from 'node:fs';
import { applyColorScheme } from 'ghia-swiftui';
import { openLiveWindow, sleep } from './live-window.tsx';
import {
	type Capture,
	captureWindow,
	moveWindow,
	pixel,
	region,
} from './window-pixels.ts';

const args = process.argv.slice(2);
const parked = args.find((argument) => argument.startsWith('move='));
const outDir = `${args.find((argument) => argument !== parked) ?? new URL('../screenshots/scroll-edge-check', import.meta.url).pathname}/`;
mkdirSync(outDir, { recursive: true });

const failures: string[] = [];
function expect(ok: boolean, what: string) {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
	if (!ok) failures.push(what);
}

/** `Toolbar`'s row height: the header is this tall, with its hairline on the last row. */
const HEADER_HEIGHT = 52;
/** Beside the title, clear of the scrollbar. */
const STRIP_X = 300;
const STRIP_WIDTH = 600;
/** Where the same strip is read once it has scrolled out from under the header. */
const CLEAR_Y = 120;
/** A 0.8 fill leaves a fifth of the contrast, and the blur takes more: this much is what a missing fill cannot reach. */
const MAX_COVERED_CONTRAST = 0.4;
const MIN_HAIRLINE_STEP = 12;

const pages = [
	{ demo: 'button', scrolled: 300 },
	{ demo: 'text', scrolled: 250 },
];

let applyScheme = 'light';
const app = await openLiveWindow({ demo: 'tokens' });
if (parked !== undefined) {
	const [x, y] = parked.slice('move='.length).split(':');
	moveWindow(Number(x), Number(y));
}

const settle = () => sleep(600);
async function scrollTo(offset: number) {
	const viewport = app.getByTestId('page-viewport');
	await viewport.wheel(0, -100_000);
	await settle();
	if (offset > 0) await viewport.wheel(0, offset);
	await settle();
}

/** Standard deviation of the strip's pixels, over the three channels. */
function contrast(capture: Capture, y: number) {
	const deviation = region(capture, {
		x: STRIP_X,
		y,
		width: STRIP_WIDTH,
		height: HEADER_HEIGHT - 8,
	}).deviation;
	return Math.max(...deviation);
}

/** The hairline's step against the row below it, as the median over columns so one glyph under either row does not decide it. */
function hairlineStep(capture: Capture) {
	const steps = Array.from({ length: 9 }, (_, column) => {
		const x = STRIP_X + column * 67;
		const on = pixel(capture, x, HEADER_HEIGHT - 1);
		const below = pixel(capture, x, HEADER_HEIGHT + 1);
		return Math.max(...on.map((value, i) => Math.abs(value - (below[i] ?? 0))));
	}).sort((a, b) => a - b);
	return steps[4] as number;
}

async function checkPage(demo: string, scrolled: number, visit: number) {
	const label = `${demo} (visit ${visit}, ${applyScheme})`;
	await app.getByTestId(`nav-${demo}`).click();
	await settle();

	await scrollTo(0);
	const bare = await captureWindow(`${outDir}${demo}-${visit}-0.png`);
	expect(
		hairlineStep(bare) < MIN_HAIRLINE_STEP,
		`${label}: at offset 0 the header has no hairline (step ${hairlineStep(bare)})`,
	);

	for (const offset of [1, scrolled]) {
		await scrollTo(offset);
		const covered = await captureWindow(
			`${outDir}${demo}-${visit}-${offset}.png`,
		);
		expect(
			hairlineStep(covered) >= MIN_HAIRLINE_STEP,
			`${label}: scrolled ${offset}px the header has its hairline (step ${hairlineStep(covered)})`,
		);
		if (offset === 1) continue;

		// The same content, once clear of the header: its contrast is what the header must have taken away.
		await scrollTo(scrolled - (CLEAR_Y - 4));
		const clear = await captureWindow(`${outDir}${demo}-${visit}-clear.png`);
		const full = contrast(clear, CLEAR_Y);
		const veiled = contrast(covered, 4);
		expect(
			full > 8,
			`${label}: the strip read clear of the header has contrast to compare (${full.toFixed(1)})`,
		);
		expect(
			veiled < full * MAX_COVERED_CONTRAST,
			`${label}: the same strip under the header is veiled (contrast ${veiled.toFixed(1)}, ${full.toFixed(1)} clear, needs < ${(full * MAX_COVERED_CONTRAST).toFixed(1)})`,
		);
	}
}

try {
	for (const scheme of ['light', 'dark'] as const) {
		applyScheme = scheme;
		applyColorScheme(scheme === 'dark');
		await settle();
		for (const [index, page] of [...pages, pages[0]].entries()) {
			if (page === undefined) throw new Error('No page to check');
			await checkPage(page.demo, page.scrolled, index + 1);
		}
	}
} catch (error) {
	if (error instanceof Error && error.message.startsWith('not checkable')) {
		console.log(error.message);
		process.exit(3);
	}
	throw error;
}
process.exit(failures.length > 0 ? 1 : 0);
