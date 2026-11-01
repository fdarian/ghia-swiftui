import { Button, Label, Text } from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

function Field(props: { id: string; testId?: string }) {
	return (
		<input
			id={props.id}
			testId={props.testId}
			placeholder="Type here"
			style={{
				width: 180,
				height: 28,
				paddingInline: 8,
				fontSize: 13,
				borderRadius: 8,
				borderWidth: 1,
				borderStyle: 'solid',
				borderColor: semanticColors.borderField,
				color: semanticColors.textPrimary,
				backgroundColor: semanticColors.surfaceInput,
			}}
		/>
	);
}

export function LabelDemo() {
	return (
		<Page title="Label">
			<Section title="Pointing at a control with htmlFor">
				<Row>
					<Cell label="click the label to focus the input">
						<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
							<Label testId="label-for" htmlFor="label-demo-input">
								Display name
							</Label>
							<Field id="label-demo-input" testId="label-demo-input" />
						</div>
					</Cell>
					<Cell label="wrapping the control">
						<Label>
							<Text>Nickname</Text>
							<Field id="label-demo-wrapped" />
						</Label>
					</Cell>
				</Row>
			</Section>
			<Section title="Disabled control inside (dims)">
				<Row>
					<Cell label="enabled">
						<Label>
							Notify me
							<Button size="small">Toggle</Button>
						</Label>
					</Cell>
					<Cell label="disabled">
						<Label>
							Notify me
							<Button size="small" disabled>
								Toggle
							</Button>
						</Label>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function labelScenario(shot: Shot) {
	await shot.click('label-for');
	shot.expectFocused('label-demo-input');
	await shot.capture('label-clicked');
}
