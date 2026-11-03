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
	tintFromColor,
} from '#src/native-glass.ts';

export interface NativeGlassProps extends HostAttributes {
	/** A colour laid over the glass; its alpha is the strength. No tint by default. */
	tint?: string;
	/** `clear` is the see-through glass of media controls; `regular` the standard one; `sidebar` the paler, frosted one of a system sidebar (private API, `regular` where missing). */
	variant?: NativeGlassVariant;
	/** Corner radius in px, given to the glass view and the box's background. */
	radius: number;
	/**
	 * The look while there is no real glass: macOS before 26 or an offscreen
	 * test window. Defaults to the in-window material (`glass.material()`, or
	 * `glass.tinted(tint)`).
	 */
	fallback?: StyleDesc;
	/**
	 * A `box-shadow` on the glass's box, the real glass and the fallback alike.
	 * A `boxShadow` in `style` overrides it.
	 */
	shadow?: string;
}

/**
 * A box whose background is a real `NSGlassEffectView`, which samples what is
 * painted beneath it in the window (GPUI's own content included) and refracts
 * it. Children paint above the glass from the first frame, and a `NativeGlass`
 * among them is a layer of its own above this one.
 *
 * Glass is only present when this macOS has the class and the window is on a
 * screen; otherwise the box wears the `fallback` material, so a surface never
 * renders empty. `onAttach` decides which: it runs mid-frame, so it touches
 * only the view and Solid state. A failure to create the view throws from
 * `onAttach` (reported like any handler's).
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
		'shadow',
		'style',
		'children',
	]);
	const fallback = () =>
		own.fallback ??
		(own.tint === undefined ? glass.material() : glass.tinted(own.tint));
	const options = () => ({
		variant: own.variant ?? 'regular',
		tint: tintFromColor(own.tint),
		cornerRadius: own.radius,
	});
	const shadow = (): StyleDesc =>
		own.shadow === undefined ? {} : { boxShadow: own.shadow };

	if (!nativeGlassAvailable()) {
		return (
			<div
				{...rest}
				style={{
					borderRadius: own.radius,
					overflow: 'visible',
					...fallback(),
					...shadow(),
					...own.style,
				}}
			>
				{own.children}
			</div>
		);
	}

	const [handle, setHandle] = createSignal<NativeGlassHandle>();
	const [offscreen, setOffscreen] = createSignal(false);
	let attached: NativeGlassHandle | undefined;

	createEffect(() => {
		const current = handle();
		if (current !== undefined) current.update(options());
	});

	return (
		<nativeview
			{...rest}
			onAttach={(view) => {
				if (!contentIsOnScreen(view)) {
					setOffscreen(true);
					return;
				}
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
				...(offscreen() ? fallback() : {}),
				...shadow(),
				...own.style,
			}}
		>
			{own.children}
		</nativeview>
	);
}
