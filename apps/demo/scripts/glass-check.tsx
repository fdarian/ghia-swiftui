/**
 * Checks that the real glass is there in a real window, by pixels and by the
 * view tree. Two modes, each its own process (a window or a test root, not both):
 *
 *   GPUIX_BACKGROUND=1 bun scripts/glass-check.tsx live [out-dir]
 *   bun scripts/glass-check.tsx fallback
 *
 * `live` opens the liquid-glass demo in an opaque window and checks that
 * NSGlassEffectViews exist, that the window as WindowServer composited it differs
 * from the Metal frame over a glass panel and not beside it (the glass is
 * above the GPUI layer), that the panel shows the stripes painted beneath it
 * (it samples GPUI content), that the glass follows light and dark, and that
 * opening and closing popups and walking every demo leaves no view behind.
 * `fallback` renders in `createTestRoot`, where no glass may be attached.
 *
 * Exit status: 0 passed, 1 a check failed, 3 not checkable (the window was
 * covered by another app, so it got no frames).
 */
import './background.ts';
import { mkdirSync } from 'node:fs';
import { createTestRoot } from '@ghia/solid/testing';
import {
	applyColorScheme,
	Button,
	ColorSchemeProvider,
	GlassPanel,
	setPanelStorage,
} from 'ghia-swiftui';
import { demos } from '#src/demos/index.ts';
import { openLiveWindow, sleep } from './live-window.tsx';
import {
	captureWindow,
	countViews,
	loadPng,
	meanDifference,
	pixel,
	region,
} from './window-pixels.ts';

const [mode, outArgument] = process.argv.slice(2);
const outDir =
	outArgument ??
	new URL('../screenshots/glass-check/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const failures: string[] = [];
function expect(ok: boolean, what: string) {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
	if (!ok) failures.push(what);
}

const GLASS = 'NSGlassEffectView';

/** How far the glass panel must differ from the Metal frame beneath it; beside it the two are the same pixels. */
const GLASS_DIFFERENCE = 6;
const CONTROL_DIFFERENCE = 1;

async function live() {
	const app = await openLiveWindow({ demo: 'liquid-glass' });
	const metalPath = `${outDir}metal.png`;

	const initial = countViews(GLASS);
	expect(
		initial >= 5,
		`the shell and the demo hold ${initial} NSGlassEffectViews (sidebar, toggle, three panels, at least)`,
	);

	// Dark, then light: the glass follows the window appearance, not the tokens alone.
	applyColorScheme(true);
	await sleep(800);
	const dark = await captureWindow(`${outDir}dark.png`);
	await app.screenshot({ path: metalPath });
	const metalDark = loadPng(metalPath, dark.scale);
	applyColorScheme(false);
	await sleep(800);
	const light = await captureWindow(`${outDir}light.png`);

	const panel = await app.getByTestId('panel-regular').bounds();
	const beside = { ...panel, x: panel.x - 140, width: 60 };
	const glassDifference = meanDifference(dark, metalDark, panel);
	const controlDifference = meanDifference(dark, metalDark, beside);
	expect(
		glassDifference > GLASS_DIFFERENCE,
		`over the glass panel the composited window differs from the Metal frame (${glassDifference.toFixed(1)} per channel, needs > ${GLASS_DIFFERENCE})`,
	);
	expect(
		controlDifference < CONTROL_DIFFERENCE,
		`beside it the two are the same pixels (${controlDifference.toFixed(2)} per channel, needs < ${CONTROL_DIFFERENCE})`,
	);

	// The panel shows what is painted beneath it: its inner columns still pass through the stripe colours.
	const y = panel.y + panel.height / 2;
	const columns = [0.15, 0.35, 0.65, 0.85].map((share) =>
		pixel(dark, panel.x + panel.width * share, panel.y + 6),
	);
	const spread = Math.max(
		...columns.flatMap((a) =>
			columns.map((b) =>
				Math.hypot(
					(a[0] as number) - (b[0] as number),
					(a[1] as number) - (b[1] as number),
					(a[2] as number) - (b[2] as number),
				),
			),
		),
	);
	expect(
		spread > 40,
		`the panel's top edge carries the colours beneath it (spread ${spread.toFixed(0)} between four columns, y ${y.toFixed(0)})`,
	);

	// The shell's sidebar is glass over the opaque window: it is light in light and dark in dark.
	const sidebar = await app.getByTestId('nav').bounds();
	const cell = {
		...sidebar,
		x: sidebar.x + 150,
		width: 20,
		y: sidebar.y + 300,
		height: 20,
	};
	const luminance = (capture: typeof dark) => {
		const mean = region(capture, cell).mean;
		return (
			((mean[0] as number) + (mean[1] as number) + (mean[2] as number)) / 3
		);
	};
	const [lightLuminance, darkLuminance] = [luminance(light), luminance(dark)];
	expect(
		lightLuminance > darkLuminance + 60,
		`the sidebar glass follows the appearance (luminance ${darkLuminance.toFixed(0)} in dark, ${lightLuminance.toFixed(0)} in light)`,
	);

	// A popup is a glass view while open and none once closed.
	await app.getByTestId('page').wheel(0, 1000);
	await sleep(500);
	const baseline = countViews(GLASS);
	for (let round = 0; round < 5; round++) {
		await app.getByTestId('liquid-menu-trigger').click();
		await sleep(400);
		if (round === 0) {
			expect(
				countViews(GLASS) === baseline + 1,
				`opening the menu adds one NSGlassEffectView (${baseline} to ${countViews(GLASS)})`,
			);
			await captureWindow(`${outDir}menu-open.png`);
		}
		await app.getByTestId('page').press('Escape');
		await sleep(500);
	}
	expect(
		countViews(GLASS) === baseline,
		`five open and close rounds leave none behind (${baseline}, now ${countViews(GLASS)})`,
	);

	// Every demo mounts and unmounts its glass without a crash.
	await app.getByTestId('nav-tokens').click();
	const seen = new Set<number>();
	for (let step = 0; step < demos.length; step++) {
		await app.getByTestId('nav').press('ArrowDown');
		await sleep(250);
		seen.add(countViews(GLASS));
	}
	expect(
		seen.size > 1,
		`walking ${demos.length} demos changes the glass count (${[...seen].join(', ')}) and the window stays up`,
	);
}

async function fallback() {
	const memory = new Map<string, string>();
	setPanelStorage({
		get: (key) => memory.get(key),
		set: (key, value) => {
			memory.set(key, value);
		},
	});
	const test = createTestRoot({ width: 480, height: 240, appearance: 'light' });
	test.render(() => (
		<ColorSchemeProvider>
			<GlassPanel testId="panel">
				<Button variant="glass">Share</Button>
			</GlassPanel>
		</ColorSchemeProvider>
	));
	for (let frame = 0; frame < 20; frame++) {
		test.renderer.flush();
		test.renderer.dispatchNativeEvents();
		await sleep(30);
	}
	const panel = test.renderer.findByTestId('panel');
	if (panel === undefined) throw new Error('The panel did not render');
	expect(
		countViews(GLASS) === 0,
		`under createTestRoot no NSGlassEffectView is attached (${countViews(GLASS)})`,
	);
	test.renderer.captureScreenshot(`${outDir}fallback.png`);
}

try {
	if (mode === 'live') await live();
	else if (mode === 'fallback') await fallback();
	else throw new Error('usage: glass-check.tsx live|fallback [out-dir]');
} catch (error) {
	if (error instanceof Error && error.message.startsWith('not checkable')) {
		console.log(error.message);
		process.exit(3);
	}
	throw error;
}
process.exit(failures.length > 0 ? 1 : 0);
