import {
	Icon,
	Input,
	type InputSize,
	type InputVariant,
	Text,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const variants: readonly InputVariant[] = ['default', 'filled'];
const sizes: readonly InputSize[] = ['small', 'medium', 'large'];

export function InputDemo() {
	const [text, setText] = createSignal('');
	return (
		<Page title="Input">
			<Section title="Variant by size">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<For each={variants}>
						{(variant) => (
							<Row>
								<For each={sizes}>
									{(size) => (
										<Cell label={`${variant} ${size}`}>
											<Input
												variant={variant}
												size={size}
												placeholder="Placeholder"
												style={{ width: 180 }}
											/>
										</Cell>
									)}
								</For>
							</Row>
						)}
					</For>
				</div>
			</Section>
			<Section title="State">
				<Row>
					<Cell label="with value">
						<Input value="Hello, world" style={{ width: 180 }} />
					</Cell>
					<Cell label="focused (default)">
						<Input
							testId="input-focus"
							placeholder="Placeholder"
							style={{ width: 180 }}
						/>
					</Cell>
					<Cell label="focused (filled)">
						<Input
							testId="input-focus-filled"
							variant="filled"
							placeholder="Placeholder"
							style={{ width: 180 }}
						/>
					</Cell>
					<Cell label="invalid">
						<Input aria-invalid value="not an email" style={{ width: 180 }} />
					</Cell>
					<Cell label="disabled">
						<Input disabled value="Read only" style={{ width: 180 }} />
					</Cell>
					<Cell label="disabled filled">
						<Input
							disabled
							variant="filled"
							placeholder="Placeholder"
							style={{ width: 180 }}
						/>
					</Cell>
				</Row>
			</Section>
			<Section title="Glass">
				<Row>
					<Cell label="glass">
						<Input
							variant="glass"
							leading={<Icon name="search" />}
							placeholder="Search"
							style={{ width: 240 }}
						/>
					</Cell>
					<Cell label="focused">
						<Input
							testId="input-glass-focus"
							variant="glass"
							leading={<Icon name="search" />}
							placeholder="Search"
							style={{ width: 240 }}
						/>
					</Cell>
					<Cell label="with value">
						<Input
							variant="glass"
							leading={<Icon name="search" />}
							value="Invoices"
							style={{ width: 240 }}
						/>
					</Cell>
					<Cell label="disabled">
						<Input
							disabled
							variant="glass"
							leading={<Icon name="search" />}
							placeholder="Search"
							style={{ width: 240 }}
						/>
					</Cell>
				</Row>
			</Section>
			<Section title="Typing (controlled)">
				<Row>
					<Cell label="type here">
						<Input
							testId="input-typing"
							placeholder="Type here"
							value={text()}
							onValueChange={setText}
							style={{ width: 220 }}
						/>
					</Cell>
					<Cell label="mirrors the value">
						<Text testId="input-mirror">{text()}</Text>
					</Cell>
					<Cell label="password">
						<Input type="password" value="hunter2" style={{ width: 180 }} />
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function inputScenario(shot: Shot) {
	await shot.focus('input-focus');
	await shot.capture('focus');
	await shot.focus('input-focus-filled');
	await shot.capture('focus-filled');

	await shot.focus('input-glass-focus');
	await shot.wait(500);
	await shot.capture('focus-glass');

	await shot.focus('input-typing');
	await shot.keys('h e l l o');
	shot.expectText('input-mirror', 'hello');
	await shot.capture('typed');
}
