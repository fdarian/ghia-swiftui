import { createCheckboxRoot } from 'base-ui-solid-gpuix/checkbox';
import { createCheckboxGroup } from 'base-ui-solid-gpuix/checkbox-group';
import { createSignal, Show, splitProps } from 'solid-js';
import { isInvalid } from '#src/aria.ts';
import { useFieldDisabled } from '#src/components/field-disabled-context.ts';
import { registerLabelControl } from '#src/components/label.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { Icon } from '#src/icons/icon.tsx';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

export type CheckedState = boolean | 'indeterminate';

export interface CheckboxProps
	extends Omit<HostAttributes, 'children' | 'onChange'> {
	/** Controlled checked state. `"indeterminate"` shows the checkmark without being fully checked. */
	checked?: CheckedState;
	/** Uncontrolled initial state. */
	defaultChecked?: CheckedState;
	/** Called when the state changes. Never fires `"indeterminate"`: that state is only ever set programmatically. */
	onCheckedChange?: (checked: boolean) => void;
	disabled?: boolean;
}

/**
 * A checkbox for selecting zero, one, or many options from a set, or for an
 * optional binary state that is committed later. Use `RadioGroup` instead
 * for a single choice.
 */
export function Checkbox(props: CheckboxProps) {
	const [own, rest] = splitProps(props, [
		'checked',
		'defaultChecked',
		'onCheckedChange',
		'disabled',
		'aria-label',
		'aria-invalid',
		'id',
		'style',
		'ref',
	]);
	const [uncontrolled, setUncontrolled] = createSignal<CheckedState>(
		own.defaultChecked ?? false,
	);
	const state = () => own.checked ?? uncontrolled();
	const isChecked = () => state() !== false;
	const fieldDisabled = useFieldDisabled();
	const isDisabled = () => own.disabled === true || fieldDisabled();

	// The primitive is a row of a group; a lone checkbox is a group of one.
	const group = createCheckboxGroup();
	const row = createCheckboxRoot(group, {
		index: 0,
		label: () => own['aria-label'] ?? '',
		checked: isChecked,
		onCheckedChange: (next) => {
			if (isDisabled()) return;
			if (own.checked === undefined) setUncontrolled(next);
			own.onCheckedChange?.(next);
		},
	});

	return (
		<div
			{...rest}
			id={own.id ?? row.rowProps.id}
			role="checkbox"
			aria-checked={state() === 'indeterminate' ? 'mixed' : isChecked()}
			aria-label={own['aria-label']}
			aria-invalid={own['aria-invalid']}
			aria-disabled={isDisabled()}
			tabIndex={isDisabled() ? -1 : row.rowProps.tabIndex}
			onClick={row.rowProps.onClick}
			onKeyDown={(event) => {
				// Base UI's checkbox ignores Enter; the primitive toggles on it.
				if (event.key === 'Enter') return;
				row.rowProps.onKeyDown(event);
			}}
			formControl={isDisabled() ? 'disabled' : 'enabled'}
			ref={(element) => {
				row.register(element);
				registerLabelControl({ element, activate: row.rowProps.onClick });
				own.ref?.(element);
			}}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				width: 16,
				height: 16,
				borderRadius: 6,
				backgroundColor: isChecked()
					? colors.accent
					: semanticColors.surfaceControl,
				color: semanticColors.accentContrast,
				boxShadow: `0 1px 2px 0 ${colors.fg5}`,
				...(isInvalid(own['aria-invalid'])
					? { outline: `1px solid ${colors.red}` }
					: {}),
				cursor: 'default',
				keyboardFocusDim: false,
				active: {
					backgroundColor: isChecked()
						? semanticColors.accentHover
						: semanticColors.surfaceControlActive,
				},
				// An outline, not a box-shadow ring: ghia gives a shadow's spread the element's own radius, so the ring's corners would be too tight.
				focusVisible: { outline: `3px solid ${colors.fg20}` },
				...(isDisabled() ? { pointerEvents: 'none', opacity: 0.5 } : {}),
				...own.style,
			}}
		>
			<Show when={isChecked()}>
				<Icon name="check" size={12} strokeWidth={3} />
			</Show>
		</div>
	);
}
