import {
	ShortcutRecorder,
	type ShortcutRecorderSize,
	Text,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const sizes: readonly ShortcutRecorderSize[] = ['small', 'medium', 'large'];

export function ShortcutRecorderDemo() {
	const [value, setValue] = createSignal<string | null>(null);
	return (
		<Page title="ShortcutRecorder">
			<Section title="Size">
				<Row gap={24}>
					<For each={sizes}>
						{(size) => (
							<Cell label={size}>
								<ShortcutRecorder
									value="Control+Alt+KeyK"
									onValueChange={() => {}}
									size={size}
								/>
							</Cell>
						)}
					</For>
				</Row>
			</Section>
			<Section title="State">
				<Row gap={24}>
					<Cell label="empty">
						<ShortcutRecorder value={null} onValueChange={() => {}} />
					</Cell>
					<Cell label="symbols and named keys">
						<ShortcutRecorder
							value="Control+Alt+Shift+Cmd+ArrowUp"
							onValueChange={() => {}}
						/>
					</Cell>
					<Cell label="digit">
						<ShortcutRecorder value="Cmd+Digit5" onValueChange={() => {}} />
					</Cell>
					<Cell label="disabled">
						<ShortcutRecorder
							disabled
							value="Cmd+Shift+Space"
							onValueChange={() => {}}
						/>
					</Cell>
				</Row>
			</Section>
			<Section title="Recording (click, then press a chord with a modifier)">
				<Row gap={24}>
					<Cell label="controlled">
						<ShortcutRecorder
							testId="shortcut"
							value={value()}
							onValueChange={setValue}
						/>
					</Cell>
					<Cell label="stored value">
						<Text testId="shortcut-value">{`${value()}`}</Text>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function shortcutRecorderScenario(shot: Shot) {
	await shot.click('shortcut');
	await shot.capture('recording');

	await shot.keys('k');
	await shot.capture('rejected');
	shot.expectText('shortcut-value', 'null');

	await shot.keys('Escape');
	shot.expectText('shortcut-value', 'null');

	await shot.click('shortcut');
	await shot.keys('Control+Alt+k');
	shot.expectText('shortcut-value', 'Control+Alt+KeyK');
	await shot.capture('recorded');

	// Enter on the focused box starts recording again.
	await shot.keys('Enter');
	await shot.keys('Meta+Shift+Space');
	shot.expectText('shortcut-value', 'Shift+Cmd+Space');

	await shot.click('shortcut-clear');
	shot.expectText('shortcut-value', 'null');
}
