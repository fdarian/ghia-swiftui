/**
 * Worker of `frame-trace`: grabs the app's own window as WindowServer composited
 * it, as fast as CoreGraphics returns, and keeps each frame that differs from
 * the one before. Runs off the main thread, which is the app's, so sampling
 * does not hold up its frames.
 */
import { sampleWindow } from './window-pixels.ts';

export interface SamplerRequest {
	windowNumber: number;
	crop: { x: number; y: number; width: number; height: number };
	scale: number;
	durationMs: number;
}

export interface SamplerFrame {
	/** Epoch ms, comparable to `performance.timeOrigin + performance.now()` on the main thread. */
	at: number;
	rgba: Uint8Array;
}

export interface SamplerResult {
	frames: SamplerFrame[];
	grabs: number;
	width: number;
	height: number;
}

declare const self: Worker;

function same(a: Uint8Array, b: Uint8Array) {
	for (let index = 0; index < a.length; index++) {
		if (a[index] !== b[index]) return false;
	}
	return true;
}

self.onmessage = (event: MessageEvent<SamplerRequest>) => {
	const request = event.data;
	const frames: SamplerFrame[] = [];
	let grabs = 0;
	let width = 0;
	let height = 0;
	let previous: Uint8Array | undefined;
	self.postMessage('ready');
	const end = performance.now() + request.durationMs;
	while (performance.now() < end) {
		const at = performance.timeOrigin + performance.now();
		const capture = sampleWindow(
			request.windowNumber,
			request.crop,
			request.scale,
		);
		grabs++;
		width = capture.width;
		height = capture.height;
		if (previous === undefined || !same(previous, capture.rgba)) {
			frames.push({ at, rgba: capture.rgba });
			previous = capture.rgba;
		}
	}
	const result: SamplerResult = { frames, grabs, width, height };
	self.postMessage(result, {
		transfer: frames.map((frame) => frame.rgba.buffer as ArrayBuffer),
	});
};
