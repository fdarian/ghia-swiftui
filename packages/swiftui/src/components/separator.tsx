import { splitProps } from 'solid-js';
import type { HostAttributes } from '#src/host-props.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

export interface SeparatorProps extends Omit<HostAttributes, 'children'> {
	orientation?: 'horizontal' | 'vertical';
}

/**
 * A thin dividing line that visually groups or separates content. A vertical
 * separator needs a parent with a defined height to be visible.
 */
export function Separator(props: SeparatorProps) {
	const [own, rest] = splitProps(props, ['orientation', 'style']);
	const orientation = () => own.orientation ?? 'horizontal';
	return (
		<div
			{...rest}
			role="separator"
			aria-orientation={orientation()}
			style={{
				backgroundColor: semanticColors.borderTertiary,
				flexShrink: 0,
				...(orientation() === 'vertical'
					? { height: '100%', width: 1 }
					: { height: 1, width: '100%' }),
				...own.style,
			}}
		/>
	);
}
