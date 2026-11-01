import { Button, EmptyState, Icon, Text } from 'ghia-swiftui';
import { createSignal } from 'solid-js';
import { Cell, Page, Row, Section, Surface } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

function Pane(props: { children: import('solid-js').JSX.Element }) {
	return (
		<Surface
			style={{
				position: 'relative',
				width: 380,
				height: 200,
				padding: 0,
			}}
		>
			{props.children}
		</Surface>
	);
}

export function EmptyStateDemo() {
	const [created, setCreated] = createSignal(0);
	return (
		<Page title="EmptyState">
			<Section title="placement=center (default): centred in the positioned pane">
				<Row>
					<Cell label="title + description + actions">
						<Pane>
							<EmptyState
								title="No documents"
								description="Create a document to get started."
								actions={
									<Button
										testId="empty-create"
										variant="accent"
										onClick={() => setCreated(created() + 1)}
									>
										New document
									</Button>
								}
							/>
						</Pane>
					</Cell>
					<Cell label="with media (use sparingly)">
						<Pane>
							<EmptyState
								media={<Icon name="inbox" size={32} />}
								title="Inbox zero"
								description="Nothing needs your attention."
							/>
						</Pane>
					</Cell>
				</Row>
			</Section>
			<Section title="placement=inline: flows in the layout">
				<Row>
					<Cell label="title only">
						<Surface style={{ width: 380, padding: 24 }}>
							<EmptyState placement="inline" title="No results" />
						</Surface>
					</Cell>
					<Cell label="composed children">
						<Surface style={{ width: 380, padding: 24 }}>
							<EmptyState placement="inline">
								<Text variant="strong" align="center">
									Custom children
								</Text>
								<Text color="tertiary" align="center">
									Props mode is off when none of the slots are set.
								</Text>
							</EmptyState>
						</Surface>
					</Cell>
				</Row>
			</Section>
			<Text testId="empty-created" color="tertiary">{`${created()}`}</Text>
		</Page>
	);
}

export async function emptyStateScenario(shot: Shot) {
	await shot.click('empty-create');
	shot.expectText('empty-created', '1');
	await shot.capture('after-click');
}
