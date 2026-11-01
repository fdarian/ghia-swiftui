/**
 * Opens the demo as a real window behind the active app (`GPUIX_BACKGROUND=1`),
 * checks its layout against the traffic lights, the resize handle and the saved
 * layout (a second window on the same home), saves screenshots of the GPU
 * surface, and closes it. The windows run against a throwaway `HOME`, so the
 * layout they save is not the user's.
 *
 *   pnpm window-check [out-dir]
 *
 * The surface capture holds what ghia draws; the traffic lights are native
 * and are not in it. The check is geometry: nothing may sit under the lights.
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch } from '@ghia/solid/automation';
import { windowOptions } from '#src/window-options.ts';

const outDir =
	process.argv[2] ??
	new URL('../screenshots/window/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

/** The traffic lights' box: three 14px buttons 20px apart, from the options' origin. */
const lights = {
	x: windowOptions.trafficLightX,
	y: windowOptions.trafficLightY,
	width: 60,
	height: 14,
};

/** A window is launched against `home`, so the layout it saves is this check's own. */
function open(home: string) {
	return launch({
		command: 'bun',
		args: ['src/main.tsx'],
		cwd: new URL('..', import.meta.url).pathname,
		env: { ...process.env, GPUIX_BACKGROUND: '1', HOME: home },
	});
}

function overlaps(
	box: { x: number; y: number; width: number; height: number },
	other: { x: number; y: number; width: number; height: number },
) {
	return (
		box.x < other.x + other.width &&
		box.x + box.width > other.x &&
		box.y < other.y + other.height &&
		box.y + box.height > other.y
	);
}

const settle = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));
const failures: string[] = [];
function expect(ok: boolean, what: string) {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
	if (!ok) failures.push(what);
}

const home = mkdtempSync(join(tmpdir(), 'ghia-swiftui-window-'));

const first = await open(home);
let savedWidth = 0;
try {
	await first.getByTestId('nav').waitFor({ timeoutMs: 20_000 });
	// The tree exists before the first frame is painted.
	await settle(1000);
	console.log('opened: the sidebar is in the tree');

	// Nothing the user can press or read sits under the lights.
	const toggle = await first.getByTestId('sidebar-toggle').bounds();
	expect(
		!overlaps(toggle, lights),
		`the sidebar toggle (${toggle.x},${toggle.y} ${toggle.width}x${toggle.height}) is clear of the traffic lights`,
	);
	const title = await first.getByText('Tokens').bounds();
	expect(
		!overlaps(title, lights),
		`the page title (${title.x},${title.y}) is clear of the traffic lights`,
	);
	await first.screenshot({ path: `${outDir}initial.png` });

	// The resize handle between the sidebar and the page.
	const sidebar = await first.getByTestId('shell-sidebar').bounds();
	await first.getByTestId('shell-group-handle-0').dragBy(40, 0);
	await settle(300);
	const wider = await first.getByTestId('shell-sidebar').bounds();
	savedWidth = wider.width;
	expect(
		Math.abs(wider.width - (sidebar.width + 40)) < 2,
		`dragging the handle +40 takes the sidebar from ${sidebar.width} to ${wider.width}`,
	);
	await first.screenshot({ path: `${outDir}resized.png` });

	// The toggle collapses the sidebar and the page's toolbar clears the toggle.
	await first.getByTestId('sidebar-toggle').click();
	await settle(800);
	const collapsed = await first.getByTestId('shell-sidebar').bounds();
	const titleAfter = await first.getByText('Tokens').bounds();
	const toggleAfter = await first.getByTestId('sidebar-toggle').bounds();
	expect(
		collapsed.width < 2,
		`the toggle collapses the sidebar (${collapsed.width} wide)`,
	);
	expect(
		titleAfter.x >= toggleAfter.x + toggleAfter.width,
		`the page title (x ${titleAfter.x}) clears the pinned toggle (ends ${toggleAfter.x + toggleAfter.width})`,
	);
	expect(
		titleAfter.x >= lights.x + lights.width,
		`the page title clears the traffic lights (ends ${lights.x + lights.width})`,
	);
	await first.screenshot({ path: `${outDir}collapsed.png` });
} finally {
	await first.close();
}

// A second window on the same home keeps what the first saved.
const second = await open(home);
try {
	await second.getByTestId('nav').waitFor({ timeoutMs: 20_000 });
	await settle(1000);
	const sidebar = await second.getByTestId('shell-sidebar').bounds();
	expect(
		sidebar.width < 2,
		'a new window opens with the sidebar collapsed, as it was left',
	);
	await second.getByTestId('sidebar-toggle').click();
	await settle(800);
	const restored = await second.getByTestId('shell-sidebar').bounds();
	expect(
		Math.abs(restored.width - savedWidth) < 2,
		`and reopening it brings back the dragged width (${restored.width}, was ${savedWidth})`,
	);
} finally {
	await second.close();
	rmSync(home, { recursive: true });
}

if (failures.length > 0) process.exitCode = 1;
