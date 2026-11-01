import { Button, type ButtonVariant, Icon, Text } from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const variants: readonly ButtonVariant[] = [
	'accent',
	'destructive',
	'glassAccent',
	'filled',
	'muted',
	'transparent',
	'glass',
];
const sizes = ['small', 'medium', 'large'] as const;
const stateVariants = ['filled', 'transparent', 'glass'] as const;

export function ButtonDemo() {
	const [count, setCount] = createSignal(0);
	return (
		<Page title="Button">
			<Section title="Variant by size">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<For each={variants}>
						{(variant) => (
							<div
								style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									gap: 16,
								}}
							>
								<div style={{ width: 90 }}>
									<Text variant="small" color="tertiary">
										{variant}
									</Text>
								</div>
								<For each={sizes}>
									{(size) => (
										<Button
											testId={`button-${variant}-${size}`}
											variant={variant}
											size={size}
											onClick={() => setCount(count() + 1)}
										>
											{size}
										</Button>
									)}
								</For>
							</div>
						)}
					</For>
				</div>
			</Section>
			<Section title="Icons">
				<Row>
					<Cell label="leading icon">
						<Button variant="accent">
							<Icon name="plus" />
							New item
						</Button>
					</Cell>
					<For each={sizes}>
						{(size) => (
							<Cell label={`iconOnly ${size}`}>
								<Button iconOnly size={size} aria-label="Delete">
									<Icon name="trash" />
								</Button>
							</Cell>
						)}
					</For>
				</Row>
			</Section>
			<Section title="Radius">
				<Row>
					<For each={sizes}>
						{(size) => (
							<Cell label={`rounded ${size}`}>
								<Button radius="rounded" size={size}>
									Rounded
								</Button>
							</Cell>
						)}
					</For>
					<Cell label="full (default)">
						<Button>Full</Button>
					</Cell>
				</Row>
			</Section>
			<Section title="State">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<For each={stateVariants}>
						{(variant) => (
							<Row>
								<Cell label={`${variant} rest`}>
									<Button variant={variant}>Button</Button>
								</Cell>
								<Cell label="hover">
									<Button testId={`state-${variant}-hover`} variant={variant}>
										Button
									</Button>
								</Cell>
								<Cell label="pressed">
									<Button testId={`state-${variant}-pressed`} variant={variant}>
										Button
									</Button>
								</Cell>
								<Cell label="keyboard focus">
									<Button testId={`state-${variant}-focus`} variant={variant}>
										Button
									</Button>
								</Cell>
								<Cell label="disabled">
									<Button disabled variant={variant}>
										Button
									</Button>
								</Cell>
							</Row>
						)}
					</For>
					<Cell label="clicks across the grid above">
						<Text testId="button-count">{`${count()}`}</Text>
					</Cell>
				</div>
			</Section>
		</Page>
	);
}

export async function buttonScenario(shot: Shot) {
	await shot.focus('state-filled-focus');
	await shot.capture('focus');
	await shot.hover('state-transparent-hover');
	await shot.capture('hover-transparent');
	await shot.hover('state-glass-hover');
	await shot.capture('hover-glass');
	await shot.press('state-filled-pressed');
	await shot.capture('pressed-filled');
	await shot.release();
	await shot.press('state-glass-pressed');
	await shot.capture('pressed-glass');
	await shot.release();
	await shot.click('button-accent-medium');
	await shot.click('button-filled-medium');
	shot.expectText('button-count', '2');
}
