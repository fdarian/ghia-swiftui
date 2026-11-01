import { splitProps } from 'solid-js';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

export type GlassPanelProps = HostAttributes;

/**
 * A floating surface made of the glass material: the backing for chrome that
 * hovers over content (an action bar, a menu) instead of sitting in the
 * layout. Like `Button`'s `glass` variant it carries no fill of its own; the
 * material is the background, and its padding is what separates the panel's
 * edge from the controls inside it.
 *
 * No shadow, deliberately: the panel is meant to read as a capsule flush with
 * the surface behind it. A popup that has to separate itself from content
 * underneath adds `style.shadowPopover` itself.
 */
export function GlassPanel(props: GlassPanelProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 4,
				padding: 4,
				borderRadius: styleTokens.radiusPopover,
				...glass.material(),
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}
