import {
	Button,
	Icon,
	Text,
	Toolbar,
	ToolbarActions,
	ToolbarContent,
	ToolbarDescription,
	ToolbarRow,
	ToolbarTitle,
} from 'ghia-swiftui';
import { For, type JSX } from 'solid-js';
import { Frame, Page, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const stripes = [
	'#5b8def',
	'#b05cf5',
	'#f56f8b',
	'#f5a35c',
	'#4fc08d',
	'#5bc0eb',
];

/** Colour for the toolbar's blur to read against. */
function Backdrop() {
	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<For each={[...stripes, ...stripes]}>
				{(color) => (
					<div style={{ height: 26, flexShrink: 0, backgroundColor: color }} />
				)}
			</For>
		</div>
	);
}

/** Dots where the traffic lights would be, so an inset has something to clear. */
function TrafficLights() {
	return (
		<div
			style={{
				position: 'absolute',
				top: 20,
				left: 20,
				display: 'flex',
				flexDirection: 'row',
				gap: 8,
				zIndex: 40,
				pointerEvents: 'none',
			}}
		>
			<For each={['#ff5f57', '#febc2e', '#28c840']}>
				{(color) => (
					<div
						style={{
							width: 12,
							height: 12,
							borderRadius: 6,
							backgroundColor: color,
						}}
					/>
				)}
			</For>
		</div>
	);
}

function Stage(props: {
	height: number;
	lights?: boolean;
	children: JSX.Element;
}) {
	return (
		<Frame height={props.height}>
			<Backdrop />
			{props.lights === true ? <TrafficLights /> : null}
			{props.children}
		</Frame>
	);
}

export function ToolbarDemo() {
	return (
		<Page
			title="Toolbar"
			subtitle="A sticky header: blur, drag region, and an inset that clears the traffic lights"
		>
			<Section title="Title, description and actions (a drag region; the buttons are not)">
				<Stage height={120}>
					<Toolbar testId="toolbar-bar">
						<ToolbarContent>
							<ToolbarTitle testId="toolbar-title">Inbox</ToolbarTitle>
							<ToolbarDescription>3 unread messages</ToolbarDescription>
						</ToolbarContent>
						<ToolbarActions>
							<Button testId="toolbar-button" variant="glass" size="large">
								<Icon name="plus" />
								Compose
							</Button>
						</ToolbarActions>
					</Toolbar>
				</Stage>
			</Section>
			<Section title="inset: none, windowControls (80px), windowControlsAndButton (124px)">
				<Stage height={190} lights>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						<For
							each={
								['none', 'windowControls', 'windowControlsAndButton'] as const
							}
						>
							{(inset) => (
								<Toolbar inset={inset}>
									<ToolbarContent>
										<ToolbarTitle>{inset}</ToolbarTitle>
									</ToolbarContent>
								</Toolbar>
							)}
						</For>
					</div>
				</Stage>
			</Section>
			<Section title="Two rows: only the first is inset">
				<Stage height={130} lights>
					<Toolbar inset="windowControls" testId="toolbar-two-rows">
						<ToolbarRow>
							<ToolbarContent>
								<ToolbarTitle>First row</ToolbarTitle>
							</ToolbarContent>
						</ToolbarRow>
						<ToolbarRow>
							<Text variant="small" color="secondary">
								Second row, no inset
							</Text>
						</ToolbarRow>
					</Toolbar>
				</Stage>
			</Section>
			<Section title="background: progressive-blur and full-blur; position: bottom">
				<Stage height={210}>
					<Toolbar inset="none">
						<ToolbarContent>
							<ToolbarTitle>progressive-blur</ToolbarTitle>
						</ToolbarContent>
					</Toolbar>
					<div style={{ position: 'absolute', top: 70, left: 0, right: 0 }}>
						<Toolbar inset="none" background="full-blur">
							<ToolbarContent>
								<ToolbarTitle>full-blur</ToolbarTitle>
							</ToolbarContent>
						</Toolbar>
					</div>
					<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
						<Toolbar position="bottom" background="full-blur">
							<ToolbarContent>
								<ToolbarTitle>bottom</ToolbarTitle>
							</ToolbarContent>
						</Toolbar>
					</div>
				</Stage>
			</Section>
		</Page>
	);
}

export async function toolbarScenario(shot: Shot) {
	if (!(await shot.isDragRegion('toolbar-title'))) {
		throw new Error('the toolbar title is not a drag region');
	}
	if (await shot.isDragRegion('toolbar-button')) {
		throw new Error('a button in a toolbar is a drag region');
	}
	// The row's first child clears the inset: 80px in from the frame's edge.
	await shot.capture('insets');
}
