import { Button, colorScheme, setAccentColor, Text } from 'ghia-swiftui';
import { colors } from 'ghia-swiftui/tokens/colors';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { style } from 'ghia-swiftui/tokens/style';
import { For, type JSX } from 'solid-js';
import { Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const seeds = [
	'bg',
	'fg',
	'themeAccent',
	'accent',
	'red',
	'orange',
	'yellow',
	'green',
	'blue',
	'purple',
	'magenta',
] as const;
const steps = [0, 5, 10, 20, 40, 60, 80] as const;
const radii = [
	'radius2',
	'radius4',
	'radius6',
	'radius8',
	'radius10',
	'radius12',
	'radius16',
	'radius18',
	'radius20',
	'radius26',
	'radiusPill',
] as const;
const surfaces = [
	'surfaceControl',
	'surfaceControlSubtle',
	'surfaceControlActive',
	'surfaceWell',
	'surfaceInput',
	'surfaceListHover',
	'surfaceListSelection',
	'surfacePopover',
	'surfacePopoverHover',
] as const;
const borders = [
	'borderPrimary',
	'borderSecondary',
	'borderTertiary',
	'borderSeparator',
	'borderField',
] as const;
const texts = [
	'textPrimary',
	'textSecondary',
	'textTertiary',
	'textQuaternary',
	'textDisabled',
	'textLink',
	'textPlaceholder',
] as const;

function Swatch(props: { name: string; color: string; size?: number }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				width: props.size ?? 64,
			}}
		>
			<div
				style={{
					height: 36,
					borderRadius: 8,
					backgroundColor: props.color,
					borderWidth: 1,
					borderStyle: 'solid',
					borderColor: semanticColors.borderSecondary,
				}}
			/>
			<Text variant="mini" color="tertiary" truncate>
				{props.name}
			</Text>
		</div>
	);
}

function Card(props: { name: string; shadow: string; children?: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: 150,
				height: 80,
				borderRadius: style.radiusPanel,
				backgroundColor: semanticColors.surfacePopover,
				boxShadow: props.shadow,
			}}
		>
			<Text variant="small" color="secondary">
				{props.name}
			</Text>
		</div>
	);
}

export function TokensDemo() {
	return (
		<Page title="Tokens">
			<Section title="Scheme and accent">
				<Row>
					<Text testId="scheme-name">{colorScheme()}</Text>
					<Button
						testId="accent-pink"
						variant="accent"
						size="small"
						onClick={() => setAccentColor('#ff2d55')}
					>
						Pink accent
					</Button>
					<Button
						testId="accent-default"
						size="small"
						onClick={() => setAccentColor(undefined)}
					>
						Default accent
					</Button>
				</Row>
			</Section>
			<Section title="Seeds">
				<Row gap={12}>
					<For each={seeds}>
						{(name) => <Swatch name={name} color={colors[name]} />}
					</For>
				</Row>
			</Section>
			<Section title="Alpha ramps (fg, accent, red)">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<For each={['fg', 'accent', 'supportRed'] as const}>
						{(base) => (
							<Row gap={12}>
								<For each={steps}>
									{(step) => (
										<Swatch
											name={`${base}${step}`}
											color={colors[`${base}${step}`]}
										/>
									)}
								</For>
							</Row>
						)}
					</For>
				</div>
			</Section>
			<Section title="Semantic: text, surfaces, borders">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<Row gap={16}>
						<For each={texts}>
							{(name) => (
								<div style={{ color: semanticColors[name] }}>
									<Text variant="strong" color="inherit">
										{name.replace('text', '')}
									</Text>
								</div>
							)}
						</For>
					</Row>
					<Row gap={12}>
						<For each={surfaces}>
							{(name) => (
								<Swatch
									name={name.replace('surface', '')}
									color={semanticColors[name]}
								/>
							)}
						</For>
					</Row>
					<Row gap={12}>
						<For each={borders}>
							{(name) => (
								<div style={{ width: 64 }}>
									<div
										style={{
											height: 36,
											borderRadius: 8,
											borderWidth: 1,
											borderStyle: 'solid',
											borderColor: semanticColors[name],
										}}
									/>
									<Text variant="mini" color="tertiary" truncate>
										{name.replace('border', '')}
									</Text>
								</div>
							)}
						</For>
					</Row>
				</div>
			</Section>
			<Section title="Radius">
				<Row gap={10}>
					<For each={radii}>
						{(name) => (
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: 4,
									width: 56,
								}}
							>
								<div
									style={{
										height: 40,
										borderRadius: style[name],
										backgroundColor: semanticColors.surfaceControl,
									}}
								/>
								<Text variant="mini" color="tertiary">
									{name.replace('radius', '')}
								</Text>
							</div>
						)}
					</For>
				</Row>
			</Section>
			<Section title="Shadow">
				<Row gap={24}>
					<Card name="shadowPanel" shadow={style.shadowPanel} />
					<Card name="shadowPopover" shadow={style.shadowPopover} />
					<Card name="shadowDialog" shadow={style.shadowDialog} />
				</Row>
			</Section>
		</Page>
	);
}

export async function tokensScenario(shot: Shot) {
	await shot.click('scheme-dark');
	shot.expectText('scheme-name', 'dark');
	await shot.click('scheme-light');
	shot.expectText('scheme-name', 'light');
	await shot.click('accent-pink');
	await shot.capture('accent-pink');
	await shot.click('accent-default');
}
