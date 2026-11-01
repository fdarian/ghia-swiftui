/**
 * Headless capture of one demo through ghia's offscreen test renderer: no
 * window, no OS input. Pointer events are simulated inside the renderer.
 *
 *   pnpm screenshot <demo>
 *
 * Writes `screenshots/<demo>/initial-light.png` and `initial-dark.png`, then
 * a light and a dark file for every `capture` the demo's `scenario` makes.
 * Each capture flips the scheme through `applyColorScheme`, the call the
 * shell's scheme toggle makes, and restores light afterwards.
 */
import { mkdirSync } from 'node:fs';
import { createTestRoot } from '@ghia/solid/testing';
import { applyColorScheme } from 'ghia-swiftui';
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
const test = createTestRoot({ width: 1100, height: 900, appearance: 'light' });
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

function centre(testId: string) {
	const bounds = renderer.getElementBounds(elementByTestId(testId).id);
	if (bounds === null) throw new Error(`no box for ${testId}`);
	return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

let pointer = { x: 0, y: 0 };

async function capture(shotName: string) {
	for (const scheme of ['light', 'dark'] as const) {
		applyColorScheme(scheme === 'dark');
		await settle(150);
		renderer.captureScreenshot(`${outDir}${shotName}-${scheme}.png`);
		console.log(`captured ${demo?.name}/${shotName}-${scheme}`);
	}
	applyColorScheme(false);
	await settle(150);
}

const shot: Shot = {
	async click(testId) {
		pointer = centre(testId);
		renderer.nativeSimulateClick(pointer.x, pointer.y);
		await settle();
	},
	async clickEnd(testId) {
		const bounds = renderer.getElementBounds(elementByTestId(testId).id);
		if (bounds === null) throw new Error(`no box for ${testId}`);
		pointer = {
			x: bounds.x + bounds.width - 20,
			y: bounds.y + bounds.height / 2,
		};
		renderer.nativeSimulateClick(pointer.x, pointer.y);
		await settle();
	},
	async hover(testId) {
		pointer = centre(testId);
		renderer.nativeSimulateMouseMove(pointer.x, pointer.y);
		await settle();
	},
	async press(testId) {
		pointer = centre(testId);
		renderer.nativeSimulateMouseMove(pointer.x, pointer.y);
		renderer.nativeSimulateMouseDown(pointer.x, pointer.y);
		await settle();
	},
	async release() {
		renderer.nativeSimulateMouseUp(pointer.x, pointer.y);
		await settle();
	},
	async leave() {
		renderer.nativeSimulateMouseExit(pointer.x, pointer.y);
		await settle();
	},
	async focus(testId) {
		renderer.focusElement(elementByTestId(testId).id);
		await settle();
	},
	wait: (ms) => settle(ms),
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
	expectText(testId, text) {
		const collect = (id: number): string => {
			const element = renderer.getElement(id);
			if (element === undefined) throw new Error(`no element ${id}`);
			return element.text ?? element.children.map(collect).join('');
		};
		const actual = collect(elementByTestId(testId).id);
		if (actual !== text) {
			throw new Error(`${testId}: expected text ${text}, got ${actual}`);
		}
	},
	expectFocused(testId) {
		const focused = renderer.getFocusedElementId();
		if (focused !== elementByTestId(testId).id) {
			throw new Error(`${testId} does not hold focus (focused: ${focused})`);
		}
	},
	expectPresent(testId) {
		elementByTestId(testId);
	},
	expectAbsent(testId) {
		if (renderer.findByTestId(testId) !== undefined) {
			throw new Error(`${testId} is still in the tree`);
		}
	},
	capture,
};

test.render(() => <App initial={demo.name} />);
await settle(500);
await capture('initial');
await demo.scenario?.(shot);
test.unmount();
