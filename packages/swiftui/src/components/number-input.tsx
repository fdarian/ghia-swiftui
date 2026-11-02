import type {
	HostElement,
	InputProps as HostInputProps,
	StyleDesc,
} from '@ghia/solid';
import { createSignal, type JSX, Show, splitProps } from 'solid-js';
import { isInvalid } from '#src/aria.ts';
import { useFieldDisabled } from '#src/components/field-disabled-context.ts';
import { Icon } from '#src/icons/icon.tsx';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

/** The box is `Input`'s text field: 23 / 26 / 26pt tall with 11 / 13 / 13pt type, as SwiftUI's `.small` / `.regular` / `.large`. */
const sizes = {
	small: {
		height: 23,
		borderRadius: 6,
		fontSize: 11,
		lineHeight: '14px',
		fieldPadding: 6,
		unitPadding: 6,
		stepperMargin: 3,
		stepperPadding: 2,
	},
	medium: {
		height: 26,
		borderRadius: 9,
		fontSize: 13,
		lineHeight: '18px',
		fieldPadding: 6,
		unitPadding: 6,
		stepperMargin: 4,
		stepperPadding: 3,
	},
	large: {
		height: 26,
		borderRadius: 9,
		fontSize: 13,
		lineHeight: '18px',
		fieldPadding: 6,
		unitPadding: 6,
		stepperMargin: 4,
		stepperPadding: 4,
	},
} as const;

export type NumberInputVariant = 'default' | 'filled';
export type NumberInputSize = keyof typeof sizes;

export interface NumberInputProps
	extends Omit<
		HostInputProps,
		'style' | 'type' | 'value' | 'onChange' | 'min' | 'max' | 'step'
	> {
	/** Controlled value. Omit for uncontrolled mode. `null` = empty. */
	value?: number | null;
	/** Uncontrolled initial value. */
	defaultValue?: number | null;
	/** Fires on every change; `null` when the input is cleared. */
	onValueChange?: (value: number | null) => void;
	/** Suffix rendered inside the input, right of the value (e.g. `"pt"`). */
	unit?: JSX.Element;
	/** Show/hide the stepper arrows. */
	steppers?: boolean;
	/** A text field's fill and hairline vs. subtle-filled chrome. */
	variant?: NumberInputVariant;
	/** Control size: 23 / 26 / 26pt tall with 11 / 13 / 13pt type, as `Input`. */
	size?: NumberInputSize;
	min?: number;
	max?: number;
	step?: number;
	style?: StyleDesc;
	ref?: (element: HostElement) => void;
}

function decimals(value: number): number {
	const fraction = String(value).split('.')[1];
	return fraction === undefined ? 0 : fraction.length;
}

function variantStyle(variant: NumberInputVariant): StyleDesc {
	switch (variant) {
		case 'default':
			return {
				borderColor: semanticColors.borderTextField,
				backgroundColor: semanticColors.surfaceTextField,
				focusWithin: { borderColor: colors.fg40 },
			};
		case 'filled':
			return {
				borderColor: 'transparent',
				backgroundColor: semanticColors.surfaceControlSubtle,
				focusWithin: { backgroundColor: semanticColors.surfaceControl },
			};
	}
}

/**
 * Compact numeric input with an optional unit suffix and stepper arrows,
 * built on ghia's `<input type="number">`: the arrow keys step the value
 * within `min` and `max`. Use `Input` instead for free-form numeric text
 * without a unit or stepper.
 */
export function NumberInput(props: NumberInputProps) {
	const [own, rest] = splitProps(props, [
		'value',
		'defaultValue',
		'onValueChange',
		'unit',
		'steppers',
		'variant',
		'size',
		'min',
		'max',
		'step',
		'disabled',
		'aria-invalid',
		'style',
		'ref',
	]);
	const [uncontrolled, setUncontrolled] = createSignal<number | null>(
		own.defaultValue ?? null,
	);
	const fieldDisabled = useFieldDisabled();
	const isDisabled = () => own.disabled === true || fieldDisabled();
	const current = () => (own.value !== undefined ? own.value : uncontrolled());
	const size = () => sizes[own.size ?? 'medium'];
	const step = () => own.step ?? 1;
	let input: HostElement | undefined;

	const commit = (next: number | null) => {
		if (own.value === undefined) setUncontrolled(next);
		own.onValueChange?.(next);
	};

	const clamp = (value: number) => {
		let result = value;
		if (own.min !== undefined && result < own.min) result = own.min;
		if (own.max !== undefined && result > own.max) result = own.max;
		return result;
	};

	const nudge = (direction: 1 | -1) => {
		if (isDisabled()) return;
		const base = current() ?? 0;
		const places = Math.max(decimals(step()), decimals(base));
		commit(clamp(Number((base + direction * step()).toFixed(places))));
		input?.focus();
	};

	return (
		<div
			aria-invalid={own['aria-invalid']}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				minWidth: 0,
				overflow: 'hidden',
				borderWidth: 1,
				borderStyle: 'solid',
				height: size().height,
				borderRadius: size().borderRadius,
				...variantStyle(own.variant ?? 'default'),
				...(isInvalid(own['aria-invalid'])
					? {
							borderColor: colors.supportRed40,
							outline: `3px solid ${colors.supportRed20}`,
						}
					: {}),
				hasDisabled: { pointerEvents: 'none', opacity: 0.5 },
				...own.style,
			}}
		>
			<input
				{...rest}
				type="number"
				value={current() === null ? '' : String(current())}
				min={own.min}
				max={own.max}
				step={step()}
				disabled={isDisabled()}
				aria-invalid={own['aria-invalid']}
				ref={(element) => {
					input = element;
					own.ref?.(element);
				}}
				onChange={(event) => {
					if (event.value === '') {
						commit(null);
						return;
					}
					const parsed = Number(event.value);
					if (!Number.isNaN(parsed)) commit(parsed);
				}}
				// `textMuted` is the native colour of a disabled field's text; the wrapper's opacity already dims it.
				theme={{
					caret: semanticColors.textPrimary,
					textMuted: semanticColors.textPrimary,
					...rest.theme,
				}}
				style={{
					flexGrow: 1,
					flexShrink: 1,
					minWidth: 0,
					alignSelf: 'stretch',
					backgroundColor: 'transparent',
					keyboardFocusDim: false,
					fontSize: size().fontSize,
					lineHeight: size().lineHeight,
					fontVariantNumeric: 'tabular-nums',
					color: semanticColors.textPrimary,
					selectionColor: colors.selection40,
					paddingLeft: size().fieldPadding,
					textAlign: own.unit !== undefined ? 'right' : 'left',
					disabled: { cursor: 'not-allowed' },
				}}
			/>
			<Show when={own.unit !== undefined}>
				<text
					aria-hidden
					style={{
						pointerEvents: 'none',
						color: semanticColors.textTertiary,
						fontSize: size().fontSize,
						fontVariantNumeric: 'tabular-nums',
						userSelect: 'none',
						paddingLeft: 2,
						paddingRight: size().unitPadding,
					}}
				>
					{own.unit}
				</text>
			</Show>
			<Show when={own.steppers !== false}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						flexShrink: 0,
						alignSelf: 'stretch',
						marginBlock: size().stepperMargin,
						marginRight: 4,
						overflow: 'hidden',
						borderRadius: styleTokens.radiusPill,
						backgroundColor: semanticColors.surfaceControl,
					}}
				>
					<Stepper
						testId={suffixed(rest.testId, 'increment')}
						label="Increment"
						padding={size().stepperPadding}
						onStep={() => nudge(1)}
					>
						<Icon name="chevron-up" size={8} strokeWidth={2.25} />
					</Stepper>
					<div
						aria-hidden
						style={{
							height: 1,
							marginInline: 2,
							backgroundColor: semanticColors.borderSeparator,
						}}
					/>
					<Stepper
						testId={suffixed(rest.testId, 'decrement')}
						label="Decrement"
						padding={size().stepperPadding}
						onStep={() => nudge(-1)}
					>
						<Icon name="chevron-down" size={8} strokeWidth={2.25} />
					</Stepper>
				</div>
			</Show>
		</div>
	);
}

function suffixed(testId: string | undefined, suffix: string) {
	return testId === undefined ? undefined : `${testId}-${suffix}`;
}

function Stepper(props: {
	testId: string | undefined;
	label: string;
	padding: number;
	onStep: () => void;
	children: JSX.Element;
}) {
	return (
		<div
			testId={props.testId}
			role="button"
			aria-label={props.label}
			// Pressing must not take focus from the field, which the step then returns to.
			onMouseDown={(event) => {
				event.preventDefault();
				props.onStep();
			}}
			style={{
				display: 'flex',
				flexGrow: 1,
				alignItems: 'center',
				justifyContent: 'center',
				paddingInline: props.padding,
				color: semanticColors.textSecondary,
				cursor: 'default',
				active: {
					backgroundColor: semanticColors.surfaceControlActive,
					color: semanticColors.textPrimary,
				},
			}}
		>
			{props.children}
		</div>
	);
}
