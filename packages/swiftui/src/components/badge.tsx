import { splitProps } from 'solid-js';
import type { HostAttributes } from '#src/host-props.ts';
import { IconSizeContext } from '#src/icons/icon-size.ts';
import { type TintColor, tint } from '#src/tint.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

const sizes = {
	small: {
		fontSize: 11,
		fontWeight: 500,
		lineHeight: '14px',
		paddingInline: 6,
		paddingBlock: 2,
		icon: 12,
	},
	medium: {
		fontSize: 13,
		fontWeight: 500,
		lineHeight: '18px',
		paddingInline: 8,
		paddingBlock: 2,
		icon: 14,
	},
} as const;

export type BadgeColor = TintColor;
export type BadgeSize = keyof typeof sizes;

export interface BadgeProps extends HostAttributes {
	/** Colour treatment. Defaults to `secondary` (soft neutral). */
	color?: BadgeColor;
	/** Badge size; the leading icon scales with it. */
	size?: BadgeSize;
}

/**
 * A small, non-interactive label for statuses, counts, tags, and categories.
 * `color` carries the meaning as a same-hue tint, colouring the text and any
 * leading icon.
 */
export function Badge(props: BadgeProps) {
	const [own, rest] = splitProps(props, ['color', 'size', 'style', 'children']);
	const size = () => sizes[own.size ?? 'small'];
	return (
		<div
			{...rest}
			style={{
				display: 'inline-flex',
				flexDirection: 'row',
				width: 'fit-content',
				flexShrink: 0,
				alignItems: 'center',
				justifyContent: 'center',
				gap: 4,
				whiteSpace: 'nowrap',
				borderRadius: styleTokens.radiusPill,
				fontSize: size().fontSize,
				fontWeight: size().fontWeight,
				lineHeight: size().lineHeight,
				paddingInline: size().paddingInline,
				paddingBlock: size().paddingBlock,
				...tint(own.color ?? 'secondary'),
				...own.style,
			}}
		>
			<IconSizeContext.Provider value={() => size().icon}>
				{own.children}
			</IconSizeContext.Provider>
		</div>
	);
}
