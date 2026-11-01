import { Button, Panel, PanelGroup, Text } from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createSignal, type JSX, Show } from 'solid-js';
import { Frame, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

function Pane(props: { label: string; tint: string; children?: JSX.Element }) {
	return (
		<div
			style={{
				height: '100%',
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 4,
				backgroundColor: props.tint,
			}}
		>
			<Text variant="strong">{props.label}</Text>
			{props.children}
		</div>
	);
}

/** Getters: a token read at module scope runs before the colour scheme exists. */
const tints = {
	get blue() {
		return semanticColors.surfaceListSelection;
	},
	get grey() {
		return semanticColors.surfaceControlSubtle;
	},
	green: '#34c75922',
};

function ResizableRow() {
	const [sizes, setSizes] = createSignal('drag a handle');
	const [dragging, setDragging] = createSignal(false);
	const [mountKey, setMountKey] = createSignal(0);
	return (
		<>
			<Row gap={16}>
				<Text variant="small" color="tertiary">
					Last drag, in px:
				</Text>
				<Text variant="small" testId="panel-sizes">
					{sizes()}
				</Text>
				<Text variant="small" color="tertiary" testId="panel-dragging">
					{dragging() ? 'dragging' : 'idle'}
				</Text>
				<Button
					testId="panel-remount"
					size="small"
					onClick={() => setMountKey((key) => key + 1)}
				>
					Remount: sizes come back from storage
				</Button>
			</Row>
			<Frame height={180}>
				<Show when={{ key: mountKey() }} keyed>
					{() => (
						<PanelGroup
							testId="panel-row"
							storageKey="demo-panel-row"
							onChange={(next) => setSizes(next.map(Math.round).join(' / '))}
							onResizeStateChange={setDragging}
						>
							<Panel
								testId="panel-row-0"
								defaultSize={180}
								minSize={120}
								maxSize={320}
							>
								<Pane label="180 (120 to 320)" tint={tints.blue} />
							</Panel>
							<Panel testId="panel-row-1" minSize={160}>
								<Pane label="flexible (min 160)" tint={tints.grey} />
							</Panel>
							<Panel testId="panel-row-2" defaultSize={140} minSize={100}>
								<Pane label="140 (min 100)" tint={tints.green} />
							</Panel>
						</PanelGroup>
					)}
				</Show>
			</Frame>
		</>
	);
}

function Collapsing() {
	const [hidden, setHidden] = createSignal(false);
	return (
		<>
			<Row gap={8}>
				<Button
					testId="panel-hide"
					size="small"
					onClick={() => setHidden((now) => !now)}
				>
					{hidden() ? 'Show the first panel' : 'Hide the first panel'}
				</Button>
			</Row>
			<Frame height={140}>
				<PanelGroup testId="panel-collapse">
					<Panel
						testId="panel-collapse-0"
						defaultSize={200}
						hidden={hidden()}
						anchor="end"
					>
						<Pane label="anchor end: slides out" tint={tints.blue} />
					</Panel>
					<Panel testId="panel-collapse-1">
						<Pane label="flexible" tint={tints.grey} />
					</Panel>
				</PanelGroup>
			</Frame>
		</>
	);
}

export function PanelDemo() {
	return (
		<Page
			title="Panel and PanelGroup"
			subtitle="Drag-to-resize handles, min and max, collapse, persisted sizes"
		>
			<Section title="Three panels, sizes kept under a storageKey">
				<ResizableRow />
			</Section>
			<Section title="Vertical">
				<Frame height={200}>
					<PanelGroup orientation="vertical" testId="panel-column">
						<Panel
							testId="panel-column-0"
							defaultSize={70}
							minSize={40}
							maxSize={120}
						>
							<Pane label="70 (40 to 120)" tint={tints.blue} />
						</Panel>
						<Panel testId="panel-column-1">
							<Pane label="flexible" tint={tints.grey} />
						</Panel>
					</PanelGroup>
				</Frame>
			</Section>
			<Section title="hidden collapses a panel; its handle goes with it">
				<Collapsing />
			</Section>
		</Page>
	);
}

export async function panelScenario(shot: Shot) {
	await shot.capture('initial-row');
	const before = shot.box('panel-row-0').width;
	await shot.drag('panel-row-handle-0', 60, 0);
	const after = shot.box('panel-row-0').width;
	if (Math.abs(after - (before + 60)) > 2) {
		throw new Error(`the first panel went from ${before} to ${after}, not +60`);
	}
	await shot.capture('dragged');

	// Past the maximum it stops.
	await shot.drag('panel-row-handle-0', 400, 0);
	if (shot.box('panel-row-0').width > 321) {
		throw new Error('the first panel passed its maximum');
	}
	const stopped = shot.box('panel-row-0').width;

	// A remount reads the sizes back from storage.
	await shot.click('panel-remount');
	await shot.wait(200);
	if (Math.abs(shot.box('panel-row-0').width - stopped) > 2) {
		throw new Error('the stored size did not come back');
	}

	// Vertical.
	const tall = shot.box('panel-column-0').height;
	await shot.drag('panel-column-handle-0', 0, 30);
	if (Math.abs(shot.box('panel-column-0').height - (tall + 30)) > 2) {
		throw new Error('the vertical drag did not resize');
	}

	// Hiding slides the first panel out and takes the handle with it.
	shot.expectPresent('panel-collapse-handle-0');
	await shot.click('panel-hide');
	await shot.wait(400);
	shot.expectAbsent('panel-collapse-handle-0');
	await shot.capture('collapsed');
	await shot.click('panel-hide');
	await shot.wait(400);
	shot.expectPresent('panel-collapse-handle-0');
}
