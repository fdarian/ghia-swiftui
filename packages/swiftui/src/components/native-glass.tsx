import type { StyleDesc } from '@ghia/solid';
import { createEffect, createSignal, splitProps } from 'solid-js';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import {
	attachNativeGlass,
	contentIsOnScreen,
	type NativeGlassHandle,
	type NativeGlassVariant,
	nativeGlassAvailable,
} from '#src/native-glass.ts';
import { parse } from '#src/tokens/color-math.ts';

export interface NativeGlassProps extends HostAttributes {
	/** A colour laid over the glass; its alpha is the strength. No tint by default. */
	tint?: string;
	/** `clear` is the see-through glass of media controls; `regular` the standard one. */
	variant?: NativeGlassVariant;
	/** Corner radius in px, given to the glass view and the box's background. */
	radius: number;
	/**
	 * The look while there is no real glass: macOS before 26, an offscreen test
	 * window, or the frame before the view is attached. Defaults
	 * to the in-window material (`glass.material()`, or `glass.tinted(tint)`).
	 */
	fallback?: StyleDesc;
}

function tintComponents(tint: string | undefined) {
	if (tint === undefined) return { red: 0, green: 0, blue: 0, alpha: 0 };
	const color = parse(tint);
	return {
		red: color.red / 255,
		green: color.green / 255,
		blue: color.blue / 255,
		alpha: color.alpha,
	};
}

/**
 * A box whose background is a real `NSGlassEffectView`, which samples what is
 * painted beneath it in the window (GPUI's own content included) and refracts
 * it. Children paint above the glass, and a `NativeGlass` among them is a
 * layer of its own above this one.
 *
 * Glass is only present when this macOS has the class and the window is on a
 * screen; otherwise the box wears the `fallback` material, so a surface never
 * renders empty. A failure to create the view throws from `onAttach` (reported
 * like any handler's) and leaves the fallback in place.
 *
 * No ancestor of a `NativeGlass` (nor the element itself) may have `opacity`,
 * animated or static: it becomes an effect group that is drawn before the
 * glass layer, so the children are refracted (blurred text) and the group's
 * bounds cut the shadow square. Enter and leave with `y` and `scale`; dim a
 * disabled glass by putting the opacity on its children.
 *
 * `overflow` is `visible` so the glass's own shadow and edge highlight are not
 * masked; pass `overflow: 'hidden'` in `style` to clip children to the shape.
 */
export function NativeGlass(props: NativeGlassProps) {
	const [own, rest] = splitProps(props, [
		'tint',
		'variant',
		'radius',
		'fallback',
		'style',
		'children',
	]);
	const fallback = () =>
		own.fallback ??
		(own.tint === undefined ? glass.material() : glass.tinted(own.tint));
	const options = () => ({
		variant: own.variant ?? 'regular',
		tint: tintComponents(own.tint),
		cornerRadius: own.radius,
	});

	if (!nativeGlassAvailable()) {
		return (
			<div
				{...rest}
				style={{
					borderRadius: own.radius,
					overflow: 'visible',
					...fallback(),
					...own.style,
				}}
			>
				{own.children}
			</div>
		);
	}

	const [handle, setHandle] = createSignal<NativeGlassHandle>();
	let attached: NativeGlassHandle | undefined;

	createEffect(() => {
		const current = handle();
		if (current !== undefined) current.update(options());
	});

	return (
		<nativeview
			{...rest}
			onAttach={(view) => {
				if (!contentIsOnScreen(view)) return;
				attached = attachNativeGlass(view, options());
				setHandle(attached);
			}}
			// Touches only the view: a call back into ghia from here fails.
			onDetach={() => {
				attached?.detach();
				attached = undefined;
			}}
			style={{
				borderRadius: own.radius,
				overflow: 'visible',
				...(handle() === undefined ? fallback() : {}),
				...own.style,
			}}
		>
			{own.children}
		</nativeview>
	);
}
