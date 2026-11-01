import { Label, RadioGroup, RadioGroupItem, Text } from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const themes = [
	{ value: 'system', label: 'Auto' },
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
] as const;

export function RadioGroupDemo() {
	const [theme, setTheme] = createSignal('light');
	return (
		<Page title="RadioGroup">
			<Section title="Orientation (each item in a Label, click the text)">
				<Row gap={48}>
					<Cell label="vertical (default)">
						<RadioGroup
							testId="radio-vertical"
							value={theme()}
							onValueChange={setTheme}
						>
							<For each={themes}>
								{(item) => (
									<Label testId={`radio-vertical-label-${item.value}`}>
										<RadioGroupItem
											testId={`radio-vertical-${item.value}`}
											value={item.value}
										/>
										{item.label}
									</Label>
								)}
							</For>
						</RadioGroup>
					</Cell>
					<Cell label="horizontal, shares the same value">
						<RadioGroup
							value={theme()}
							onValueChange={setTheme}
							orientation="horizontal"
						>
							<For each={themes}>
								{(item) => (
									<Label>
										<RadioGroupItem
											testId={`radio-horizontal-${item.value}`}
											value={item.value}
										/>
										{item.label}
									</Label>
								)}
							</For>
						</RadioGroup>
					</Cell>
					<Cell label="selected value">
						<Text testId="radio-value">{theme()}</Text>
					</Cell>
				</Row>
			</Section>
			<Section title="Uncontrolled">
				<Row gap={48}>
					<Cell label="defaultValue b">
						<RadioGroup defaultValue="b">
							<Label>
								<RadioGroupItem testId="radio-uncontrolled-a" value="a" />
								Option A
							</Label>
							<Label>
								<RadioGroupItem testId="radio-uncontrolled-b" value="b" />
								Option B
							</Label>
						</RadioGroup>
					</Cell>
					<Cell label="no value: nothing selected">
						<RadioGroup>
							<Label>
								<RadioGroupItem value="a" />
								Option A
							</Label>
							<Label>
								<RadioGroupItem value="b" />
								Option B
							</Label>
						</RadioGroup>
					</Cell>
				</Row>
			</Section>
			<Section title="State">
				<Row gap={48}>
					<Cell label="disabled group">
						<RadioGroup defaultValue="a" disabled>
							<Label>
								<RadioGroupItem value="a" />
								Option A
							</Label>
							<Label>
								<RadioGroupItem value="b" />
								Option B
							</Label>
						</RadioGroup>
					</Cell>
					<Cell label="one disabled item (arrow keys skip it)">
						<RadioGroup testId="radio-skip" defaultValue="a">
							<Label>
								<RadioGroupItem testId="radio-skip-a" value="a" />
								Option A
							</Label>
							<Label>
								<RadioGroupItem testId="radio-skip-b" disabled value="b" />
								Option B
							</Label>
							<Label>
								<RadioGroupItem testId="radio-skip-c" value="c" />
								Option C
							</Label>
						</RadioGroup>
					</Cell>
					<Cell label="invalid">
						<RadioGroup defaultValue="a">
							<Label>
								<RadioGroupItem aria-invalid value="a" />
								Option A
							</Label>
							<Label>
								<RadioGroupItem aria-invalid value="b" />
								Option B
							</Label>
						</RadioGroup>
					</Cell>
					<Cell label="keyboard focus, pressed">
						<RadioGroup>
							<Label>
								<RadioGroupItem testId="radio-focus" value="a" />
								Focused
							</Label>
							<Label>
								<RadioGroupItem testId="radio-pressed" value="b" />
								Pressed
							</Label>
						</RadioGroup>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function radioGroupScenario(shot: Shot) {
	// First: the ring only shows while the last input was the keyboard, and a click flips that.
	await shot.focus('radio-focus');
	await shot.capture('focus');

	shot.expectChecked('radio-vertical-light', true);
	await shot.click('radio-vertical-label-dark');
	shot.expectChecked('radio-vertical-dark', true);
	shot.expectChecked('radio-vertical-light', false);
	shot.expectChecked('radio-horizontal-dark', true);
	shot.expectText('radio-value', 'dark');

	await shot.click('radio-vertical-system');
	shot.expectText('radio-value', 'system');

	shot.expectChecked('radio-uncontrolled-b', true);
	await shot.click('radio-uncontrolled-a');
	shot.expectChecked('radio-uncontrolled-a', true);
	shot.expectChecked('radio-uncontrolled-b', false);

	await shot.focus('radio-skip-a');
	await shot.keys('ArrowDown');
	shot.expectFocused('radio-skip-c');
	shot.expectChecked('radio-skip-c', true);
	await shot.keys('ArrowDown');
	shot.expectFocused('radio-skip-a');
	shot.expectChecked('radio-skip-a', true);

	await shot.press('radio-pressed');
	await shot.capture('pressed');
	await shot.release();
}
