/**
 * A borderless AppKit panel holding a real NSGlassEffectView that the user
 * drags over any app. ghia has one renderer per process, so this is plain
 * AppKit driven through the same bun:ffi layer NativeGlass uses, not GPUI.
 */
import { FFIType, ptr } from 'bun:ffi';
import {
	nativeGlassAvailable,
	setGlassLook,
	tintFromColor,
} from 'ghia-swiftui/native-glass';
import {
	assertMainThread,
	bind,
	type Pointer,
	readRect,
	required,
	requiredClass,
	selector,
	send,
} from 'ghia-swiftui/objc';
import { colors } from 'ghia-swiftui/tokens/colors';
import { createSignal } from 'solid-js';

const P = FFIType.ptr;
const D = FFIType.f64;
const I = FFIType.i64;
const BOOL = FFIType.bool;

const WIDTH = 320;
const HEIGHT = 200;
const CORNER_RADIUS = 28;

const STYLE_MASK_BORDERLESS = 0;
const STYLE_MASK_NONACTIVATING_PANEL = 1 << 7;
const BACKING_BUFFERED = 2;
const FLOATING_WINDOW_LEVEL = 3;
const COLLECTION_CAN_JOIN_ALL_SPACES = 1 << 0;
// So it also floats over an app in full screen, which canJoinAllSpaces alone does not allow.
const COLLECTION_FULL_SCREEN_AUXILIARY = 1 << 8;
/** NSViewMinXMargin | NSViewMaxXMargin | NSViewMinYMargin | NSViewMaxYMargin: pins a view at the centre. */
const CENTERED = 1 | 4 | 8 | 32;

const initPanel = bind<
	[Pointer, Pointer, number, number, number, number, number, number, boolean],
	Pointer | null
>([P, P, D, D, D, D, I, I, BOOL], P);
const voidWithBoolean = bind<[Pointer, Pointer, boolean], void>(
	[P, P, BOOL],
	FFIType.void,
);
const voidWithTwoDoubles = bind<[Pointer, Pointer, number, number], void>(
	[P, P, D, D],
	FFIType.void,
);
const integerOf = bind<[Pointer, Pointer], bigint>([P, P], I);
const boolOf = bind<[Pointer, Pointer], boolean>([P, P], BOOL);
const objectAt = bind<[Pointer, Pointer, bigint], Pointer | null>(
	[P, P, FFIType.u64],
	P,
);

export type FloatingGlassStyle = 'regular' | 'clear' | 'tinted';

const [open, setOpen] = createSignal(false);
const [style, setStyle] = createSignal<FloatingGlassStyle>('regular');

/** Whether the glass panel is on screen. */
export const floatingGlassOpen = open;

/** The style the panel opens with, and keeps across close and reopen. */
export const floatingGlassStyle = style;

let panel: Pointer | null = null;
let glassView: Pointer | null = null;

/** Tinted is `glassAccent`'s look: regular glass under the accent colour. */
function applyStyle(glass: Pointer) {
	const current = style();
	setGlassLook(
		glass,
		current === 'clear' ? 'clear' : 'regular',
		tintFromColor(current === 'tinted' ? colors.accent : undefined),
	);
}

export function setFloatingGlassStyle(next: FloatingGlassStyle) {
	assertMainThread('setFloatingGlassStyle');
	setStyle(next);
	if (glassView !== null) applyStyle(glassView);
}

function nsString(text: string): Pointer {
	return required(
		send.objectWithObject(
			requiredClass('NSString'),
			selector('stringWithUTF8String:'),
			ptr(Buffer.from(`${text}\0`)),
		),
		'stringWithUTF8String:',
	);
}

/** The screen of the demo window: the first visible window of the app that is not the panel. */
function demoWindowScreen(): Pointer | null {
	const app = required(
		send.object(requiredClass('NSApplication'), selector('sharedApplication')),
		'sharedApplication',
	);
	const windows = required(send.object(app, selector('windows')), 'windows');
	const count = Number(integerOf(windows, selector('count')));
	for (let index = 0; index < count; index++) {
		const window = required(
			objectAt(windows, selector('objectAtIndex:'), BigInt(index)),
			'objectAtIndex:',
		);
		if (window === panel || !boolOf(window, selector('isVisible'))) continue;
		return send.object(window, selector('screen'));
	}
	return null;
}

/**
 * Whether the panel can be shown: this macOS has NSGlassEffectView and the
 * demo window is on a screen. The offscreen test window is on none.
 */
export function floatingGlassAvailable(): boolean {
	return nativeGlassAvailable() && demoWindowScreen() !== null;
}

function createPanel(): Pointer {
	const created = required(
		initPanel(
			required(
				send.object(requiredClass('NSPanel'), selector('alloc')),
				'+[NSPanel alloc]',
			),
			selector('initWithContentRect:styleMask:backing:defer:'),
			0,
			0,
			WIDTH,
			HEIGHT,
			STYLE_MASK_BORDERLESS | STYLE_MASK_NONACTIVATING_PANEL,
			BACKING_BUFFERED,
			false,
		),
		'-[NSPanel initWithContentRect:styleMask:backing:defer:]',
	);
	// Without this the panel is released on close and the pointer dangles.
	voidWithBoolean(created, selector('setReleasedWhenClosed:'), false);
	voidWithBoolean(created, selector('setOpaque:'), false);
	send.voidWithObject(
		created,
		selector('setBackgroundColor:'),
		send.object(requiredClass('NSColor'), selector('clearColor')),
	);
	voidWithBoolean(created, selector('setMovableByWindowBackground:'), true);
	send.voidWithInteger(created, selector('setLevel:'), FLOATING_WINDOW_LEVEL);
	voidWithBoolean(created, selector('setHasShadow:'), true);
	voidWithBoolean(created, selector('setHidesOnDeactivate:'), false);
	send.voidWithInteger(
		created,
		selector('setCollectionBehavior:'),
		COLLECTION_CAN_JOIN_ALL_SPACES | COLLECTION_FULL_SCREEN_AUXILIARY,
	);

	const glass = required(
		send.objectWithFourDoubles(
			required(
				send.object(requiredClass('NSGlassEffectView'), selector('alloc')),
				'+[NSGlassEffectView alloc]',
			),
			selector('initWithFrame:'),
			0,
			0,
			WIDTH,
			HEIGHT,
		),
		'-[NSGlassEffectView initWithFrame:]',
	);
	applyStyle(glass);
	send.voidWithDouble(glass, selector('setCornerRadius:'), CORNER_RADIUS);

	const content = required(
		send.objectWithFourDoubles(
			required(
				send.object(requiredClass('NSView'), selector('alloc')),
				'+[NSView alloc]',
			),
			selector('initWithFrame:'),
			0,
			0,
			WIDTH,
			HEIGHT,
		),
		'-[NSView initWithFrame:]',
	);
	const label = required(
		send.objectWithObject(
			requiredClass('NSTextField'),
			selector('labelWithString:'),
			nsString('Drag me anywhere'),
		),
		'+[NSTextField labelWithString:]',
	);
	send.void(label, selector('sizeToFit'));
	const labelFrame = readRect(label, 'frame');
	voidWithTwoDoubles(
		label,
		selector('setFrameOrigin:'),
		(WIDTH - (labelFrame[2] as number)) / 2,
		(HEIGHT - (labelFrame[3] as number)) / 2,
	);
	send.voidWithObject(
		label,
		selector('setTextColor:'),
		send.object(requiredClass('NSColor'), selector('labelColor')),
	);
	send.voidWithInteger(label, selector('setAutoresizingMask:'), CENTERED);
	send.voidWithObject(content, selector('addSubview:'), label);
	send.voidWithObject(glass, selector('setContentView:'), content);
	send.void(content, selector('release'));

	send.voidWithObject(created, selector('setContentView:'), glass);
	// The panel retains it as its content view; the pointer lives as long as the panel.
	send.void(glass, selector('release'));
	glassView = glass;
	return created;
}

function centreOnScreen(target: Pointer, screen: Pointer) {
	const area = readRect(screen, 'visibleFrame');
	voidWithTwoDoubles(
		target,
		selector('setFrameOrigin:'),
		Math.round((area[0] as number) + ((area[2] as number) - WIDTH) / 2),
		Math.round((area[1] as number) + ((area[3] as number) - HEIGHT) / 2),
	);
}

/**
 * Shows the panel without activating the app. It is created, and centred on
 * the demo window's screen, the first time only: closing only orders it out,
 * so it reopens where the user left it.
 */
export function openFloatingGlass() {
	assertMainThread('openFloatingGlass');
	if (!nativeGlassAvailable()) {
		throw new Error('NSGlassEffectView is not available on this macOS');
	}
	if (panel === null) {
		const screen = required(demoWindowScreen(), 'the demo window screen');
		panel = createPanel();
		centreOnScreen(panel, screen);
	}
	send.void(panel, selector('orderFrontRegardless'));
	setOpen(true);
}

export function closeFloatingGlass() {
	assertMainThread('closeFloatingGlass');
	if (panel === null) return;
	send.voidWithObject(panel, selector('orderOut:'), null);
	setOpen(false);
}

function destroyFloatingGlass() {
	if (panel === null) return;
	send.void(panel, selector('close'));
	send.void(panel, selector('release'));
	panel = null;
	glassView = null;
	setOpen(false);
}

// bun --hot reloads this module with fresh state: the old panel would stay on screen for good.
import.meta.hot?.dispose(destroyFloatingGlass);
