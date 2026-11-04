import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	type SelectTriggerSize,
	type SelectTriggerVariant,
	SelectValue,
	Text,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const variants: readonly SelectTriggerVariant[] = [
	'default',
	'transparent',
	'glass',
];
const sizes: readonly SelectTriggerSize[] = ['small', 'medium', 'large'];

const sources = [
	{ value: 'apple-music', label: 'Apple Music' },
	{ value: 'spotify', label: 'Spotify' },
	{ value: 'tidal', label: 'Tidal' },
	{ value: 'youtube', label: 'YouTube Music' },
] as const;

const zones = Array.from({ length: 24 }, (_, index) => ({
	value: `utc-${index}`,
	label: `UTC${index < 12 ? '-' : '+'}${String(Math.abs(index - 12)).padStart(2, '0')}:00`,
}));

export function SelectDemo() {
	const [source, setSource] = createSignal('spotify');
	const [opens, setOpens] = createSignal(0);
	return (
		<Page title="Select">
			<Section title="Aligned item past the window's top edge (8 items, last selected)">
				<Select defaultValue="utc-7">
					<SelectTrigger testId="select-edge" size="small">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<For each={zones.slice(0, 8)}>
							{(zone) => (
								<SelectItem value={zone.value}>{zone.label}</SelectItem>
							)}
						</For>
					</SelectContent>
				</Select>
			</Section>
			<Section title="Trigger variant by size (value: Spotify)">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<For each={variants}>
						{(variant) => (
							<Row gap={24}>
								<For each={sizes}>
									{(size) => (
										<Cell label={`${variant} ${size}`}>
											<Select defaultValue="spotify">
												<SelectTrigger
													testId={`select-${variant}-${size}`}
													variant={variant}
													size={size}
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<For each={sources}>
														{(item) => (
															<SelectItem value={item.value}>
																{item.label}
															</SelectItem>
														)}
													</For>
												</SelectContent>
											</Select>
										</Cell>
									)}
								</For>
							</Row>
						)}
					</For>
				</div>
			</Section>
			<Section title="Controlled, open count, placeholder, disabled">
				<Row gap={24}>
					<Cell label="controlled">
						<Select
							value={source()}
							onValueChange={setSource}
							onOpenChange={(open) => {
								if (open) setOpens(opens() + 1);
							}}
						>
							<SelectTrigger testId="select-controlled">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<For each={sources}>
									{(item) => (
										<SelectItem
											testId={`select-controlled-${item.value}`}
											value={item.value}
											disabled={item.value === 'tidal'}
										>
											{item.label}
										</SelectItem>
									)}
								</For>
							</SelectContent>
						</Select>
					</Cell>
					<Cell label="value">
						<Text testId="select-value">{source()}</Text>
					</Cell>
					<Cell label="opened">
						<Text testId="select-opens">{`${opens()}`}</Text>
					</Cell>
					<Cell label="no value: placeholder">
						<Select>
							<SelectTrigger testId="select-empty">
								<SelectValue placeholder="Choose a player" />
							</SelectTrigger>
							<SelectContent>
								<For each={sources}>
									{(item) => (
										<SelectItem
											testId={`select-empty-${item.value}`}
											value={item.value}
										>
											{item.label}
										</SelectItem>
									)}
								</For>
							</SelectContent>
						</Select>
					</Cell>
					<Cell label="disabled">
						<Select disabled defaultValue="spotify">
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="spotify">Spotify</SelectItem>
							</SelectContent>
						</Select>
					</Cell>
				</Row>
			</Section>
			<Section title="Long list (opens below, scrolls)">
				<Select defaultValue="utc-12">
					<SelectTrigger testId="select-long">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<For each={zones}>
							{(zone) => (
								<SelectItem value={zone.value}>{zone.label}</SelectItem>
							)}
						</For>
					</SelectContent>
				</Select>
			</Section>
		</Page>
	);
}

export async function selectScenario(shot: Shot) {
	await shot.click('select-default-medium');
	await shot.capture('open-default');
	await shot.keys('Escape');
	await shot.wait(300);

	await shot.click('select-transparent-small');
	await shot.capture('open-transparent');
	await shot.keys('Escape');
	await shot.wait(300);

	await shot.click('select-glass-large');
	await shot.capture('open-glass');
	await shot.keys('Escape');
	await shot.wait(300);

	await shot.click('select-empty');
	await shot.capture('open-empty');
	await shot.click('select-empty-tidal');
	await shot.wait(400);
	shot.expectAbsent('select-empty-tidal');

	await shot.click('select-controlled');
	shot.expectText('select-opens', '1');
	// A pointer open hands focus to the picked row, so the arrows move from it and step over the disabled Tidal.
	shot.expectFocused('select-controlled-spotify');
	await shot.keys('ArrowDown');
	shot.expectFocused('select-controlled-youtube');
	await shot.keys('ArrowUp');
	shot.expectFocused('select-controlled-spotify');
	await shot.click('select-controlled-apple-music');
	await shot.wait(400);
	shot.expectText('select-value', 'apple-music');
	shot.expectAbsent('select-controlled-apple-music');

	await shot.click('select-controlled');
	await shot.click('select-controlled-tidal');
	shot.expectText('select-value', 'apple-music');
	// The pointer left every row, so the first arrow lands on the first one.
	await shot.keys('ArrowDown ArrowDown');
	await shot.keys('Enter');
	await shot.wait(400);
	shot.expectText('select-value', 'spotify');

	await shot.click('select-edge');
	await shot.capture('open-edge');
	await shot.keys('Escape');
	await shot.wait(300);

	await shot.click('select-long');
	await shot.capture('open-long');
	await shot.keys('Escape');
	await shot.wait(300);
}
