import { Separator, Text } from 'ghia-swiftui';
import { Cell, Page, Row, Section, Surface } from '#src/demo-kit.tsx';

export function SeparatorDemo() {
	return (
		<Page title="Separator">
			<Section title="Horizontal">
				<Surface style={{ width: 320 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<Text>General</Text>
						<Separator />
						<Text>Appearance</Text>
						<Separator />
						<Text>Advanced</Text>
					</div>
				</Surface>
			</Section>
			<Section title="Vertical">
				<Row gap={12}>
					<Cell label="needs a parent with a height">
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								gap: 12,
								height: 24,
							}}
						>
							<Text>Back</Text>
							<Separator orientation="vertical" />
							<Text>Forward</Text>
							<Separator orientation="vertical" />
							<Text>Reload</Text>
						</div>
					</Cell>
				</Row>
			</Section>
			<Section title="Custom style">
				<Surface style={{ width: 320 }}>
					<Separator style={{ height: 2, backgroundColor: '#ff3b30' }} />
				</Surface>
			</Section>
		</Page>
	);
}
