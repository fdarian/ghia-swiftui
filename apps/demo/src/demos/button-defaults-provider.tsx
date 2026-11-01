import { Button, ButtonDefaultsProvider, Icon } from 'ghia-swiftui';
import { createSignal } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

export function ButtonDefaultsProviderDemo() {
	const [size, setSize] = createSignal<'small' | 'large'>('small');
	return (
		<Page title="ButtonDefaultsProvider">
			<Section title="No provider (variant filled, size medium, radius full)">
				<Row>
					<Button>Cancel</Button>
					<Button>Save</Button>
				</Row>
			</Section>
			<Section title="Provider: glass, small, rounded">
				<ButtonDefaultsProvider
					value={{ variant: 'glass', size: 'small', radius: 'rounded' }}
				>
					<Row>
						<Cell label="inherits all three">
							<Button testId="defaults-inherit">Back</Button>
						</Cell>
						<Cell label="size overridden by prop">
							<Button size="large">Large</Button>
						</Cell>
						<Cell label="variant overridden by prop">
							<Button variant="accent">Accent</Button>
						</Cell>
						<Cell label="icon only">
							<Button iconOnly aria-label="Search">
								<Icon name="search" />
							</Button>
						</Cell>
					</Row>
				</ButtonDefaultsProvider>
			</Section>
			<Section title="Nested provider replaces the outer one">
				<ButtonDefaultsProvider value={{ variant: 'muted', size: 'large' }}>
					<Row>
						<Cell label="outer: muted, large">
							<Button>Outer</Button>
						</Cell>
						<ButtonDefaultsProvider value={{ variant: 'accent' }}>
							<Cell label="inner: accent, size from nothing (medium)">
								<Button>Inner</Button>
							</Cell>
						</ButtonDefaultsProvider>
					</Row>
				</ButtonDefaultsProvider>
			</Section>
			<Section title="Reactive value">
				<ButtonDefaultsProvider value={{ size: size() }}>
					<Row>
						<Button testId="defaults-reactive" onClick={() => setSize('large')}>
							{size() === 'small' ? 'Small, click to grow' : 'Large now'}
						</Button>
					</Row>
				</ButtonDefaultsProvider>
			</Section>
		</Page>
	);
}

export async function buttonDefaultsProviderScenario(shot: Shot) {
	await shot.click('defaults-reactive');
	await shot.capture('after-resize');
}
