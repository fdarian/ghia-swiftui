import { style as styleTokens } from '#src/tokens/style.ts';

/**
 * Transparent room an `<anchored>` layer keeps round its popup so the popup's
 * shadow is not cut square at the layer's edge; the placement is shifted back
 * by it.
 */
export const SHADOW_PAD = 24;

/**
 * The popup's shadow, on an element of its own: a shadow on a
 * backdrop-filtered surface is cut square at the surface's box. Put it first
 * in a `position: relative` box, under the surface.
 */
export function PopupShadow(props: { radius?: number }) {
	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				borderRadius: props.radius ?? styleTokens.radiusPopover,
				boxShadow: styleTokens.shadowPopover,
				pointerEvents: 'none',
			}}
		/>
	);
}
