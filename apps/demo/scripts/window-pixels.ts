/**
 * Captures this process's own window as WindowServer composited it, native
 * subviews (NSGlassEffectView) included. `captureScreenshot` is only the Metal
 * frame. Same route as ghia's nativeview e2e: `CGWindowListCreateImage` on
 * the app's own window id needs no screen-recording permission, and nothing
 * outside the process is touched. Run it in the app's process, on the main
 * thread (Bun's JS thread is the app's).
 */
import { FFIType, ptr } from 'bun:ffi';
import {
	bind,
	native,
	type Pointer,
	required,
	requiredClass,
	selector,
	send,
} from 'ghia-swiftui/objc';

const P = FFIType.ptr;
const COREGRAPHICS =
	'/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics';
const { f64: D, u32: U32, u64: U64, void: VOID } = FFIType;
type Id = Pointer | null;

// The CGRect goes in as four doubles (a homogeneous float aggregate on arm64).
// CGRectNull is (inf, inf, 0, 0); the options are kCGWindowListOptionIncludingWindow = 8.
const createWindowImage = native<
	[number, number, number, number, number, number, number],
	Id
>(COREGRAPHICS, 'CGWindowListCreateImage', [D, D, D, D, U32, U32, U32], P);
const releaseImage = native<[Pointer], void>(
	COREGRAPHICS,
	'CGImageRelease',
	[P],
	VOID,
);
const imageWidth = native<[Pointer], bigint>(
	COREGRAPHICS,
	'CGImageGetWidth',
	[P],
	U64,
);
const imageHeight = native<[Pointer], bigint>(
	COREGRAPHICS,
	'CGImageGetHeight',
	[P],
	U64,
);
const createColorSpace = native<[], Id>(
	COREGRAPHICS,
	'CGColorSpaceCreateDeviceRGB',
	[],
	P,
);
const releaseColorSpace = native<[Pointer], void>(
	COREGRAPHICS,
	'CGColorSpaceRelease',
	[P],
	VOID,
);
const createBitmapContext = native<
	[Uint8Array, bigint, bigint, bigint, bigint, Pointer, number],
	Id
>(COREGRAPHICS, 'CGBitmapContextCreate', [P, U64, U64, U64, U64, P, U32], P);
const drawImage = native<
	[Pointer, number, number, number, number, Pointer],
	void
>(COREGRAPHICS, 'CGContextDrawImage', [P, D, D, D, D, P], VOID);
const releaseContext = native<[Pointer], void>(
	COREGRAPHICS,
	'CGContextRelease',
	[P],
	VOID,
);

const bool = bind<[Pointer, Pointer], boolean>([P, P], FFIType.bool);
const integer = bind<[Pointer, Pointer], bigint>([P, P], FFIType.i64);
const double = bind<[Pointer, Pointer], number>([P, P], FFIType.f64);
const objectAt = bind<[Pointer, Pointer, bigint], Pointer | null>(
	[P, P, FFIType.u64],
	P,
);
const pngOf = bind<[Pointer, Pointer, bigint, null], Pointer | null>(
	[P, P, FFIType.u64, P],
	P,
);
const writeToFile = bind<[Pointer, Pointer, Pointer, boolean], boolean>(
	[P, P, P, FFIType.bool],
	FFIType.bool,
);

const setOrigin = bind<[Pointer, Pointer, number, number], void>(
	[P, P, D, D],
	VOID,
);

/**
 * Moves the window's bottom-left corner to a point in screen coordinates
 * (origin bottom-left). A window under other apps' windows gets no frames, so
 * a capture parks it with a strip on the screen's edge showing: the rest of
 * the window may hang off the screen and is still drawn and captured.
 */
export function moveWindow(x: number, y: number) {
	setOrigin(visibleWindow(), selector('setFrameOrigin:'), x, y);
}

function visibleWindow(): Pointer {
	const app = required(
		send.object(requiredClass('NSApplication'), selector('sharedApplication')),
		'sharedApplication',
	);
	const windows = required(send.object(app, selector('windows')), 'windows');
	const count = Number(integer(windows, selector('count')));
	for (let index = 0; index < count; index++) {
		const window = required(
			objectAt(windows, selector('objectAtIndex:'), BigInt(index)),
			'objectAtIndex:',
		);
		if (bool(window, selector('isVisible'))) return window;
	}
	throw new Error('No visible window to capture');
}

export interface Capture {
	width: number;
	height: number;
	/** Row-major RGBA, device pixels. */
	rgba: Uint8Array;
	/** Device pixels per point. */
	scale: number;
}

/** NSWindowOcclusionStateVisible: a covered window is given no frames, so a capture of it is stale or black. */
function windowVisible(window: Pointer): boolean {
	return (Number(integer(window, selector('occlusionState'))) & 2) !== 0;
}

/** Waits for the window to be uncovered: another app's window moving over it is out of this script's hands. */
async function waitUncovered(window: Pointer, timeoutMs: number) {
	const until = performance.now() + timeoutMs;
	while (!windowVisible(window)) {
		if (performance.now() > until) {
			throw new Error(
				'not checkable: the window is occluded (covered by another window), so it gets no frames',
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	// A frame has to be drawn after it was uncovered.
	await new Promise((resolve) => setTimeout(resolve, 400));
}

function toPng(image: Pointer, path: string) {
	const rep = required(
		send.objectWithObject(
			required(
				send.object(requiredClass('NSBitmapImageRep'), selector('alloc')),
				'NSBitmapImageRep alloc',
			),
			selector('initWithCGImage:'),
			image,
		),
		'initWithCGImage:',
	);
	const data = required(
		pngOf(
			rep,
			selector('representationUsingType:properties:'),
			4n /* NSBitmapImageFileTypePNG */,
			null,
		),
		'PNG encoding',
	);
	const name = required(
		send.objectWithObject(
			requiredClass('NSString'),
			selector('stringWithUTF8String:'),
			ptr(Buffer.from(`${path}\0`)),
		),
		'stringWithUTF8String:',
	);
	if (!writeToFile(data, selector('writeToFile:atomically:'), name, true)) {
		throw new Error(`Could not write ${path}`);
	}
}

/** The window's pixels, drawn into a known RGBA layout. */
function toRgba(image: Pointer) {
	const width = Number(imageWidth(image));
	const height = Number(imageHeight(image));
	const rgba = new Uint8Array(width * height * 4);
	const space = required(createColorSpace(), 'CGColorSpaceCreateDeviceRGB');
	const context = createBitmapContext(
		rgba,
		BigInt(width),
		BigInt(height),
		8n,
		BigInt(width * 4),
		space,
		1 /* kCGImageAlphaPremultipliedLast */,
	);
	releaseColorSpace(space);
	drawImage(
		required(context, 'CGBitmapContextCreate'),
		0,
		0,
		width,
		height,
		image,
	);
	releaseContext(required(context, 'CGBitmapContextCreate'));
	return { width, height, rgba };
}

/** Writes the window to `path` as a PNG, and returns its pixels. */
export async function captureWindow(path: string): Promise<Capture> {
	const window = visibleWindow();
	await waitUncovered(window, 15_000);
	const image = createWindowImage(
		Number.POSITIVE_INFINITY,
		Number.POSITIVE_INFINITY,
		0,
		0,
		8,
		Number(integer(window, selector('windowNumber'))),
		// kCGWindowImageBoundsIgnoreFraming | kCGWindowImageBestResolution
		1 | 8,
	);
	if (image === null) {
		throw new Error(
			'CGWindowListCreateImage returned null: the window is hidden, ordered out or the display is asleep',
		);
	}
	try {
		toPng(image, path);
		return {
			...toRgba(image),
			scale: double(window, selector('backingScaleFactor')),
		};
	} finally {
		releaseImage(image);
	}
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Mean and standard deviation per channel over a rect given in points. */
export function region(capture: Capture, rect: Rect) {
	const sums = [0, 0, 0];
	const squares = [0, 0, 0];
	let count = 0;
	const x0 = Math.round(rect.x * capture.scale);
	const y0 = Math.round(rect.y * capture.scale);
	const x1 = Math.round((rect.x + rect.width) * capture.scale);
	const y1 = Math.round((rect.y + rect.height) * capture.scale);
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			const at = (y * capture.width + x) * 4;
			for (let channel = 0; channel < 3; channel++) {
				const value = capture.rgba[at + channel] as number;
				sums[channel] = (sums[channel] as number) + value;
				squares[channel] = (squares[channel] as number) + value * value;
			}
			count++;
		}
	}
	const mean = sums.map((sum) => sum / count);
	const deviation = squares.map((sum, channel) =>
		Math.sqrt(Math.max(0, sum / count - (mean[channel] as number) ** 2)),
	);
	return { mean, deviation };
}

/** The RGB of the pixel at a point given in points. */
export function pixel(capture: Capture, x: number, y: number) {
	const at =
		(Math.round(y * capture.scale) * capture.width +
			Math.round(x * capture.scale)) *
		4;
	return [...capture.rgba.subarray(at, at + 3)];
}

const isKindOfClass = bind<[Pointer, Pointer, Pointer], boolean>(
	[P, P, P],
	FFIType.bool,
);

/** How many views of the class `className` the window holds, nested ones included. */
export function countViews(className: string): number {
	const target = requiredClass(className);
	const visit = (view: Pointer): number => {
		const subviews = required(
			send.object(view, selector('subviews')),
			'subviews',
		);
		const count = Number(integer(subviews, selector('count')));
		let total = isKindOfClass(view, selector('isKindOfClass:'), target) ? 1 : 0;
		for (let index = 0; index < count; index++) {
			total += visit(
				required(
					objectAt(subviews, selector('objectAtIndex:'), BigInt(index)),
					'objectAtIndex:',
				),
			);
		}
		return total;
	};
	const content = required(
		send.object(visibleWindow(), selector('contentView')),
		'contentView',
	);
	// The window's frame view holds the content view; glass lives under it.
	const frame = required(
		send.object(content, selector('superview')),
		'superview',
	);
	return visit(frame);
}

/** A PNG file's pixels, drawn into the same RGBA layout as a window capture. */
export function loadPng(path: string, scale: number): Capture {
	const data = required(
		send.objectWithObject(
			requiredClass('NSData'),
			selector('dataWithContentsOfFile:'),
			required(
				send.objectWithObject(
					requiredClass('NSString'),
					selector('stringWithUTF8String:'),
					ptr(Buffer.from(`${path}\0`)),
				),
				'stringWithUTF8String:',
			),
		),
		`reading ${path}`,
	);
	const rep = required(
		send.objectWithObject(
			required(
				send.object(requiredClass('NSBitmapImageRep'), selector('alloc')),
				'NSBitmapImageRep alloc',
			),
			selector('initWithData:'),
			data,
		),
		'initWithData:',
	);
	const image = required(send.object(rep, selector('CGImage')), 'CGImage');
	return { ...toRgba(image), scale };
}

/** Mean absolute difference per channel between two captures of one size, over a rect in points. */
export function meanDifference(a: Capture, b: Capture, rect: Rect): number {
	if (a.width !== b.width || a.height !== b.height) {
		throw new Error(
			`Captures differ in size: ${a.width}x${a.height} and ${b.width}x${b.height}`,
		);
	}
	const x0 = Math.round(rect.x * a.scale);
	const y0 = Math.round(rect.y * a.scale);
	const x1 = Math.round((rect.x + rect.width) * a.scale);
	const y1 = Math.round((rect.y + rect.height) * a.scale);
	let sum = 0;
	let count = 0;
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			const at = (y * a.width + x) * 4;
			for (let channel = 0; channel < 3; channel++) {
				sum += Math.abs(
					(a.rgba[at + channel] as number) - (b.rgba[at + channel] as number),
				);
				count++;
			}
		}
	}
	return sum / count;
}
