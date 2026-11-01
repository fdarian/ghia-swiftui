import {
	Button,
	GlassPanel,
	Icon,
	Separator,
	Status,
	Text,
} from 'ghia-swiftui';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

/** Coloured, high-contrast content for the glass to blur: stripes under a gradient. */
function Backdrop(props: { children: import('solid-js').JSX.Element }) {
	return (
		<div
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width: 420,
				height: 150,
				borderRadius: 12,
				overflow: 'hidden',
				backgroundImage:
					'repeating-linear-gradient(45deg, #ff6b6b 0 14px, #ffd93d 14px 28px, #4dabf7 28px 42px, #51cf66 42px 56px)',
			}}
		>
			{props.children}
		</div>
	);
}

export function GlassPanelDemo() {
	return (
		<Page title="GlassPanel">
			<Section title="Floating over content">
				<Row>
					<Cell label="action bar of glass buttons">
						<Backdrop>
							<GlassPanel testId="glass-panel">
								<Button
									testId="glass-bold"
									iconOnly
									variant="glass"
									aria-label="Star"
								>
									<Icon name="star" />
								</Button>
								<Button iconOnly variant="glass" aria-label="Download">
									<Icon name="download" />
								</Button>
								<Separator orientation="vertical" style={{ height: 16 }} />
								<Button testId="glass-share" variant="glass">
									Share
								</Button>
								<Button variant="glassAccent">Publish</Button>
							</GlassPanel>
						</Backdrop>
					</Cell>
					<Cell label="with a status pill and text">
						<Backdrop>
							<GlassPanel style={{ padding: 10, gap: 10 }}>
								<Status variant="success">Connected</Status>
								<Text variant="strong">3 files changed</Text>
							</GlassPanel>
						</Backdrop>
					</Cell>
				</Row>
			</Section>
			<Section title="On the page background (no content to blur)">
				<GlassPanel style={{ width: 'fit-content' }}>
					<Button variant="glass">Back</Button>
					<Button variant="glass">Forward</Button>
				</GlassPanel>
			</Section>
		</Page>
	);
}

export async function glassPanelScenario(shot: Shot) {
	await shot.hover('glass-share');
	await shot.capture('hover-button');
	await shot.press('glass-share');
	await shot.capture('press-button');
	await shot.release();
}
