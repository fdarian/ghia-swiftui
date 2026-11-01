import { splitProps } from 'solid-js';
import { NativeGlass } from '#src/components/native-glass.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import type { NativeGlassVariant } from '#src/native-glass.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

export interface GlassPanelProps extends HostAttributes {
	/** A colour laid over the glass; its alpha is the strength. */
	tint?: string;
	/** `clear` is the see-through glass of media controls; `regular` (the default) the standard one. */
	variant?: NativeGlassVariant;
	/** Corner radius in px. Defaults to the popover radius. */
	radius?: number;
}

/**
 * A floating surface made of the glass material: the backing for chrome that
 * hovers over content (an action bar, a menu) instead of sitting in the
 * layout. Like `Button`'s `glass` variant it carries no fill of its own; the
 * material is the background, and its padding is what separates the panel's
 * edge from the controls inside it.
 *
 * On macOS 26 and later the material is a real `NSGlassEffectView`; elsewhere
 * (and in an offscreen test window, and for glass inside another glass) it is
 * a tint over a backdrop blur. See `NativeGlass`.
 *
 * No shadow, deliberately: the panel is meant to read as a capsule flush with
 * the surface behind it. A popup that has to separate itself from content
 * underneath adds `style.shadowPopover` itself.
 */
export function GlassPanel(props: GlassPanelProps) {
	const [own, rest] = splitProps(props, [
		'tint',
		'variant',
		'radius',
		'style',
		'children',
	]);
	return (
		<NativeGlass
			{...rest}
			tint={own.tint}
			variant={own.variant}
			radius={own.radius ?? styleTokens.radiusPopover}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 4,
				padding: 4,
				...own.style,
			}}
		>
			{own.children}
		</NativeGlass>
	);
}
