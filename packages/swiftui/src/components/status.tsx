import { defineKeyframes } from '@ghia/solid';
import { splitProps } from 'solid-js';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import { IconSizeContext } from '#src/icons/icon-size.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

defineKeyframes('swiftui-status-pulse', {
	'0%': { opacity: 1 },
	'50%': { opacity: 0.4 },
	'100%': { opacity: 1 },
});

export type StatusVariant =
	| 'neutral'
	| 'loading'
	| 'error'
	| 'warning'
	| 'success';

function dotColor(variant: StatusVariant): string {
	switch (variant) {
		case 'neutral':
			return colors.fg20;
		case 'loading':
			return colors.fg40;
		case 'error':
			return colors.red;
		case 'warning':
			return colors.orange;
		case 'success':
			return colors.green;
	}
}

export interface StatusProps extends HostAttributes {
	/** State to display; sets the dot colour and animation. */
	variant?: StatusVariant;
}

/**
 * A small pill communicating the current state of an item (loading, success,
 * error, warning, or neutral) via a coloured leading dot. The dot colour is
 * fixed per variant and cannot be overridden.
 */
export function Status(props: StatusProps) {
	const [own, rest] = splitProps(props, ['variant', 'style', 'children']);
	const variant = () => own.variant ?? 'loading';
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
				overflow: 'hidden',
				borderRadius: styleTokens.radiusPill,
				borderWidth: 1,
				borderStyle: 'solid',
				borderColor: semanticColors.borderTertiary,
				...glass.tinted(semanticColors.surfaceControl),
				fontSize: 11,
				fontWeight: 500,
				lineHeight: '14px',
				paddingInline: 8,
				paddingBlock: 2,
				color: semanticColors.textPrimary,
				...own.style,
			}}
		>
			<div
				style={{
					width: 10,
					height: 10,
					borderRadius: styleTokens.radiusFull,
					flexShrink: 0,
					backgroundColor: dotColor(variant()),
					...(variant() === 'loading'
						? { animation: 'swiftui-status-pulse 2s ease-in-out infinite' }
						: {}),
				}}
			/>
			<IconSizeContext.Provider value={() => 12}>
				{own.children}
			</IconSizeContext.Provider>
		</div>
	);
}
