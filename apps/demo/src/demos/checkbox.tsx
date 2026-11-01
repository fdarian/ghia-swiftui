import { Checkbox, Label, Text } from 'ghia-swiftui';
import { createSignal } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

export function CheckboxDemo() {
	const [checked, setChecked] = createSignal(false);
	const [labelled, setLabelled] = createSignal(true);
	const [events, setEvents] = createSignal(0);
	return (
		<Page title="Checkbox">
			<Section title="State">
				<Row gap={24}>
					<Cell label="unchecked">
						<Checkbox aria-label="Unchecked" />
					</Cell>
					<Cell label="checked">
						<Checkbox checked aria-label="Checked" />
					</Cell>
					<Cell label="indeterminate">
						<Checkbox checked="indeterminate" aria-label="Indeterminate" />
					</Cell>
					<Cell label="invalid">
						<Checkbox aria-invalid aria-label="Invalid" />
					</Cell>
					<Cell label="disabled">
						<Checkbox disabled aria-label="Disabled" />
					</Cell>
					<Cell label="disabled, checked">
						<Checkbox disabled checked aria-label="Disabled checked" />
					</Cell>
				</Row>
			</Section>
			<Section title="Interaction">
				<Row gap={24}>
					<Cell label="pressed">
						<Checkbox testId="checkbox-pressed" aria-label="Pressed" />
					</Cell>
					<Cell label="pressed, checked">
						<Checkbox
							testId="checkbox-pressed-checked"
							defaultChecked
							aria-label="Pressed checked"
						/>
					</Cell>
					<Cell label="keyboard focus">
						<Checkbox testId="checkbox-focus" aria-label="Focused" />
					</Cell>
					<Cell label="keyboard focus, checked">
						<Checkbox
							testId="checkbox-focus-checked"
							defaultChecked
							aria-label="Focused checked"
						/>
					</Cell>
				</Row>
			</Section>
			<Section title="Controlled and uncontrolled">
				<Row gap={24}>
					<Cell label="controlled: click toggles the signal">
						<Checkbox
							testId="checkbox-controlled"
							aria-label="Controlled"
							checked={checked()}
							onCheckedChange={(next) => {
								setChecked(next);
								setEvents(events() + 1);
							}}
						/>
					</Cell>
					<Cell label="uncontrolled, defaultChecked">
						<Checkbox
							testId="checkbox-uncontrolled"
							aria-label="Uncontrolled"
							defaultChecked
						/>
					</Cell>
					<Cell label="controlled that refuses to change">
						<Checkbox
							testId="checkbox-frozen"
							aria-label="Frozen"
							checked={false}
							onCheckedChange={() => setEvents(events() + 1)}
						/>
					</Cell>
					<Cell label="change events fired">
						<Text testId="checkbox-events">{`${events()}`}</Text>
					</Cell>
				</Row>
			</Section>
			<Section title="Inside a Label (click the text)">
				<Label testId="checkbox-label">
					<Checkbox
						testId="checkbox-in-label"
						checked={labelled()}
						onCheckedChange={setLabelled}
					/>
					Send me product updates
				</Label>
			</Section>
		</Page>
	);
}

export async function checkboxScenario(shot: Shot) {
	// First: the ring only shows while the last input was the keyboard, and a click flips that.
	await shot.focus('checkbox-focus');
	shot.expectFocused('checkbox-focus');
	await shot.capture('focus');

	shot.expectChecked('checkbox-controlled', false);
	await shot.click('checkbox-controlled');
	shot.expectChecked('checkbox-controlled', true);
	shot.expectText('checkbox-events', '1');

	shot.expectChecked('checkbox-uncontrolled', true);
	await shot.click('checkbox-uncontrolled');
	shot.expectChecked('checkbox-uncontrolled', false);

	await shot.click('checkbox-frozen');
	shot.expectChecked('checkbox-frozen', false);
	shot.expectText('checkbox-events', '2');

	shot.expectChecked('checkbox-in-label', true);
	await shot.clickText('Send me product updates');
	shot.expectChecked('checkbox-in-label', false);

	await shot.press('checkbox-pressed');
	await shot.capture('pressed');
	await shot.release();
	await shot.press('checkbox-pressed-checked');
	await shot.capture('pressed-checked');
	await shot.release();
}
