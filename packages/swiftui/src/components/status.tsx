import { defineKeyframes } from '@ghia/solid';
import { splitProps } from 'solid-js';
import { NativeGlass } from '#src/components/native-glass.tsx';
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

const LINE_HEIGHT = 14;
const PADDING_BLOCK = 3;
/** A pill is half its height; the glass view takes the radius in px. */
const RADIUS = (LINE_HEIGHT + 2 * PADDING_BLOCK) / 2;

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
		<NativeGlass
			{...rest}
			radius={RADIUS}
			tint={semanticColors.surfaceControl}
			style={{
				display: 'inline-flex',
				flexDirection: 'row',
				width: 'fit-content',
				flexShrink: 0,
				alignItems: 'center',
				justifyContent: 'center',
				gap: 4,
				whiteSpace: 'nowrap',
				borderRadius: RADIUS,
				fontSize: 11,
				fontWeight: 500,
				lineHeight: `${LINE_HEIGHT}px`,
				paddingInline: 9,
				paddingBlock: PADDING_BLOCK,
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
		</NativeGlass>
	);
}
