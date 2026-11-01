import {
	Button,
	GlassPanel,
	Icon,
	List,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Status,
	Text,
	toast,
} from 'ghia-swiftui';
import { colors } from 'ghia-swiftui/tokens/colors';
import { createSignal, For, type JSX } from 'solid-js';
import { Page, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

/** High-contrast colour for the glass to sample: wide stripes under big blocks. */
function Colourful(props: { height: number; children: JSX.Element }) {
	return (
		<div
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 24,
				height: props.height,
				paddingInline: 24,
				borderRadius: 16,
				overflow: 'hidden',
				backgroundImage:
					'repeating-linear-gradient(90deg, #ff3b30 0 36px, #ffcc00 36px 72px, #34c759 72px 108px, #0a84ff 108px 144px, #bf5af2 144px 180px)',
			}}
		>
			{props.children}
		</div>
	);
}

const tracks = ['Paranoid Android', 'Teardrop', 'Roads'];

export function LiquidGlassDemo() {
	const [selected, setSelected] = createSignal<string | null>(
		tracks[0] ?? null,
	);
	return (
		<Page
			title="Liquid glass"
			subtitle="Real NSGlassEffectView on macOS 26 and later. pnpm screenshot cannot capture it and shows the fallback; pnpm live-capture liquid-glass shows the window"
		>
			<Section title="GlassPanel: regular, clear, tinted">
				<Colourful height={160}>
					<GlassPanel testId="panel-regular" style={{ padding: 16, gap: 8 }}>
						<Text variant="strong">Regular</Text>
					</GlassPanel>
					<GlassPanel
						testId="panel-clear"
						variant="clear"
						style={{ padding: 16, gap: 8 }}
					>
						<Text variant="strong" style={{ color: '#ffffff' }}>
							Clear
						</Text>
					</GlassPanel>
					<GlassPanel
						testId="panel-tinted"
						tint={`${colors.accent}80`}
						style={{ padding: 16, gap: 8 }}
					>
						<Text variant="strong" style={{ color: '#ffffff' }}>
							Tinted
						</Text>
					</GlassPanel>
				</Colourful>
			</Section>
			<Section title="Glass controls over colour">
				<Colourful height={120}>
					<Button testId="glass-button" variant="glass">
						Glass
					</Button>
					<Button testId="glass-icon" variant="glass" iconOnly size="large">
						<Icon name="star" />
					</Button>
					<Button testId="glass-accent" variant="glassAccent">
						Glass accent
					</Button>
					<Status variant="success">Connected</Status>
					<Select defaultValue="spotify">
						<SelectTrigger testId="glass-select" variant="glass">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="spotify">Spotify</SelectItem>
							<SelectItem value="tidal">Tidal</SelectItem>
						</SelectContent>
					</Select>
				</Colourful>
			</Section>
			<Section title="List glassSelection, and a toast">
				<Colourful height={170}>
					<div style={{ width: 280 }}>
						<List.Root
							testId="liquid-list"
							items={tracks}
							selectedItem={selected()}
							onSelectedItemChange={setSelected}
							getItemKey={(track) => track}
						>
							<For each={tracks}>
								{(track) => (
									<List.Item
										item={track}
										glassSelection
										testId={`liquid-${track}`}
									>
										<List.ItemContent>
											<List.ItemTitle>{track}</List.ItemTitle>
										</List.ItemContent>
									</List.Item>
								)}
							</For>
						</List.Root>
					</div>
					<Button
						testId="liquid-toast"
						variant="filled"
						onClick={() => toast.success('Saved to your library')}
					>
						Show a toast
					</Button>
				</Colourful>
			</Section>
		</Page>
	);
}

export async function liquidGlassScenario(shot: Shot) {
	await shot.click('liquid-toast');
	await shot.capture('toast');
}
