import { type JSX, Show, splitProps } from 'solid-js';
import { Text } from '#src/components/text.tsx';
import type { HostAttributes } from '#src/host-props.ts';

export function EmptyStateMedia(props: HostAttributes) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'center',
				marginBottom: 4,
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

export function EmptyStateTitle(props: Omit<HostAttributes, 'color'>) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Text
			{...rest}
			as="h1"
			variant="heading1"
			style={{ fontWeight: 400, ...own.style }}
		>
			{own.children}
		</Text>
	);
}

export function EmptyStateDescription(props: Omit<HostAttributes, 'color'>) {
	return <Text {...props} as="p" color="tertiary" />;
}

export function EmptyStateActions(props: HostAttributes) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: 'fit-content',
				gap: 8,
				marginTop: 8,
				marginInline: 'auto',
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

export interface EmptyStateProps extends Omit<HostAttributes, 'title'> {
	/** Positioning behavior. `center` absolutely positions within the nearest positioned ancestor. */
	placement?: 'center' | 'inline';
	/** Heading text. */
	title?: JSX.Element;
	/** Supporting text below the title. */
	description?: JSX.Element;
	/** One or more action buttons. */
	actions?: JSX.Element;
	/** Icon or illustration above the title. Use sparingly: native macOS empty states are icon-free. */
	media?: JSX.Element;
}

/**
 * A native macOS-style placeholder for screens, lists, or panels with no
 * content to show. Leads with plain text, icon-free by default. When
 * `placement="center"`, the nearest positioned ancestor must have
 * `position: relative` or the empty state will centre across the whole
 * window instead of its own pane.
 */
export function EmptyState(props: EmptyStateProps) {
	const [own, rest] = splitProps(props, [
		'placement',
		'title',
		'description',
		'actions',
		'media',
		'style',
		'children',
	]);
	const propsMode = () =>
		own.title !== undefined ||
		own.description !== undefined ||
		own.actions !== undefined ||
		own.media !== undefined;
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'center',
				...((own.placement ?? 'center') === 'center'
					? {
							position: 'absolute',
							top: '50%',
							left: '50%',
							transform: 'translate(-50%, -50%)',
						}
					: {}),
				...own.style,
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					gap: 8,
					maxWidth: 384,
					marginInline: 'auto',
					textAlign: 'center',
				}}
			>
				<Show when={propsMode()} fallback={own.children}>
					<Show when={own.media !== undefined}>
						<EmptyStateMedia>{own.media}</EmptyStateMedia>
					</Show>
					<Show when={own.title !== undefined}>
						<EmptyStateTitle>{own.title}</EmptyStateTitle>
					</Show>
					<Show when={own.description !== undefined}>
						<EmptyStateDescription>{own.description}</EmptyStateDescription>
					</Show>
					<Show when={own.actions !== undefined}>
						<EmptyStateActions>{own.actions}</EmptyStateActions>
					</Show>
				</Show>
			</div>
		</div>
	);
}
