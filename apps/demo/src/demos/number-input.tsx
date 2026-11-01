import {
	NumberInput,
	type NumberInputSize,
	type NumberInputVariant,
	Text,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const variants: readonly NumberInputVariant[] = ['default', 'filled'];
const sizes: readonly NumberInputSize[] = ['small', 'medium', 'large'];

export function NumberInputDemo() {
	const [days, setDays] = createSignal<number | null>(30);
	const [events, setEvents] = createSignal<string[]>([]);
	return (
		<Page title="NumberInput">
			<Section title="Variant by size (unit, steppers)">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<For each={variants}>
						{(variant) => (
							<Row>
								<For each={sizes}>
									{(size) => (
										<Cell label={`${variant} ${size}`}>
											<NumberInput
												variant={variant}
												size={size}
												defaultValue={12}
												unit="pt"
												style={{ width: 140 }}
											/>
										</Cell>
									)}
								</For>
							</Row>
						)}
					</For>
				</div>
			</Section>
			<Section title="Chrome">
				<Row>
					<Cell label="no unit">
						<NumberInput defaultValue={42} style={{ width: 140 }} />
					</Cell>
					<Cell label="no steppers">
						<NumberInput
							defaultValue={42}
							unit="px"
							steppers={false}
							style={{ width: 140 }}
						/>
					</Cell>
					<Cell label="empty (placeholder)">
						<NumberInput placeholder="0" style={{ width: 140 }} />
					</Cell>
					<Cell label="invalid">
						<NumberInput
							aria-invalid
							defaultValue={999}
							style={{ width: 140 }}
						/>
					</Cell>
					<Cell label="disabled">
						<NumberInput disabled defaultValue={7} style={{ width: 140 }} />
					</Cell>
				</Row>
			</Section>
			<Section title="Focus">
				<Row>
					<Cell label="focused (default)">
						<NumberInput
							testId="number-focus"
							defaultValue={5}
							unit="days"
							style={{ width: 140 }}
						/>
					</Cell>
					<Cell label="focused (filled)">
						<NumberInput
							testId="number-focus-filled"
							variant="filled"
							defaultValue={5}
							unit="days"
							style={{ width: 140 }}
						/>
					</Cell>
					<Cell label="stepper pressed">
						<NumberInput
							testId="number-pressed"
							defaultValue={5}
							style={{ width: 140 }}
						/>
					</Cell>
				</Row>
			</Section>
			<Section title="Controlled, min 1, max 365, step 1">
				<Row>
					<Cell label="keep history for">
						<NumberInput
							testId="number-days"
							value={days()}
							onValueChange={(value) => {
								setDays(value);
								setEvents([...events(), String(value)]);
							}}
							unit="days"
							min={1}
							max={365}
							size="small"
							style={{ width: 140 }}
						/>
					</Cell>
					<Cell label="value">
						<Text testId="number-days-value">{`${days()}`}</Text>
					</Cell>
					<Cell label="events">
						<Text testId="number-days-events">{events().join(',')}</Text>
					</Cell>
				</Row>
			</Section>
			<Section title="Decimal step 0.1, range 0 to 1">
				<NumberInput
					testId="number-decimal"
					defaultValue={0.2}
					min={0}
					max={1}
					step={0.1}
					style={{ width: 140 }}
				/>
			</Section>
		</Page>
	);
}

export async function numberInputScenario(shot: Shot) {
	// First: the ring only shows while the last input was the keyboard, and a click flips that.
	await shot.focus('number-focus');
	await shot.capture('focus');
	await shot.focus('number-focus-filled');
	await shot.capture('focus-filled');

	await shot.click('number-days-increment');
	shot.expectText('number-days-value', '31');
	await shot.click('number-days-decrement');
	await shot.click('number-days-decrement');
	shot.expectText('number-days-value', '29');
	shot.expectFocused('number-days');

	await shot.keys('ArrowUp');
	shot.expectText('number-days-value', '30');
	await shot.keys('Meta+a 1 2 3 4');
	shot.expectText('number-days-value', '1234');
	shot.expectText('number-days-events', '31,30,29,30,1,12,123,1234');

	await shot.click('number-decimal-increment');
	await shot.click('number-decimal-increment');
	shot.expectFocused('number-decimal');
	await shot.press('number-pressed-increment');
	await shot.capture('stepper-pressed');
	await shot.release();
}
