import type { StyleDesc } from '@ghia/solid';
import { over } from '#src/tokens/color-math.ts';
import { colorScheme } from '#src/tokens/color-scheme.ts';
import { colors } from '#src/tokens/colors.ts';
import { style } from '#src/tokens/style.ts';

/**
 * The glass material: syne's own fallback for a window without
 * `-apple-visual-effect`, a neutral tint over a 24px backdrop blur. ghia has
 * no system material to ask for, so this is the material, not a fallback.
 * Read inside JSX props or effects, like every token.
 */
export const glass = {
	get tint() {
		return colorScheme() === 'dark' ? '#ffffff12' : '#0000000f';
	},

	/** The material alone. */
	material(): StyleDesc {
		return {
			backgroundColor: glass.tint,
			backdropFilter: `blur(${style.blurPanel}px)`,
		};
	},

	/**
	 * The toast material: syne's fallback for a window without the media-controls
	 * material, a near-opaque window fill (`bg80`) over a 36px blur, so a toast
	 * stays legible over arbitrary content.
	 */
	toast(): StyleDesc {
		return {
			backgroundColor: colors.bg80,
			backdropFilter: `blur(${style.blurPopover}px)`,
		};
	},

	/** A translucent control fill laid over the material instead of replacing it. */
	tinted(fill: string): StyleDesc {
		return {
			backgroundColor: over(fill, glass.tint),
			backdropFilter: `blur(${style.blurPanel}px)`,
		};
	},
};
