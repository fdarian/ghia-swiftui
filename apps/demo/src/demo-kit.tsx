import type { StyleDesc } from '@ghia/solid';
import { ScrollArea, Text } from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import type { JSX } from 'solid-js';

export function Page(props: {
	title: string;
	subtitle?: string;
	children: JSX.Element;
}) {
	return (
		<ScrollArea testId="page" title={props.title} subtitle={props.subtitle}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 24,
					padding: 24,
				}}
			>
				{props.children}
			</div>
		</ScrollArea>
	);
}

export function Section(props: {
	title: string;
	/** Fixes the section's width, to lay several side by side. */
	width?: number;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 10,
				...(props.width === undefined ? {} : { width: props.width }),
			}}
		>
			<Text variant="smallStrong" color="secondary">
				{props.title}
			</Text>
			{props.children}
		</div>
	);
}

/** One demo cell: the thing itself under a small caption naming its variant. */
export function Cell(props: { label: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: 6,
			}}
		>
			{props.children}
			<Text variant="small" color="tertiary">
				{props.label}
			</Text>
		</div>
	);
}

export function Row(props: { children: JSX.Element; gap?: number }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				flexWrap: 'wrap',
				alignItems: 'flex-start',
				gap: props.gap ?? 16,
			}}
		>
			{props.children}
		</div>
	);
}

/** A surface for components that need to read against the page: a bordered card. */
export function Surface(props: { children: JSX.Element; style?: StyleDesc }) {
	return (
		<div
			style={{
				padding: 16,
				borderRadius: 12,
				borderWidth: 1,
				borderStyle: 'solid',
				borderColor: semanticColors.borderSecondary,
				...props.style,
			}}
		>
			{props.children}
		</div>
	);
}

/** A bordered, clipped window-in-a-window for components that fill their parent: a scroll area, a split view. */
export function Frame(props: {
	height: number;
	width?: number | string;
	testId?: string;
	children: JSX.Element;
	style?: StyleDesc;
}) {
	return (
		<div
			testId={props.testId}
			style={{
				position: 'relative',
				height: props.height,
				width: props.width ?? '100%',
				flexShrink: 0,
				overflow: 'hidden',
				borderRadius: 12,
				borderWidth: 1,
				borderStyle: 'solid',
				borderColor: semanticColors.borderSecondary,
				backgroundColor: semanticColors.backgroundSolid,
				...props.style,
			}}
		>
			{props.children}
		</div>
	);
}
