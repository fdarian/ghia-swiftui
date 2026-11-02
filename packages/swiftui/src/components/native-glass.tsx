import type { StyleDesc } from '@ghia/solid';
import { createEffect, createSignal, Show, splitProps } from 'solid-js';
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
	 * A `box-shadow` for the glass, drawn on an element of its own under it:
	 * a shadow on the glass's box is not painted, and one on a blurred
	 * fallback is cut square at its edge. The element fills the nearest
	 * positioned ancestor, so give the glass a `position: relative` box of its
	 * size. It appears with the glass, never before it.
	 */
	shadow?: string;
}

/** Overrides that stop the box painting anything of its own. */
const hiddenPaint: StyleDesc = {
	backgroundColor: 'transparent',
	backgroundImage: 'none',
	borderColor: 'transparent',
	outlineColor: 'transparent',
	boxShadow: 'none',
};

/**
 * A box whose background is a real `NSGlassEffectView`, which samples what is
 * painted beneath it in the window (GPUI's own content included) and refracts
 * it. Children paint above the glass, and a `NativeGlass` among them is a
 * layer of its own above this one.
 *
 * Glass is only present when this macOS has the class and the window is on a
 * screen; otherwise the box wears the `fallback` material, so a surface never
 * renders empty. While real glass is expected but the view has not attached
 * (ghia calls `onAttach` after the first frame that shows the surface) the box
 * paints nothing and its children are invisible: no fallback look is ever
 * shown first. The glass view is added in `onAttach` and the children and
 * shadow shown in the same tick; ghia draws them a frame later, so the glass
 * is up first (measured on the select popup, never the other way round). A
 * reveal timed to the layout pass that shows the children instead put the
 * children on screen without glass in some frames, and did so on every page
 * switch. A failure to create the view throws from `onAttach` (reported like
 * any handler's) and leaves the box empty.
 *
 * No ancestor of a `NativeGlass` (nor the element itself) may have `opacity`,
 * animated or static: it becomes an effect group that is drawn before the
 * glass layer, so the children are refracted (blurred text) and the group's
 * bounds cut the shadow square. Enter and leave with `y` and `scale`; dim a
 * disabled glass by putting the opacity on its children.
 *
 * The children sit in a `display: contents` wrapper that holds the
 * `visibility` of that first frame, so it is neither on the glass nor above
 * it (see above) and has no box: the children lay out as direct children of
 * the glass. (`opacity` on a `display: contents` element hides nothing.)
 * The box's own paint (an outline, a fill) is overridden to transparent
 * meanwhile. `visibility: hidden` on the glass itself would hide its surface
 * and `onAttach` would never come.
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
	const shadow = () => (
		<Show when={own.shadow} keyed>
			{(boxShadow: string) => (
				<div
					style={{
						position: 'absolute',
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
						borderRadius: own.radius,
						boxShadow,
						pointerEvents: 'none',
					}}
				/>
			)}
		</Show>
	);

	if (!nativeGlassAvailable()) {
		return (
			<>
				{shadow()}
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
			</>
		);
	}

	const [handle, setHandle] = createSignal<NativeGlassHandle>();
	const [offscreen, setOffscreen] = createSignal(false);
	let attached: NativeGlassHandle | undefined;
	/** Real glass is expected and has not attached: nothing of the surface may show. */
	const waiting = () => handle() === undefined && !offscreen();

	createEffect(() => {
		const current = handle();
		if (current !== undefined) current.update(options());
	});

	return (
		<>
			<Show when={!waiting()}>{shadow()}</Show>
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
					...own.style,
					// The caller's own paint (an outline, a fill) is part of the surface too.
					...(waiting() ? hiddenPaint : {}),
				}}
			>
				<div
					style={{
						display: 'contents',
						visibility: waiting() ? 'hidden' : 'visible',
					}}
				>
					{own.children}
				</div>
			</nativeview>
		</>
	);
}
