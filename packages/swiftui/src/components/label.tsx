import type { HostElement } from '@ghia/solid';
import { createContext, createSignal, splitProps, useContext } from 'solid-js';
import type { HostAttributes } from '#src/host-props.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { typography } from '#src/tokens/typography.ts';

export interface LabelControl {
	element: HostElement;
	activate: () => void;
}

/**
 * How a control inside a `Label` tells it what a click on the text should
 * activate. ghia's own `<label>` only reaches an `<input>` or `<textarea>`,
 * so `Checkbox` and `RadioGroupItem` register themselves here instead.
 */
const LabelControlContext = createContext<(control: LabelControl) => void>();

/** Called by a form control that is not an `<input>`; does nothing outside a `Label`. */
export function registerLabelControl(control: LabelControl) {
	useContext(LabelControlContext)?.(control);
}

export interface LabelProps extends HostAttributes {
	/** The `id` of the control to label. Without it, the first control inside the label is the one clicked. */
	htmlFor?: string;
}

/**
 * A caption for a form control. Clicking it focuses or toggles the control it
 * wraps or points at via `htmlFor`. Give every interactive form control a label.
 */
export function Label(props: LabelProps) {
	const [own, rest] = splitProps(props, [
		'htmlFor',
		'onClick',
		'style',
		'children',
	]);
	const [control, setControl] = createSignal<LabelControl>();
	return (
		<label
			{...rest}
			htmlFor={own.htmlFor}
			onClick={(event) => {
				own.onClick?.(event);
				const target = control();
				if (target === undefined || event.defaultPrevented) return;
				// A click on the control itself already did its own work.
				if (event.composedPath().includes(target.element)) return;
				target.activate();
				target.element.focus();
			}}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				...typography.variants.regular,
				lineHeight: 'normal',
				color: semanticColors.textPrimary,
				userSelect: 'none',
				hasDisabled: { opacity: 0.5, cursor: 'not-allowed' },
				...own.style,
			}}
		>
			<LabelControlContext.Provider value={setControl}>
				{own.children}
			</LabelControlContext.Provider>
		</label>
	);
}
