import { splitProps } from 'solid-js';
import type { HostAttributes } from '#src/host-props.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { typography } from '#src/tokens/typography.ts';

export interface LabelProps extends HostAttributes {
	/** The `id` of the control to label. Without it, the first input inside the label is the control. */
	htmlFor?: string;
}

/**
 * A caption for a form control. Clicking it focuses or toggles the control it
 * wraps or points at via `htmlFor`. Give every interactive form control a label.
 */
export function Label(props: LabelProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<label
			{...rest}
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
			{own.children}
		</label>
	);
}
