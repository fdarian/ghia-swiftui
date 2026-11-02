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
import { applyColorScheme, setPanelStorage } from 'ghia-swiftui';
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

// A run must not read or write the layout a real window saved.
const memory = new Map<string, string>();
setPanelStorage({
	get: (key) => memory.get(key),
	set: (key, value) => {
		memory.set(key, value);
	},
});

const outDir = new URL(`../screenshots/${demo.name}/`, import.meta.url)
	.pathname;
mkdirSync(outDir, { recursive: true });

const FRAME_MS = 16;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({
	width: 1100,
	height: 900,
	appearance: 'light',
	// As the real window: `appRegion` applies only to a window with no titlebar of its own.
	titlebarTransparent: true,
});
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
	async clickText(text) {
		let element = renderer.findByText(text);
		if (element === undefined) throw new Error(`no text element with ${text}`);
		let bounds = renderer.getElementBounds(element.id);
		while (bounds === null && element?.parentId != null) {
			element = renderer.getElement(element.parentId);
			bounds =
				element === undefined ? null : renderer.getElementBounds(element.id);
		}
		if (bounds === null) throw new Error(`no box for text ${text}`);
		pointer = {
			x: bounds.x + bounds.width / 2,
			y: bounds.y + bounds.height / 2,
		};
		renderer.nativeSimulateClick(pointer.x, pointer.y);
		await settle();
	},
	async rightClick(testId) {
		pointer = centre(testId);
		renderer.nativeSimulateClick(pointer.x, pointer.y, 2);
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
	async keys(keystrokes) {
		renderer.simulateKeystrokes(keystrokes);
		await settle();
	},
	async wheel(testId, deltaY) {
		pointer = centre(testId);
		renderer.nativeSimulateScrollWheel(pointer.x, pointer.y, 0, deltaY);
		await settle();
	},
	async reveal(testId) {
		renderer.scrollIntoView(
			elementByTestId(testId).id,
			'nearest',
			'nearest',
			'instant',
		);
		await settle();
	},
	async scrollTo(testId, top) {
		renderer.scrollTo(elementByTestId(testId).id, 0, top, 'instant');
		await settle();
	},
	async drag(testId, dx, dy) {
		pointer = centre(testId);
		renderer.nativeSimulateMouseMove(pointer.x, pointer.y);
		renderer.nativeSimulateMouseDown(pointer.x, pointer.y);
		await settle(50);
		const steps = 6;
		for (let step = 1; step <= steps; step++) {
			renderer.nativeSimulateMouseMove(
				pointer.x + (dx * step) / steps,
				pointer.y + (dy * step) / steps,
			);
			await settle(30);
		}
		pointer = { x: pointer.x + dx, y: pointer.y + dy };
		renderer.nativeSimulateMouseUp(pointer.x, pointer.y);
		await settle();
	},
	async isDragRegion(testId) {
		renderer.takeSimulatedWindowActions();
		pointer = centre(testId);
		renderer.nativeSimulateMouseMove(pointer.x, pointer.y);
		renderer.nativeSimulateMouseDown(pointer.x, pointer.y);
		await settle(50);
		const actions = renderer.takeSimulatedWindowActions();
		renderer.nativeSimulateMouseUp(pointer.x, pointer.y);
		await settle(50);
		return actions.includes('move');
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
	box(testId) {
		const bounds = renderer.getElementBounds(elementByTestId(testId).id);
		if (bounds === null) throw new Error(`no box for ${testId}`);
		return bounds;
	},
	scrollMetrics(testId) {
		const metrics = renderer.getScrollMetrics(elementByTestId(testId).id);
		const scrollTop = metrics?.[1];
		const scrollHeight = metrics?.[3];
		const clientHeight = metrics?.[5];
		if (
			scrollTop === undefined ||
			scrollHeight === undefined ||
			clientHeight === undefined
		) {
			throw new Error(`${testId} is not a scroller`);
		}
		return { scrollTop, scrollHeight, clientHeight };
	},
	expectPresent(testId) {
		elementByTestId(testId);
	},
	expectNotPainted(testId) {
		if (renderer.getElementBounds(elementByTestId(testId).id) !== null) {
			throw new Error(`${testId} was laid out`);
		}
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
