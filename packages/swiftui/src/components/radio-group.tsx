import type { HostElement } from '@ghia/solid';
import { createRadioRoot } from 'base-ui-solid-gpuix/radio';
import {
	createRadioGroup,
	type RadioGroup as RadioGroupState,
} from 'base-ui-solid-gpuix/radio-group';
import {
	createContext,
	createEffect,
	createSignal,
	Show,
	splitProps,
	useContext,
} from 'solid-js';
import { isInvalid } from '#src/aria.ts';
import { useFieldDisabled } from '#src/components/field-disabled-context.ts';
import { registerLabelControl } from '#src/components/label.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

interface RadioGroupContextValue {
	group: RadioGroupState;
	disabled: () => boolean;
	/** The row index of the next item to mount: items are rows in the order they are created. */
	nextIndex: () => number;
}

const RadioGroupContext = createContext<RadioGroupContextValue>();

export interface RadioGroupProps extends HostAttributes {
	/** Controlled selected value. */
	value?: string;
	/** Uncontrolled initial value. */
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	disabled?: boolean;
	/** Row (flex) vs column layout. */
	orientation?: 'horizontal' | 'vertical';
}

/**
 * A radio group for choosing exactly one option from a small set of
 * mutually exclusive choices. Wrap each `RadioGroupItem` in a `Label` so
 * the text is clickable.
 */
export function RadioGroup(props: RadioGroupProps) {
	const [own, rest] = splitProps(props, [
		'value',
		'defaultValue',
		'onValueChange',
		'disabled',
		'orientation',
		'style',
		'children',
	]);
	const [uncontrolled, setUncontrolled] = createSignal(own.defaultValue);
	const group = createRadioGroup({
		value: () => own.value ?? uncontrolled(),
		selectedIndex: () => undefined,
		onValueChange: (next) => {
			if (own.value === undefined) setUncontrolled(next);
			own.onValueChange?.(next);
		},
	});
	let items = 0;
	return (
		<RadioGroupContext.Provider
			value={{
				group,
				disabled: () => own.disabled === true,
				nextIndex: () => items++,
			}}
		>
			<div
				{...rest}
				role={group.groupProps.role}
				aria-disabled={own.disabled}
				style={{
					display: 'flex',
					flexDirection: own.orientation === 'horizontal' ? 'row' : 'column',
					gap: 12,
					...own.style,
				}}
			>
				{own.children}
			</div>
		</RadioGroupContext.Provider>
	);
}

export interface RadioGroupItemProps
	extends Omit<HostAttributes, 'children' | 'onChange'> {
	value: string;
	disabled?: boolean;
}

/** A single option within a `RadioGroup`. */
export function RadioGroupItem(props: RadioGroupItemProps) {
	const context = useContext(RadioGroupContext);
	if (context === undefined) {
		throw new Error('RadioGroupItem must be inside a RadioGroup');
	}
	const [own, rest] = splitProps(props, [
		'value',
		'disabled',
		'aria-label',
		'aria-invalid',
		'id',
		'style',
		'ref',
	]);
	const fieldDisabled = useFieldDisabled();
	const isDisabled = () =>
		context.disabled() || own.disabled === true || fieldDisabled();
	const row = createRadioRoot(context.group, {
		index: context.nextIndex(),
		label: () => own['aria-label'] ?? '',
		value: () => own.value,
		selected: () => undefined,
		onSelect: () => {},
	});
	let element: HostElement | undefined;
	// A disabled row is left out of the list, so the arrow keys step over it.
	createEffect(() => {
		if (element === undefined || isDisabled()) return;
		row.register(element);
	});

	return (
		<div
			{...rest}
			id={own.id ?? row.rowProps.id}
			role="radio"
			aria-checked={row.checked()}
			aria-label={own['aria-label']}
			aria-invalid={own['aria-invalid']}
			aria-disabled={isDisabled()}
			tabIndex={isDisabled() ? -1 : row.rowProps.tabIndex}
			onClick={row.rowProps.onClick}
			onKeyDown={(event) => {
				// Base UI's radio ignores Enter; the primitive selects on it.
				if (event.key === 'Enter') return;
				row.rowProps.onKeyDown(event);
			}}
			formControl={isDisabled() ? 'disabled' : 'enabled'}
			ref={(host) => {
				element = host;
				registerLabelControl({ element: host, activate: row.select });
				own.ref?.(host);
			}}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				width: 16,
				height: 16,
				borderRadius: 8,
				backgroundColor: row.checked()
					? colors.accent
					: semanticColors.surfaceControl,
				color: semanticColors.textPrimary,
				cursor: 'default',
				keyboardFocusDim: false,
				...(isInvalid(own['aria-invalid'])
					? { outline: `1px solid ${colors.red}` }
					: {}),
				active: {
					backgroundColor: row.checked()
						? semanticColors.accentHover
						: semanticColors.surfaceControlActive,
				},
				// Not a box-shadow ring: ghia gives its spread the element's own radius, so on a circle it paints a rounded square.
				focusVisible: { outline: `3px solid ${colors.fg20}` },
				...(isDisabled() ? { pointerEvents: 'none', opacity: 0.5 } : {}),
				...own.style,
			}}
		>
			<Show when={row.checked()}>
				<div
					style={{
						width: 6,
						height: 6,
						borderRadius: 9999,
						backgroundColor: semanticColors.accentContrast,
					}}
				/>
			</Show>
		</div>
	);
}
