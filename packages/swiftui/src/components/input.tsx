import type { InputProps as HostInputProps, StyleDesc } from '@ghia/solid';
import { splitProps } from 'solid-js';
import { isInvalid } from '#src/aria.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';
import { typography } from '#src/tokens/typography.ts';

const sizes = {
	small: { height: 28, paddingInline: 8, borderRadius: styleTokens.radius8 },
	medium: {
		height: 32,
		paddingInline: 12,
		borderRadius: styleTokens.radiusControl,
	},
	large: {
		height: 36,
		paddingInline: 12,
		borderRadius: styleTokens.radiusControl,
	},
} as const;

export type InputVariant = 'default' | 'filled';
export type InputSize = keyof typeof sizes;

export interface InputProps extends Omit<HostInputProps, 'style'> {
	/** Bordered transparent fill, or subtle filled chrome. */
	variant?: InputVariant;
	/** Control height (28 / 32 / 36px) and corner radius. */
	size?: InputSize;
	/** Called with the text after every edit; `onChange` carries the same as an event. */
	onValueChange?: (value: string) => void;
	style?: StyleDesc;
}

function variantStyle(variant: InputVariant): StyleDesc {
	switch (variant) {
		case 'default':
			return {
				borderColor: semanticColors.borderField,
				backgroundColor: 'transparent',
				focusVisible: { borderColor: colors.fg40 },
			};
		case 'filled':
			return {
				borderColor: 'transparent',
				backgroundColor: semanticColors.surfaceControlSubtle,
				focusVisible: { backgroundColor: semanticColors.surfaceControl },
			};
	}
}

/**
 * A single-line text input for short freeform values. A thin styled wrapper
 * over ghia's `<input>`: every `<input>` prop and event works unchanged.
 */
export function Input(props: InputProps) {
	const [own, rest] = splitProps(props, [
		'variant',
		'size',
		'onValueChange',
		'onChange',
		'style',
	]);
	return (
		<input
			{...rest}
			onChange={(event) => {
				own.onChange?.(event);
				own.onValueChange?.(event.value);
			}}
			// `textMuted` is the native colour of a disabled field's text; the opacity below already dims it.
			theme={{
				caret: semanticColors.textPrimary,
				textMuted: semanticColors.textPrimary,
				...rest.theme,
			}}
			style={{
				display: 'flex',
				width: '100%',
				minWidth: 0,
				...typography.variants.regular,
				color: semanticColors.textPrimary,
				selectionColor: colors.selection40,
				borderWidth: 1,
				borderStyle: 'solid',
				keyboardFocusDim: false,
				...sizes[own.size ?? 'medium'],
				...variantStyle(own.variant ?? 'default'),
				...(isInvalid(rest['aria-invalid'])
					? {
							borderColor: colors.supportRed40,
							outline: `3px solid ${colors.supportRed20}`,
						}
					: {}),
				disabled: { opacity: 0.5, cursor: 'not-allowed' },
				...own.style,
			}}
		/>
	);
}
