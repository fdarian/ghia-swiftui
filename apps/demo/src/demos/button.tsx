import { Button, type ButtonVariant, Icon, Text } from 'ghia-swiftui';
import { createSignal, For, type JSX } from 'solid-js';
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
const iconVariants: readonly ButtonVariant[] = [
	'accent',
	'glassAccent',
	'filled',
	'transparent',
	'glass',
];
const radii = ['rounded', 'full'] as const;
const stateVariants = [
	'filled',
	'transparent',
	'glass',
	'glassAccent',
] as const;

function StyleRow(props: { label: string; children: JSX.Element }) {
	return (
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
					{props.label}
				</Text>
			</div>
			{props.children}
		</div>
	);
}

export function ButtonDemo() {
	const [count, setCount] = createSignal(0);
	return (
		<Page title="Button">
			<Section title="Variant by size">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<For each={variants}>
						{(variant) => (
							<StyleRow label={variant}>
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
							</StyleRow>
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
			<Section title="Icon only by style">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<For each={iconVariants}>
						{(variant) => (
							<StyleRow label={variant}>
								<For each={sizes}>
									{(size) => (
										<Button
											iconOnly
											variant={variant}
											size={size}
											aria-label="Delete"
										>
											<Icon name="trash" />
										</Button>
									)}
								</For>
							</StyleRow>
						)}
					</For>
				</div>
			</Section>
			<Section title="Radius">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<For each={radii}>
						{(radius) => (
							<StyleRow label={radius}>
								<For each={sizes}>
									{(size) => (
										<Button radius={radius} size={size}>
											{size}
										</Button>
									)}
								</For>
							</StyleRow>
						)}
					</For>
				</div>
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
	await shot.hover('state-glassAccent-hover');
	await shot.capture('hover-glass-accent');
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
