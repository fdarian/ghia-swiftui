import {
	type ButtonBehavior,
	buttonProps,
	type HostElement,
	type StyleDesc,
	useGpuixRequired,
} from '@ghia/solid';
import { createSignal, type JSX, mergeProps, Show, splitProps } from 'solid-js';
import { useButtonDefaults } from '#src/components/button-defaults-context.tsx';
import { useFieldDisabled } from '#src/components/field-disabled-context.ts';
import { NativeGlass } from '#src/components/native-glass.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { IconSizeContext } from '#src/icons/icon-size.ts';
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

/**
 * SwiftUI's `.controlSize` on macOS 26, measured from the reference app:
 * `small`/`medium`/`large` are `.small`/`.regular`/`.large`. `lineHeight` is the
 * label's own height, the whole of a `transparent` (`.borderless`) button;
 * `iconOnlyWidth` the width of a `.bordered`/`.glass` button around one glyph;
 * `rounded` the corner radius of its rounded rectangle, `shape` the one it has
 * unless `radius` says otherwise. `toolbar` is not a control size: it is the
 * platter macOS draws behind a toolbar item, 36 tall whatever the control size.
 */
const sizes = {
	small: {
		height: 20,
		lineHeight: 14,
		paddingInline: 10,
		iconOnlyWidth: 33,
		gap: 8,
		icon: 12,
		fontSize: 11,
		rounded: 5,
		shape: 'rounded',
	},
	medium: {
		height: 24,
		lineHeight: 16,
		paddingInline: 12,
		iconOnlyWidth: 39,
		gap: 9,
		icon: 14,
		fontSize: 13,
		rounded: 6,
		shape: 'rounded',
	},
	large: {
		height: 28,
		lineHeight: 16,
		paddingInline: 14,
		iconOnlyWidth: 43,
		gap: 9,
		icon: 14,
		fontSize: 13,
		rounded: 7,
		shape: 'full',
	},
	toolbar: {
		height: 36,
		lineHeight: 18,
		paddingInline: 12,
		iconOnlyWidth: 36,
		gap: 6,
		icon: 20,
		fontSize: 13,
		rounded: styleTokens.radiusControl,
		shape: 'full',
	},
} as const;

export type ButtonSize = keyof typeof sizes;
export type ButtonRadius = 'full' | 'rounded';

/**
 * The fill of `glass`, laid over the glass: its hover and press states are
 * translucent fills on top of the material, as syne composites them over it.
 */
function glassFill(): StyleDesc {
	return {
		hover: { backgroundColor: semanticColors.surfaceControlSubtle },
		active: { backgroundColor: semanticColors.surfaceControl },
	};
}

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
				active: { backgroundColor: semanticColors.surfaceControlActive },
			};
		case 'muted':
			return {
				backgroundColor: semanticColors.surfaceControlSubtle,
				color: semanticColors.textPrimary,
				active: { backgroundColor: semanticColors.surfaceControl },
			};
		case 'glass':
			return { color: semanticColors.textPrimary };
		case 'glassAccent':
			return { color: semanticColors.accentContrast };
		case 'transparent':
			return {
				backgroundColor: 'transparent',
				color: semanticColors.textPrimary,
				active: { opacity: 0.55 },
			};
	}
}

export interface ButtonProps
	extends Omit<HostAttributes, keyof ButtonBehavior>,
		ButtonBehavior {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** Sized for a single icon, with no text padding: a SwiftUI icon-only button is wider than tall, except `transparent`, which is the bare icon. */
	iconOnly?: boolean;
	/** Overrides the shape of the size: `full` = capsule, `rounded` = the size's rounded rectangle. Default: rounded on `small` and `medium`, capsule on `large`, as SwiftUI draws them. */
	radius?: ButtonRadius;
	children?: JSX.Element;
}

/** A native macOS-style button for triggering actions. */
export function Button(props: ButtonProps) {
	const renderer = useGpuixRequired();
	const defaults = useButtonDefaults();
	const fieldDisabled = useFieldDisabled();
	const [ownBehavior, own, rest] = splitProps(
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
	const behavior = mergeProps(ownBehavior, {
		get disabled() {
			return ownBehavior.disabled === true || fieldDisabled();
		},
	});
	const variant = () => own.variant ?? defaults.variant ?? 'filled';
	const isGlass = () => variant() === 'glass' || variant() === 'glassAccent';
	const [hovered, setHovered] = createSignal(false);
	// A pressed button is a hovered one, so `.glassProminent`'s pressed tint needs no state of its own.
	const glassTint = () => {
		if (variant() !== 'glassAccent') return undefined;
		return hovered() ? semanticColors.accentHover : colors.accent;
	};
	const sizeName = () => own.size ?? defaults.size ?? 'medium';
	const size = () => sizes[sizeName()];
	// A `transparent` button has no chrome: its box is the label.
	const bare = () => variant() === 'transparent';
	const height = () => (bare() ? size().lineHeight : size().height);
	const width = () => (bare() ? size().icon : size().iconOnlyWidth);
	const radius = () => {
		const shape = own.radius ?? defaults.radius ?? size().shape;
		return shape === 'full' ? styleTokens.radiusPill : size().rounded;
	};
	// The glass view is given the radius in px: a pill is half the height.
	const glassRadius = () =>
		radius() === styleTokens.radiusPill ? height() / 2 : radius();
	const register = (element: HostElement) => {
		buttonElements.add(element);
		own.ref?.(element);
	};
	const tabIndex = () =>
		behavior.disabled === true && behavior.focusableWhenDisabled !== true
			? -1
			: (behavior.tabIndex ?? 0);
	const style = (): StyleDesc => ({
		display: 'inline-flex',
		flexDirection: 'row',
		flexShrink: 0,
		alignItems: 'center',
		justifyContent: 'center',
		whiteSpace: 'nowrap',
		// A glass button keeps overflow visible: clipping would cut the glass's own shadow and edge highlight.
		...(isGlass() ? {} : { overflow: 'hidden' }),
		fontSize: size().fontSize,
		fontWeight: 400,
		lineHeight: `${size().lineHeight}px`,
		borderWidth: 0,
		// The glass view fills the padding box.
		...(isGlass() ? { position: 'relative' } : {}),
		cursor: 'default',
		// A button in a drag region (a toolbar) cuts its own box out of it, as syne's `deep` drag region does.
		appRegion: 'no-drag',
		keyboardFocusDim: false,
		focusVisible: {
			boxShadow: `0 0 0 1px ${semanticColors.borderPrimary}`,
		},
		height: height(),
		gap: size().gap,
		...(own.iconOnly === true
			? { width: width(), paddingInline: 0 }
			: { paddingInline: bare() ? 0 : size().paddingInline }),
		borderRadius: radius(),
		...variantStyle(variant()),
		// A glass button dims only its content; the glass keeps its strength.
		...(behavior.disabled === true
			? isGlass()
				? { pointerEvents: 'none' }
				: { pointerEvents: 'none', opacity: 0.5 }
			: {}),
		...own.style,
	});
	const content = () => (
		<IconSizeContext.Provider value={() => size().icon}>
			{own.children}
		</IconSizeContext.Provider>
	);
	return (
		<Show
			when={isGlass()}
			fallback={
				<div
					{...rest}
					{...buttonProps(behavior, renderer)}
					ref={register}
					tabIndex={tabIndex()}
					style={style()}
				>
					{content()}
				</div>
			}
		>
			<NativeGlass
				{...rest}
				{...buttonProps(behavior, renderer)}
				ref={register}
				tabIndex={tabIndex()}
				radius={glassRadius()}
				tint={glassTint()}
				style={style()}
				onMouseEnter={(event) => {
					setHovered(true);
					rest.onMouseEnter?.(event);
				}}
				onMouseLeave={(event) => {
					setHovered(false);
					rest.onMouseLeave?.(event);
				}}
			>
				<Show when={variant() === 'glass'}>
					<div
						aria-hidden
						style={{
							position: 'absolute',
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							borderRadius: glassRadius(),
							...glassFill(),
						}}
					/>
				</Show>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						gap: size().gap,
						...(behavior.disabled === true ? { opacity: 0.5 } : {}),
					}}
				>
					{content()}
				</div>
			</NativeGlass>
		</Show>
	);
}
