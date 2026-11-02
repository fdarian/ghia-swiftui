import {
	assertMainThread,
	objcClass,
	type Pointer,
	readRect,
	required,
	requiredClass,
	selector,
	send,
} from '#src/objc.ts';
import { parse } from '#src/tokens/color-math.ts';

/** `-[NSView setAutoresizingMask:]`: NSViewWidthSizable | NSViewHeightSizable. */
const FILL = 18;
const STYLE_REGULAR = 0;
const STYLE_CLEAR = 1;
const VARIANT_SIDEBAR = 17;

/** `sidebar` is the private glass variant AppKit gives a `NavigationSplitView` sidebar; where this macOS does not have it, it is `regular`. */
export type NativeGlassVariant = 'regular' | 'clear' | 'sidebar';

export interface NativeGlassOptions {
	variant: NativeGlassVariant;
	/** sRGB components 0 to 1. Alpha 0 means no tint. */
	tint: { red: number; green: number; blue: number; alpha: number };
	cornerRadius: number;
}

export interface NativeGlassHandle {
	update(options: NativeGlassOptions): void;
	/** Removes the view. Call from `onDetach`; the handle is dead afterwards. */
	detach(): void;
}

/** Whether this macOS has NSGlassEffectView (26 and later). */
export function nativeGlassAvailable(): boolean {
	return objcClass('NSGlassEffectView') !== null;
}

/** The `bigint` address `<nativeview onAttach>` hands over, as an FFI pointer: addresses fit a double exactly. */
function asPointer(address: bigint): Pointer {
	if (address === 0n) throw new Error('The nativeview content view is nil');
	return Number(address) as unknown as Pointer;
}

type NativeGlassTint = NativeGlassOptions['tint'];

/** A CSS colour as a tint: its alpha is the strength, and `undefined` is no tint. */
export function tintFromColor(color: string | undefined): NativeGlassTint {
	if (color === undefined) return { red: 0, green: 0, blue: 0, alpha: 0 };
	const parsed = parse(color);
	return {
		red: parsed.red / 255,
		green: parsed.green / 255,
		blue: parsed.blue / 255,
		alpha: parsed.alpha,
	};
}

function srgbColor(tint: NativeGlassTint): Pointer | null {
	if (tint.alpha === 0) return null;
	return required(
		send.objectWithFourDoubles(
			requiredClass('NSColor'),
			selector('colorWithSRGBRed:green:blue:alpha:'),
			tint.red,
			tint.green,
			tint.blue,
			tint.alpha,
		),
		'colorWithSRGBRed:green:blue:alpha:',
	);
}

/** `-[NSGlassEffectView set_variant:]` is private: sent only to a view that answers it. */
function setPrivateVariant(glass: Pointer, variant: number) {
	const setter = selector('set_variant:');
	if (!send.boolWithObject(glass, selector('respondsToSelector:'), setter))
		return;
	send.voidWithInteger(glass, setter, variant);
}

/**
 * Sets the style and tint of an `NSGlassEffectView` the caller owns, for glass
 * that is not an `attachNativeGlass` handle. Alpha 0 clears the tint.
 */
export function setGlassLook(
	glass: Pointer,
	style: 'regular' | 'clear',
	tint: NativeGlassTint,
) {
	send.voidWithInteger(
		glass,
		selector('setStyle:'),
		style === 'clear' ? STYLE_CLEAR : STYLE_REGULAR,
	);
	// A nil colour clears the tint.
	send.voidWithObject(glass, selector('setTintColor:'), srgbColor(tint));
}

function apply(glass: Pointer, options: NativeGlassOptions) {
	setGlassLook(
		glass,
		options.variant === 'clear' ? 'clear' : 'regular',
		options.tint,
	);
	if (options.variant === 'sidebar') setPrivateVariant(glass, VARIANT_SIDEBAR);
	send.voidWithDouble(
		glass,
		selector('setCornerRadius:'),
		options.cornerRadius,
	);
}

/**
 * Whether the window holding `content` is on a screen. The offscreen window of
 * `createTestRoot` is not (AppKit gives it no `screen`): there a glass view
 * would be real but never in a capture, so the caller keeps its fallback look.
 */
export function contentIsOnScreen(content: bigint): boolean {
	const window = send.object(asPointer(content), selector('window'));
	if (window === null) return false;
	return send.object(window, selector('screen')) !== null;
}

/**
 * Adds an NSGlassEffectView filling `content` (the address `<nativeview
 * onAttach>` hands over). Must run on the main thread, inside `onAttach`.
 */
export function attachNativeGlass(
	content: bigint,
	options: NativeGlassOptions,
): NativeGlassHandle {
	assertMainThread('attachNativeGlass');
	const contentView = asPointer(content);
	const bounds = readRect(contentView, 'bounds');
	const glass = required(
		send.objectWithFourDoubles(
			required(
				send.object(requiredClass('NSGlassEffectView'), selector('alloc')),
				'+[NSGlassEffectView alloc]',
			),
			selector('initWithFrame:'),
			bounds[0] as number,
			bounds[1] as number,
			bounds[2] as number,
			bounds[3] as number,
		),
		'-[NSGlassEffectView initWithFrame:]',
	);
	send.voidWithInteger(glass, selector('setAutoresizingMask:'), FILL);
	apply(glass, options);
	send.voidWithObject(contentView, selector('addSubview:'), glass);
	// The content view owns it now.
	send.void(glass, selector('release'));

	let alive = true;
	return {
		update(next) {
			if (!alive) throw new Error('The glass view was detached');
			apply(glass, next);
		},
		detach() {
			if (!alive) throw new Error('The glass view was already detached');
			alive = false;
			send.void(glass, selector('removeFromSuperview'));
		},
	};
}
