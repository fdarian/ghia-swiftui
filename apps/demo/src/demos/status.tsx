import { Status, type StatusVariant, Text } from 'ghia-swiftui';
import { For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const variants: readonly StatusVariant[] = [
	'loading',
	'neutral',
	'success',
	'warning',
	'error',
];

export function StatusDemo() {
	return (
		<Page title="Status">
			<Section title="Variant (loading is the default)">
				<Row>
					<For each={variants}>
						{(variant) => (
							<Cell label={variant}>
								<Status variant={variant}>{variant}</Status>
							</Cell>
						)}
					</For>
					<Cell label="default, no variant">
						<Status>Syncing</Status>
					</Cell>
				</Row>
			</Section>
			<Section title="Over content (glass material)">
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 12,
						padding: 20,
						borderRadius: 12,
						backgroundImage:
							'linear-gradient(120deg, #ff7a59, #ffb347 40%, #4fc3f7 100%)',
					}}
				>
					<For each={variants}>
						{(variant) => <Status variant={variant}>{variant}</Status>}
					</For>
				</div>
			</Section>
			<Section title="In a sentence">
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Text>Deploy to production</Text>
					<Status variant="success">Live</Status>
				</div>
			</Section>
		</Page>
	);
}

export async function statusScenario(shot: Shot) {
	await shot.wait(1000);
	await shot.capture('pulse-mid');
}
