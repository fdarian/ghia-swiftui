import { showContextMenu, Text } from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const tracks = [
	{ id: 'one', title: 'Paranoid Android', artist: 'Radiohead' },
	{ id: 'two', title: 'Teardrop', artist: 'Massive Attack' },
	{ id: 'three', title: 'Roads', artist: 'Portishead' },
] as const;

export function ContextMenuDemo() {
	const [picked, setPicked] = createSignal('nothing yet');
	return (
		<Page title="showContextMenu">
			<Section title="Right-click a row: the menu opens at the cursor">
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						width: 360,
						gap: 2,
					}}
				>
					<For each={tracks}>
						{(track) => (
							<div
								testId={`track-${track.id}`}
								onContextMenu={async (event) => {
									const choice = await showContextMenu({
										items: [
											{ id: 'show', label: 'Show in Apple Music' },
											{
												id: 'copy',
												label: 'Copy Link',
												disabled: track.id === 'two',
											},
											{ id: 'remove', label: 'Remove from History' },
										],
										x: event.clientX ?? 0,
										y: event.clientY ?? 0,
									});
									setPicked(
										choice === null ? 'dismissed' : `${track.id}: ${choice}`,
									);
								}}
								style={{
									padding: 8,
									borderRadius: 8,
									hover: { backgroundColor: semanticColors.surfaceListHover },
								}}
							>
								<Text variant="strong">{track.title}</Text>
								<Text variant="small" color="tertiary">
									{track.artist}
								</Text>
							</div>
						)}
					</For>
				</div>
			</Section>
			<Section title="Result">
				<Row gap={24}>
					<Cell label="resolved with">
						<Text testId="context-menu-picked">{picked()}</Text>
					</Cell>
				</Row>
			</Section>
			<Section title="Near the window's bottom edge: the region below is pinned to the window">
				<div
					testId="context-menu-edge"
					onContextMenu={async (event) => {
						const choice = await showContextMenu({
							items: [
								{ id: 'a', label: 'Opens upward' },
								{ id: 'b', label: 'When there is no room below' },
							],
							x: event.clientX ?? 0,
							y: event.clientY ?? 0,
						});
						setPicked(choice === null ? 'dismissed' : `edge: ${choice}`);
					}}
					style={{
						position: 'fixed',
						left: 232,
						bottom: 12,
						width: 360,
						padding: 8,
						borderRadius: 8,
						borderWidth: 1,
						borderStyle: 'dashed',
						borderColor: semanticColors.borderPrimary,
					}}
				>
					<Text variant="small" color="secondary">
						Right-click here
					</Text>
				</div>
			</Section>
		</Page>
	);
}

export async function contextMenuScenario(shot: Shot) {
	await shot.rightClick('track-one');
	await shot.wait(200);
	shot.expectPresent('context-menu');
	await shot.capture('open');

	// A disabled item does not pick.
	await shot.click('context-menu-remove');
	await shot.wait(300);
	shot.expectText('context-menu-picked', 'one: remove');
	shot.expectAbsent('context-menu');

	await shot.rightClick('track-two');
	await shot.wait(200);
	await shot.click('context-menu-copy');
	shot.expectPresent('context-menu');
	await shot.click('context-menu-show');
	await shot.wait(300);
	shot.expectText('context-menu-picked', 'two: show');

	// Escape and a press outside both resolve null.
	await shot.rightClick('track-three');
	await shot.wait(200);
	await shot.keys('Escape');
	await shot.wait(300);
	shot.expectText('context-menu-picked', 'dismissed');
	shot.expectAbsent('context-menu');

	await shot.rightClick('track-one');
	await shot.wait(200);
	await shot.click('context-menu-picked');
	await shot.wait(300);
	shot.expectText('context-menu-picked', 'dismissed');
	shot.expectAbsent('context-menu');

	// No row is lit on open, as in NSMenu: the first ArrowDown lights the first row, the second the next.
	await shot.rightClick('track-three');
	await shot.wait(200);
	await shot.capture('open-unlit');
	await shot.keys('ArrowDown ArrowDown Enter');
	await shot.wait(300);
	shot.expectText('context-menu-picked', 'three: copy');

	await shot.rightClick('context-menu-edge');
	await shot.wait(200);
	await shot.capture('open-at-edge');
	await shot.keys('Escape');
	await shot.wait(300);
}
