/**
 * Records what WindowServer composited, frame by frame, around one click: a
 * worker grabs the window at the highest rate CoreGraphics gives and keeps each
 * frame that differs from the one before. Used to count the frames a popup or a
 * page takes to appear whole.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { SamplerRequest, SamplerResult } from './frame-sampler.ts';
import {
	type Rect,
	visibleWindowNumber,
	windowScale,
	writeRgbaPng,
} from './window-pixels.ts';

function distance(a: Uint8Array, b: Uint8Array) {
	let sum = 0;
	for (let index = 0; index < a.length; index++) {
		sum += Math.abs((a[index] as number) - (b[index] as number));
	}
	return sum / a.length;
}

/**
 * Runs `action` while the worker samples `crop` (points, from the window's
 * top-left) for `durationMs`, then writes one PNG per distinct frame to
 * `dir` and a `timeline.txt` of when each appeared, in ms after `action`
 * started, and how far it is from the last frame (0 = settled).
 */
export async function traceAction(options: {
	dir: string;
	crop: Rect;
	durationMs: number;
	action: () => Promise<void>;
}) {
	mkdirSync(options.dir, { recursive: true });
	const worker = new Worker(new URL('./frame-sampler.ts', import.meta.url));
	const ready = new Promise<void>((resolve, reject) => {
		worker.onerror = (event) => reject(new Error(event.message));
		worker.onmessage = (event) => {
			if (event.data === 'ready') resolve();
		};
	});
	const request: SamplerRequest = {
		windowNumber: visibleWindowNumber(),
		crop: options.crop,
		scale: windowScale(),
		durationMs: options.durationMs,
	};
	worker.postMessage(request);
	await ready;
	// Let the worker's first grabs settle before the action.
	await new Promise((resolve) => setTimeout(resolve, 150));
	let origin = 0;
	const result = await new Promise<SamplerResult>((resolve, reject) => {
		worker.onmessage = (event) => {
			if (event.data !== 'ready') resolve(event.data as SamplerResult);
		};
		origin = performance.timeOrigin + performance.now();
		options.action().catch(reject);
	});
	worker.terminate();
	const last = result.frames.at(-1);
	if (last === undefined) throw new Error('The sampler saw no frame');
	const lines = [
		`grabs ${result.grabs} in ${options.durationMs}ms (${(options.durationMs / result.grabs).toFixed(1)}ms each), ${result.frames.length} distinct frames, crop ${result.width}x${result.height}px`,
	];
	for (const [index, frame] of result.frames.entries()) {
		lines.push(
			`${(frame.at - origin).toFixed(1).padStart(8)}ms  frame ${String(index).padStart(2, '0')} distance-to-last ${distance(frame.rgba, last.rgba).toFixed(2)}`,
		);
	}
	result.frames.forEach((frame, index) => {
		writeRgbaPng(
			frame.rgba,
			result.width,
			result.height,
			`${options.dir}/frame-${String(index).padStart(2, '0')}.png`,
		);
	});
	writeFileSync(`${options.dir}/timeline.txt`, `${lines.join('\n')}\n`);
	console.log(lines.join('\n'));
}
