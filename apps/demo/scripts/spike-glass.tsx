import { render } from '@ghia/solid';
import {
	attachNativeGlass,
	nativeGlassAvailable,
} from 'ghia-swiftui/native-glass';
import { createSignal, Show } from 'solid-js';
import { captureWindow, pixel, region } from './window-pixels.ts';

const out = '/tmp/spike';
const [glassOn, setGlassOn] = createSignal(false);
const [variant, setVariant] = createSignal<'regular' | 'clear'>('regular');
let handle: ReturnType<typeof attachNativeGlass> | undefined;
console.log('available', nativeGlassAvailable());

function App() {
	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: '#808080',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: 400,
					height: 500,
					backgroundImage:
						'repeating-linear-gradient(90deg, #ff0000 0 20px, #00ff00 20px 40px, #0000ff 40px 60px, #ffff00 60px 80px)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 400,
					width: 400,
					height: 250,
					backgroundColor: '#ff00ff',
				}}
			/>
			<Show when={glassOn()}>
				<nativeview
					style={{
						position: 'absolute',
						left: 250,
						top: 100,
						width: 300,
						height: 200,
						borderRadius: 24,
						overflow: 'hidden',
					}}
					onAttach={(view) => {
						console.log('onAttach', view);
						handle = attachNativeGlass(view, {
							variant: variant(),
							tint: { red: 0, green: 0, blue: 0, alpha: 0 },
							cornerRadius: 24,
						});
					}}
					onDetach={() => {
						console.log('onDetach');
						handle?.detach();
						handle = undefined;
					}}
				>
					<text style={{ color: '#000000' }}>Glass</text>
				</nativeview>
			</Show>
		</div>
	);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
render(() => <App />, {
	title: 'spike',
	width: 800,
	height: 500,
	focus: false,
	windowBackground: process.env.BG as any,
});
await sleep(1500);
const rect = { x: 270, y: 152, width: 260, height: 160 };
const T = 32;
const base = await captureWindow(`${out}/base.png`);
console.log(
	'scale',
	base.scale,
	'probe',
	[10, 30, 50, 70].map((x) => pixel(base, x, 300)),
);
console.log(
	'base',
	base.width,
	base.height,
	JSON.stringify(region(base, rect)),
);
setGlassOn(true);
await sleep(1500);
const on = await captureWindow(`${out}/glass-regular.png`);
console.log('regular', JSON.stringify(region(on, rect)));
for (const x of [
	255, 265, 275, 285, 295, 305, 315, 325, 335, 345, 355, 375, 395, 405, 425,
	445, 465, 485, 505, 525, 545,
])
	console.log(
		'row y=232 x=' + x,
		'base',
		pixel(base, x, 232).slice(0, 3).join(','),
		'glass',
		pixel(on, x, 232).slice(0, 3).join(','),
	);
for (const p of [
	[280, 130],
	[300, 200],
	[420, 200],
	[520, 270],
	[240, 200],
	[400, 50],
])
	console.log(
		'px',
		p,
		pixel(base, p[0] as number, p[1] as number),
		pixel(on, p[0] as number, p[1] as number),
	);
setGlassOn(false);
setVariant('clear');
await sleep(500);
setGlassOn(true);
await sleep(1500);
const clear = await captureWindow(`${out}/glass-clear.png`);
console.log('clear', JSON.stringify(region(clear, rect)));
setGlassOn(false);
await sleep(800);
const after = await captureWindow(`${out}/after-detach.png`);
console.log('after', JSON.stringify(region(after, rect)));
process.exit(0);
