import type { StyleDesc } from '@ghia/solid';
import { splitProps } from 'solid-js';
import type { HostAttributes } from '#src/host-props.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { typography } from '#src/tokens/typography.ts';

export type TextVariant = keyof typeof typography.variants;

export type TextColor =
	| 'primary'
	| 'secondary'
	| 'tertiary'
	| 'quaternary'
	| 'disabled'
	| 'link'
	| 'inherit'
	| 'accent'
	| 'red'
	| 'orange'
	| 'yellow'
	| 'green'
	| 'blue'
	| 'purple'
	| 'magenta';

type TextAlign = 'left' | 'center' | 'right';

const HEADING_LEVELS = { h1: 1, h2: 2, h3: 3, h4: 4 } as const;

export function textColor(color: TextColor): string {
	switch (color) {
		case 'primary':
			return semanticColors.textPrimary;
		case 'secondary':
			return semanticColors.textSecondary;
		case 'tertiary':
			return semanticColors.textTertiary;
		case 'quaternary':
			return semanticColors.textQuaternary;
		case 'disabled':
			return semanticColors.textDisabled;
		case 'link':
			return semanticColors.textLink;
		case 'inherit':
			return 'inherit';
		default:
			return colors[color];
	}
}

export interface TextProps extends Omit<HostAttributes, 'color'> {
	/** Size + weight pairing. */
	variant?: TextVariant;
	/** Semantic text colour (theme-derived) or a support colour. */
	color?: TextColor;
	/** Text alignment. No default, inherits from the parent. */
	align?: TextAlign;
	/** Single-line ellipsis truncation (needs a constrained width). */
	truncate?: boolean;
	/** `h1` to `h4` give the text the heading role; every other value only documents intent, as ghia has no tag to swap. */
	as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'pre';
}

const truncated: StyleDesc = {
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	whiteSpace: 'nowrap',
};

/**
 * The canonical way to render text. Prefer a `variant` + semantic `color`
 * over raw font-size/weight/colour styling.
 */
export function Text(props: TextProps) {
	const [own, rest] = splitProps(props, [
		'variant',
		'color',
		'align',
		'truncate',
		'as',
		'style',
		'children',
	]);
	const heading = () => {
		const tag = own.as;
		return tag !== undefined && tag in HEADING_LEVELS
			? HEADING_LEVELS[tag as keyof typeof HEADING_LEVELS]
			: undefined;
	};
	return (
		<text
			{...rest}
			role={heading() === undefined ? undefined : 'heading'}
			aria-level={heading()}
			style={{
				...typography.variants[own.variant ?? 'regular'],
				color: textColor(own.color ?? 'primary'),
				...(own.align === undefined ? {} : { textAlign: own.align }),
				...(own.truncate === true ? truncated : {}),
				...own.style,
			}}
		>
			{own.children}
		</text>
	);
}
