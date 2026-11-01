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

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';

/**
 * The `<anchored>` `gap` and `offset` that put a popup `sideOffset` away from
 * its anchor and `alignOffset` along it, for a layer padded by `SHADOW_PAD`.
 */
export function anchoredShift(
	side: Side,
	align: Align,
	sideOffset: number,
	alignOffset: number,
) {
	const along =
		alignOffset +
		(align === 'start' ? -SHADOW_PAD : 0) +
		(align === 'end' ? SHADOW_PAD : 0);
	const vertical = side === 'left' || side === 'right';
	return {
		gap: sideOffset - SHADOW_PAD,
		offset: vertical ? { x: 0, y: along } : { x: along, y: 0 },
	};
}
