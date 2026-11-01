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

/** `-[NSView setAutoresizingMask:]`: NSViewWidthSizable | NSViewHeightSizable. */
const FILL = 18;
const STYLE_REGULAR = 0;
const STYLE_CLEAR = 1;

export type NativeGlassVariant = 'regular' | 'clear';

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

function srgbColor(tint: NativeGlassOptions['tint']): Pointer | null {
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

function apply(glass: Pointer, options: NativeGlassOptions) {
	send.voidWithInteger(
		glass,
		selector('setStyle:'),
		options.variant === 'clear' ? STYLE_CLEAR : STYLE_REGULAR,
	);
	send.voidWithDouble(
		glass,
		selector('setCornerRadius:'),
		options.cornerRadius,
	);
	// A nil colour clears the tint.
	send.voidWithObject(
		glass,
		selector('setTintColor:'),
		srgbColor(options.tint),
	);
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
	const contentView = required(
		Number(content) as unknown as Pointer,
		'the nativeview content view',
	);
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
