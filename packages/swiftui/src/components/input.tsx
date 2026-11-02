import {
	type InputProps as HostInputProps,
	motion,
	type StyleDesc,
} from '@ghia/solid';
import { children, createSignal, type JSX, Show, splitProps } from 'solid-js';
import { isInvalid } from '#src/aria.ts';
import { useFieldDisabled } from '#src/components/field-disabled-context.ts';
import { NativeGlass } from '#src/components/native-glass.tsx';
import { withAlpha } from '#src/tokens/color-math.ts';
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

export type InputVariant = 'default' | 'filled' | 'glass';
export type InputSize = keyof typeof sizes;

export interface InputProps extends Omit<HostInputProps, 'style'> {
	/**
	 * Bordered transparent fill, subtle filled chrome, or a real-glass pill (a
	 * search field's) that wiggles and rings in the accent colour on focus.
	 * A glass input's `style` goes on its outer box (width, margin), not on
	 * the text field inside.
	 */
	variant?: InputVariant;
	/** Glass variant only: content before the text, such as a magnifier `Icon`. */
	leading?: JSX.Element;
	/** Control height (28 / 32 / 36px) and corner radius. */
	size?: InputSize;
	/** Called with the text after every edit; `onChange` carries the same as an event. */
	onValueChange?: (value: string) => void;
	style?: StyleDesc;
}

/** The focus ring's spread and alpha as it appears, and as it settles (Apple Mail's search field). */
const RING_START = { spread: 14, alpha: 0.06 };
const RING_END = { spread: 3, alpha: 0.6 };
const RING_DELAY = 0.075;
const RING_DURATION = 0.245;
const WIGGLE_SCALE = 1.008;
const WIGGLE_DURATION = 0.2;
const GLASS_PADDING = 14;
const GLASS_GAP = 8;

function variantStyle(variant: Exclude<InputVariant, 'glass'>): StyleDesc {
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
		'leading',
		'onValueChange',
		'onChange',
		'onFocus',
		'onBlur',
		'style',
	]);
	const fieldDisabled = useFieldDisabled();
	const disabled = () => rest.disabled === true || fieldDisabled();
	const [focused, setFocused] = createSignal(false);
	const isGlass = () => own.variant === 'glass';
	const glassRadius = () => sizes[own.size ?? 'medium'].height / 2;
	const variant = () => {
		const chosen = own.variant ?? 'default';
		return chosen === 'glass' ? undefined : chosen;
	};
	const field = () => (
		<input
			{...rest}
			disabled={disabled()}
			onChange={(event) => {
				own.onChange?.(event);
				own.onValueChange?.(event.value);
			}}
			onFocus={(event) => {
				setFocused(true);
				own.onFocus?.(event);
			}}
			onBlur={(event) => {
				setFocused(false);
				own.onBlur?.(event);
			}}
			// `textMuted` is the native colour of a disabled field's text; the opacity below already dims it.
			theme={{
				caret: isGlass() ? colors.accent : semanticColors.textPrimary,
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
				keyboardFocusDim: false,
				disabled: { opacity: 0.5, cursor: 'not-allowed' },
				...(isGlass()
					? {
							flexGrow: 1,
							flexShrink: 1,
							width: 'auto',
							height: sizes[own.size ?? 'medium'].height,
							borderWidth: 0,
							backgroundColor: 'transparent',
						}
					: {
							borderWidth: 1,
							borderStyle: 'solid',
							...sizes[own.size ?? 'medium'],
							...variantStyle(variant() ?? 'default'),
							...(isInvalid(rest['aria-invalid'])
								? {
										borderColor: colors.supportRed40,
										outline: `3px solid ${colors.supportRed20}`,
									}
								: {}),
						}),
				...(isGlass() ? {} : own.style),
			}}
		/>
	);
	return (
		<Show when={isGlass()} fallback={field()}>
			<GlassShell
				radius={glassRadius()}
				height={sizes[own.size ?? 'medium'].height}
				focused={focused()}
				disabled={disabled()}
				leading={own.leading}
				style={own.style}
				field={field}
			/>
		</Show>
	);
}

function GlassShell(props: {
	radius: number;
	height: number;
	focused: boolean;
	disabled: boolean;
	leading: JSX.Element;
	style: StyleDesc | undefined;
	field: () => JSX.Element;
}) {
	// Resolved once, outside `motion.div`'s own tracking: its `animate` follows
	// `focused`, and children built inside it would be rebuilt on every focus
	// change, taking focus from the field.
	const content = children(() => (
		<>
			<NativeGlass
				radius={props.radius}
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					width: '100%',
					height: props.height,
					paddingInline: GLASS_PADDING,
					gap: GLASS_GAP,
				}}
			>
				<Show when={props.leading !== undefined}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							flexShrink: 0,
							color: semanticColors.textSecondary,
							...(props.disabled ? { opacity: 0.5 } : {}),
						}}
					>
						{props.leading}
					</div>
				</Show>
				{props.field()}
			</NativeGlass>
			<Show when={props.focused}>
				<FocusRing radius={props.radius} />
			</Show>
		</>
	));
	return (
		<motion.div
			animate={{ scale: props.focused ? [1, WIGGLE_SCALE, 1] : 1 }}
			transition={
				props.focused
					? {
							scale: {
								duration: WIGGLE_DURATION,
								times: [0, 0.5, 1],
								ease: ['easeOut', 'easeIn'],
							},
						}
					: { duration: 0 }
			}
			// The wiggle is a transform, never opacity: no ancestor of the glass may have one.
			style={{ position: 'relative', display: 'flex', ...props.style }}
		>
			{content()}
		</motion.div>
	);
}

/**
 * The accent ring a glass input draws on focus: a bordered box laid over the
 * glass and outside it, its inner edge on the pill's edge, that tightens and
 * strengthens. Mounted on focus and dropped on blur, so it vanishes in one frame.
 */
function FocusRing(props: { radius: number }) {
	const at = (ring: { spread: number; alpha: number }) => ({
		inset: -ring.spread,
		borderWidth: ring.spread,
		borderRadius: props.radius + ring.spread,
		borderColor: withAlpha(colors.accent, ring.alpha),
	});
	return (
		<motion.div
			initial={{ ...at(RING_START), opacity: 0 }}
			animate={{ ...at(RING_END), opacity: 1 }}
			transition={{
				default: {
					duration: RING_DURATION,
					delay: RING_DELAY,
					ease: 'linear',
				},
				opacity: { duration: 0, delay: RING_DELAY },
			}}
			style={{
				position: 'absolute',
				borderStyle: 'solid',
				pointerEvents: 'none',
			}}
		/>
	);
}
