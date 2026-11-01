import {
	type ButtonBehavior,
	buttonProps,
	type StyleDesc,
	useGpuixRequired,
} from '@ghia/solid';
import { type JSX, splitProps } from 'solid-js';
import { useButtonDefaults } from '#src/components/button-defaults-context.tsx';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import { IconSizeContext } from '#src/icons/icon-size.ts';
import { over } from '#src/tokens/color-math.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

export type ButtonVariant =
	| 'accent'
	| 'destructive'
	| 'filled'
	| 'muted'
	| 'glass'
	| 'glassAccent'
	| 'transparent';

/** The root elements `Button` made, so `Field` can tell a row of buttons from other children. */
const buttonElements = new WeakSet<object>();

export function isButtonElement(node: unknown): boolean {
	return typeof node === 'object' && node !== null && buttonElements.has(node);
}

const sizes = {
	small: { height: 28, paddingInline: 8, gap: 6, icon: 16 },
	medium: { height: 32, paddingInline: 12, gap: 6, icon: 18 },
	large: { height: 36, paddingInline: 12, gap: 6, icon: 20 },
} as const;

export type ButtonSize = keyof typeof sizes;
export type ButtonRadius = 'full' | 'rounded';

/**
 * `glass` carries the material as its own background, so its hover and press
 * fills are composited over the material tint instead of replacing it.
 */
function variantStyle(variant: ButtonVariant): StyleDesc {
	switch (variant) {
		case 'accent':
			return {
				backgroundColor: colors.accent,
				color: semanticColors.accentContrast,
				active: { backgroundColor: semanticColors.accentHover },
			};
		case 'destructive':
			return {
				backgroundColor: colors.red,
				color: '#ffffff',
				active: { backgroundColor: semanticColors.redHover },
			};
		case 'filled':
			return {
				backgroundColor: semanticColors.surfaceControl,
				color: semanticColors.textPrimary,
				backdropFilter: 'blur(4px)',
				active: { backgroundColor: semanticColors.surfaceControlActive },
			};
		case 'muted':
			return {
				backgroundColor: semanticColors.surfaceControlSubtle,
				color: semanticColors.textPrimary,
				backdropFilter: 'blur(4px)',
				active: { backgroundColor: semanticColors.surfaceControl },
			};
		case 'glass':
			return {
				...glass.material(),
				color: semanticColors.textPrimary,
				hover: {
					backgroundColor: over(
						semanticColors.surfaceControlSubtle,
						glass.tint,
					),
				},
				active: {
					backgroundColor: over(semanticColors.surfaceControl, glass.tint),
				},
			};
		case 'glassAccent':
			return {
				backgroundColor: colors.accent,
				color: semanticColors.accentContrast,
				hover: { backgroundColor: semanticColors.accentHover },
				active: { backgroundColor: semanticColors.accentHover },
			};
		case 'transparent':
			return {
				backgroundColor: 'transparent',
				color: semanticColors.textPrimary,
				hover: { backgroundColor: semanticColors.surfaceControlSubtle },
			};
	}
}

export interface ButtonProps
	extends Omit<HostAttributes, keyof ButtonBehavior>,
		ButtonBehavior {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** Square button sized for a single icon, with no text padding. */
	iconOnly?: boolean;
	/** `full` = pill (default); `rounded` = control radius (softer corners on `small`). */
	radius?: ButtonRadius;
	children?: JSX.Element;
}

/** A native macOS-style button for triggering actions. */
export function Button(props: ButtonProps) {
	const renderer = useGpuixRequired();
	const defaults = useButtonDefaults();
	const [behavior, own, rest] = splitProps(
		props,
		[
			'disabled',
			'focusableWhenDisabled',
			'onClick',
			'onKeyDown',
			'onKeyUp',
			'tabIndex',
		],
		['variant', 'size', 'iconOnly', 'radius', 'style', 'children', 'ref'],
	);
	const variant = () => own.variant ?? defaults.variant ?? 'filled';
	const size = () => sizes[own.size ?? defaults.size ?? 'medium'];
	const radius = () => {
		const radius = own.radius ?? defaults.radius ?? 'full';
		if (radius === 'full') return styleTokens.radiusPill;
		return (own.size ?? defaults.size ?? 'medium') === 'small'
			? styleTokens.radius8
			: styleTokens.radiusControl;
	};
	return (
		<div
			{...rest}
			{...buttonProps(behavior, renderer)}
			ref={(element) => {
				buttonElements.add(element);
				own.ref?.(element);
			}}
			tabIndex={
				behavior.disabled === true && behavior.focusableWhenDisabled !== true
					? -1
					: (behavior.tabIndex ?? 0)
			}
			style={{
				display: 'inline-flex',
				flexDirection: 'row',
				flexShrink: 0,
				alignItems: 'center',
				justifyContent: 'center',
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				fontSize: 13,
				fontWeight: 500,
				lineHeight: '18px',
				borderWidth: 1,
				borderStyle: 'solid',
				borderColor: 'transparent',
				cursor: 'default',
				keyboardFocusDim: false,
				focusVisible: {
					boxShadow: `0 0 0 1px ${semanticColors.borderPrimary}`,
				},
				height: size().height,
				gap: size().gap,
				...(own.iconOnly === true
					? { width: size().height, paddingInline: 0 }
					: { paddingInline: size().paddingInline }),
				borderRadius: radius(),
				...variantStyle(variant()),
				...(behavior.disabled === true
					? { pointerEvents: 'none', opacity: 0.5 }
					: {}),
				...own.style,
			}}
		>
			<IconSizeContext.Provider value={() => size().icon}>
				{own.children}
			</IconSizeContext.Provider>
		</div>
	);
}
