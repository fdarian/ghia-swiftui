import { Text, type TextColor, type TextVariant } from 'ghia-swiftui';
import { typography } from 'ghia-swiftui/tokens/typography';
import { For } from 'solid-js';
import { Cell, Page, Row, Section, Surface } from '#src/demo-kit.tsx';

const variants = Object.keys(typography.variants) as TextVariant[];
const colors: readonly TextColor[] = [
	'primary',
	'secondary',
	'tertiary',
	'quaternary',
	'disabled',
	'link',
	'accent',
	'red',
	'orange',
	'yellow',
	'green',
	'blue',
	'purple',
	'magenta',
];

export function TextDemo() {
	return (
		<Page title="Text">
			<Section title="Variant">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
					<For each={variants}>
						{(variant) => (
							<div
								style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'baseline',
									gap: 16,
								}}
							>
								<div style={{ width: 120, flexShrink: 0 }}>
									<Text variant="small" color="tertiary">
										{variant}
									</Text>
								</div>
								<Text variant={variant}>
									Sphinx of black quartz, judge my vow
								</Text>
							</div>
						)}
					</For>
				</div>
			</Section>
			<Section title="Color">
				<Row gap={20}>
					<For each={colors}>
						{(color) => (
							<Cell label={color}>
								<Text variant="strong" color={color}>
									Aa Text
								</Text>
							</Cell>
						)}
					</For>
					<Cell label="inherit (from parent)">
						<div style={{ color: '#a64dff' }}>
							<Text variant="strong" color="inherit">
								Aa Text
							</Text>
						</div>
					</Cell>
				</Row>
			</Section>
			<Section title="Align and truncate">
				<Row>
					<For each={['left', 'center', 'right'] as const}>
						{(align) => (
							<Cell label={`align ${align}`}>
								<Surface style={{ width: 200, padding: 8 }}>
									<Text align={align} style={{ width: '100%' }}>
										{align}
									</Text>
								</Surface>
							</Cell>
						)}
					</For>
					<Cell label="truncate, 160px">
						<Surface style={{ width: 160, padding: 8 }}>
							<Text truncate>A long line that does not fit its box</Text>
						</Surface>
					</Cell>
				</Row>
			</Section>
			<Section title="as (heading role)">
				<Row gap={20}>
					<For each={['h1', 'h2', 'h3', 'h4'] as const}>
						{(tag) => (
							<Text as={tag} variant="strong">
								{tag}
							</Text>
						)}
					</For>
				</Row>
			</Section>
		</Page>
	);
}
