import { Badge, type BadgeColor, Icon, Text } from 'ghia-swiftui';
import { For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';

const colors: readonly BadgeColor[] = [
	'primary',
	'secondary',
	'blue',
	'green',
	'yellow',
	'orange',
	'red',
	'purple',
	'magenta',
];

export function BadgeDemo() {
	return (
		<Page title="Badge">
			<For each={['small', 'medium'] as const}>
				{(size) => (
					<Section title={`Size ${size}`}>
						<Row>
							<For each={colors}>
								{(color) => (
									<Cell label={color}>
										<Badge color={color} size={size}>
											{color}
										</Badge>
									</Cell>
								)}
							</For>
						</Row>
					</Section>
				)}
			</For>
			<Section title="Leading icon (scales with size)">
				<Row>
					<For each={['small', 'medium'] as const}>
						{(size) => (
							<Cell label={size}>
								<Badge color="green" size={size}>
									<Icon name="circle-check" />
									Synced
								</Badge>
							</Cell>
						)}
					</For>
					<Cell label="count">
						<Badge color="red">12</Badge>
					</Cell>
					<Cell label="in a sentence">
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								gap: 8,
							}}
						>
							<Text>Inbox</Text>
							<Badge>3 new</Badge>
						</div>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}
