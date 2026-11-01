/**
 * Headless capture of one demo through ghia's offscreen test renderer: no
 * window, no OS input. Pointer events are simulated inside the renderer.
 *
 *   pnpm screenshot <demo>
 *
 * Writes `screenshots/<demo>/initial.png`, then whatever the demo's
 * `scenario` captures.
 */
import { mkdirSync } from 'node:fs';
import { createTestRoot } from '@ghia/solid/testing';
import { App } from '#src/app.tsx';
import { demos } from '#src/demos/index.ts';
import type { Shot } from '#src/demos/shot.ts';

const name = process.argv[2];
const demo = demos.find((candidate) => candidate.name === name);
if (demo === undefined) {
	console.error(
		`usage: pnpm screenshot <${demos.map((candidate) => candidate.name).join('|')}>`,
	);
	process.exit(1);
}

const outDir = new URL(`../screenshots/${demo.name}/`, import.meta.url)
	.pathname;
mkdirSync(outDir, { recursive: true });

const FRAME_MS = 16;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 960, height: 640, appearance: 'dark' });
const renderer = test.renderer;

/** Runs frames for `ms`: each flushes the tree and drains native events so handlers reach JS. */
async function settle(ms = 300) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(FRAME_MS);
	} while (performance.now() < until);
	renderer.flush();
	renderer.dispatchNativeEvents();
}

function elementByTestId(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined)
		throw new Error(`no element with testId ${testId}`);
	return element;
}

function capture(shotName: string) {
	renderer.captureScreenshot(`${outDir}${shotName}.png`);
	console.log(`captured ${demo?.name}/${shotName}`);
}

const shot: Shot = {
	async click(testId) {
		const bounds = renderer.getElementBounds(elementByTestId(testId).id);
		if (bounds === null) throw new Error(`no box for ${testId}`);
		renderer.nativeSimulateClick(
			bounds.x + bounds.width / 2,
			bounds.y + bounds.height / 2,
		);
		await settle();
	},
	expectChecked(testId, checked) {
		const id = elementByTestId(testId).customProps?.id;
		const node = Object.values(renderer.getA11yTree().nodes ?? {}).find(
			(candidate) => candidate.aria?.author_id === id,
		);
		if (node === undefined)
			throw new Error(`no accessibility node for ${testId}`);
		const actual = node.aria?.toggled;
		if (actual !== (checked ? 'True' : 'False')) {
			throw new Error(
				`${testId}: expected checked=${checked}, a11y reports ${JSON.stringify(node.aria)}`,
			);
		}
	},
	capture,
};

test.render(() => <App initial={demo.name} />);
await settle(500);
capture('initial');
await demo.scenario?.(shot);
test.unmount();
