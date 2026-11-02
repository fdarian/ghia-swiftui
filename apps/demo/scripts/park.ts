import { FFIType, ptr } from 'bun:ffi';
import { type Display, screen } from '@ghia/solid';
import {
	bind,
	type Id,
	native,
	type Pointer,
	readRect,
	required,
	requiredClass,
	selector,
	send,
} from 'ghia-swiftui/objc';

/**
 * How much of a parked window shows. A covered window gets no frames, so some
 * pixels have to stay on a display; the part off every display still draws.
 */
export const PARK_STRIP = 8;

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

function overlap(a: Box, b: Box) {
	const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
	const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
	return width > 0 && height > 0 ? width * height : 0;
}

const P = FFIType.ptr;
const copyWindowInfo = native<[number, number], Id>(
	'/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics',
	'CGWindowListCopyWindowInfo',
	[FFIType.u32, FFIType.u32],
	P,
);
const count = bind<[Pointer, Pointer], bigint>([P, P], FFIType.u64);
const objectAt = bind<[Pointer, Pointer, bigint], Id>([P, P, FFIType.u64], P);
const int = bind<[Pointer, Pointer], number>([P, P], FFIType.i32);
const double = bind<[Pointer, Pointer], number>([P, P], FFIType.f64);

function key(name: string): Pointer {
	return required(
		send.objectWithObject(
			requiredClass('NSString'),
			selector('stringWithUTF8String:'),
			ptr(Buffer.from(`${name}\0`)) as unknown as Pointer,
		),
		'stringWithUTF8String:',
	);
}

function value(dictionary: Pointer, name: string): Pointer | null {
	return send.objectWithObject(
		dictionary,
		selector('objectForKey:'),
		key(name),
	);
}

/**
 * The display holding the mouse pointer. Only reads the position, no input.
 * `NSEvent.mouseLocation` is in AppKit's space (origin at the primary
 * display's bottom-left, y up); `Display.bounds` has y down.
 */
function pointerDisplay(displays: Display[]): Display {
	const location = readRect(requiredClass('NSEvent'), 'mouseLocation');
	const x = location[0] as number;
	const y = screen.getPrimaryDisplay().bounds.height - (location[1] as number);
	const found = displays.find(
		(display) =>
			x >= display.bounds.x &&
			x < display.bounds.x + display.bounds.width &&
			y >= display.bounds.y &&
			y < display.bounds.y + display.bounds.height,
	);
	if (found === undefined) {
		throw new Error(`the mouse pointer (${x}, ${y}) is on no display`);
	}
	return found;
}

/**
 * The display the user is working on: the one holding the frontmost window of
 * the frontmost app, or, when that app has no window (Finder with none open),
 * the one holding the mouse pointer. `NSScreen.mainScreen` is not that, for a
 * process that is not active: it answers with its own idea of main, wherever
 * the user is.
 */
function userDisplay(displays: Display[]): Display {
	const workspace = required(
		send.object(requiredClass('NSWorkspace'), selector('sharedWorkspace')),
		'sharedWorkspace',
	);
	const app = required(
		send.object(workspace, selector('frontmostApplication')),
		'frontmostApplication',
	);
	const pid = int(app, selector('processIdentifier'));
	// kCGWindowListOptionOnScreenOnly: front to back.
	const windows = required(copyWindowInfo(1, 0), 'CGWindowListCopyWindowInfo');
	for (
		let index = 0;
		index < Number(count(windows, selector('count')));
		index++
	) {
		const info = required(
			objectAt(windows, selector('objectAtIndex:'), BigInt(index)),
			'objectAtIndex:',
		);
		if (
			int(
				required(value(info, 'kCGWindowOwnerPID'), 'owner pid'),
				selector('intValue'),
			) !== pid
		)
			continue;
		if (
			int(
				required(value(info, 'kCGWindowLayer'), 'layer'),
				selector('intValue'),
			) !== 0
		)
			continue;
		const bounds = required(
			send.objectWithObject(
				info,
				selector('objectForKey:'),
				key('kCGWindowBounds'),
			),
			'window bounds',
		);
		const read = (name: string) =>
			double(required(value(bounds, name), name), selector('doubleValue'));
		const box = {
			x: read('X'),
			y: read('Y'),
			width: read('Width'),
			height: read('Height'),
		};
		let best: Display | undefined;
		let bestArea = 0;
		for (const display of displays) {
			const area = overlap(box, display.bounds);
			if (area > bestArea) {
				best = display;
				bestArea = area;
			}
		}
		if (best !== undefined) return best;
	}
	return pointerDisplay(displays);
}

/**
 * Where a window of `size` opens so that only a `PARK_STRIP` edge of it is on
 * a display: top-left, in the global space of the `x` / `y` window options.
 * The display is never the user's, unless it is the only one. Of the strips on
 * its four edges, the one with the least of the window on any display wins, so
 * the rest hangs off into the space no display covers.
 */
export function parkedOrigin(size: { width: number; height: number }) {
	const displays = screen.getAllDisplays();
	const user = userDisplay(displays);
	const targets =
		displays.length === 1
			? displays
			: displays.filter((display) => display.id !== user.id);
	const candidates: { x: number; y: number }[] = [];
	for (const target of targets) {
		const area = target.bounds;
		const alongX = Math.max(
			area.x,
			Math.min(area.x + 120, area.x + area.width - size.width),
		);
		const alongY = Math.max(
			area.y,
			Math.min(area.y + 120, area.y + area.height - size.height),
		);
		candidates.push(
			{ x: area.x + area.width - PARK_STRIP, y: alongY },
			{ x: area.x + PARK_STRIP - size.width, y: alongY },
			{ x: alongX, y: area.y + area.height - PARK_STRIP },
			{ x: alongX, y: area.y + PARK_STRIP - size.height },
		);
	}
	let best: { x: number; y: number; cost: number } | undefined;
	for (const candidate of candidates) {
		const box = { ...candidate, ...size };
		if (displays.length > 1 && overlap(box, user.bounds) > 0) {
			continue;
		}
		const cost = displays.reduce(
			(sum, display) => sum + overlap(box, display.bounds),
			0,
		);
		if (best === undefined || cost < best.cost) best = { ...candidate, cost };
	}
	if (best === undefined) {
		throw new Error('no edge of any display leaves the user display clear');
	}
	return { x: best.x, y: best.y };
}
