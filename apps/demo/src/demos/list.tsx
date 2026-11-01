import {
	Badge,
	Button,
	List,
	type ListRef,
	ScrollArea,
	Text,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Frame, Page, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

interface Track {
	id: string;
	title: string;
	artist: string;
	album: string;
}

const tracks: Track[] = [
	{
		id: 'one',
		title: 'Paranoid Android',
		artist: 'Radiohead',
		album: 'OK Computer',
	},
	{
		id: 'two',
		title: 'Teardrop',
		artist: 'Massive Attack',
		album: 'Mezzanine',
	},
	{ id: 'three', title: 'Roads', artist: 'Portishead', album: 'Dummy' },
	{ id: 'four', title: 'Glory Box', artist: 'Portishead', album: 'Dummy' },
	{ id: 'five', title: 'Hyperballad', artist: 'Björk', album: 'Post' },
	{
		id: 'six',
		title: 'Windowlicker',
		artist: 'Aphex Twin',
		album: 'Windowlicker',
	},
];

const key = (track: Track) => track.id;

function Rows(props: { items: Track[] }) {
	return (
		<For each={props.items}>
			{(track) => (
				<List.Item item={track} testId={`row-${track.id}`}>
					<List.ItemContent>
						<List.ItemTitle>{track.title}</List.ItemTitle>
						<List.ItemDescription>
							{`${track.artist} · ${track.album}`}
						</List.ItemDescription>
					</List.ItemContent>
					<List.ItemAccessory>
						<Badge color="green">Synced</Badge>
						<Text variant="small" color="tertiary">
							3:42
						</Text>
					</List.ItemAccessory>
				</List.Item>
			)}
		</For>
	);
}

function Selectable() {
	const [selected, setSelected] = createSignal<Track | null>(tracks[1] ?? null);
	let list: ListRef | undefined;
	const [keyLog, setKeyLog] = createSignal('');
	return (
		<>
			<div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
				<Button testId="list-focus" size="small" onClick={() => list?.focus()}>
					list.focus()
				</Button>
				<Text variant="small" color="tertiary">
					Selected:
				</Text>
				<Text variant="small" testId="list-selected">
					{selected()?.title ?? 'none'}
				</Text>
				<Text variant="small" color="tertiary">
					Last key:
				</Text>
				<Text variant="small" testId="list-key">
					{keyLog()}
				</Text>
			</div>
			<Frame height={360}>
				<ScrollArea
					testId="list-scroll"
					title="Library"
					subtitle="ArrowUp, ArrowDown, Ctrl+N, Ctrl+P, Home, End"
				>
					<List.Root
						testId="list-selectable"
						items={tracks}
						selectedItem={selected()}
						onSelectedItemChange={setSelected}
						getItemKey={key}
						ref={(handle) => {
							list = handle;
						}}
						onNavigationKeyDown={(event) => setKeyLog(event.key ?? '')}
					>
						<Rows items={tracks} />
					</List.Root>
				</ScrollArea>
			</Frame>
		</>
	);
}

function GlassSelection() {
	const [selected, setSelected] = createSignal<Track | null>(tracks[0] ?? null);
	return (
		<div
			style={{
				borderRadius: 12,
				overflow: 'hidden',
				backgroundImage:
					'linear-gradient(135deg, #5b8def 0%, #b05cf5 55%, #f56f8b 100%)',
			}}
		>
			<List.Root
				testId="list-glass"
				items={tracks.slice(0, 3)}
				selectedItem={selected()}
				onSelectedItemChange={setSelected}
				getItemKey={key}
			>
				<For each={tracks.slice(0, 3)}>
					{(track) => (
						<List.Item item={track} glassSelection testId={`glass-${track.id}`}>
							<List.ItemContent>
								<List.ItemTitle>{track.title}</List.ItemTitle>
							</List.ItemContent>
							<List.ItemAccessory>
								<Text variant="small" color="inherit">
									{track.artist}
								</Text>
							</List.ItemAccessory>
						</List.Item>
					)}
				</For>
			</List.Root>
		</div>
	);
}

function Endless() {
	const [count, setCount] = createSignal(12);
	const [calls, setCalls] = createSignal(0);
	const items = () =>
		Array.from({ length: count() }, (_, index) => ({
			id: `item-${index}`,
			title: `Item ${index + 1}`,
			artist: 'Loaded on demand',
			album: '',
		}));
	return (
		<>
			<div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
				<Text variant="small" color="tertiary">
					Loaded:
				</Text>
				<Text variant="small" testId="endless-count">
					{`${count()}`}
				</Text>
				<Text variant="small" color="tertiary">
					onEndReached calls:
				</Text>
				<Text variant="small" testId="endless-calls">
					{`${calls()}`}
				</Text>
			</div>
			<Frame height={220}>
				<ScrollArea testId="endless-scroll">
					<List.Root
						items={items()}
						getItemKey={key}
						endThreshold={40}
						onEndReached={() => {
							setCalls((now) => now + 1);
							setCount((now) => Math.min(now + 12, 60));
						}}
					>
						<For each={items()}>
							{(track) => (
								<List.Item item={track}>
									<List.ItemContent>
										<List.ItemTitle>{track.title}</List.ItemTitle>
									</List.ItemContent>
								</List.Item>
							)}
						</For>
					</List.Root>
				</ScrollArea>
			</Frame>
		</>
	);
}

const manyRows = Array.from({ length: 5000 }, (_, index) => ({
	id: `row-${index}`,
	title: `Track ${index + 1}`,
	artist: 'Virtualised',
	album: `Record ${Math.floor(index / 12) + 1}`,
}));

function Virtual() {
	const [selected, setSelected] = createSignal<Track | null>(null);
	return (
		<Frame height={240}>
			<List.Root
				testId="list-virtual"
				items={manyRows}
				selectedItem={selected()}
				onSelectedItemChange={setSelected}
				getItemKey={key}
				style={{ height: '100%' }}
			>
				<virtual-list
					estimatedItemHeight={56}
					style={{ flexGrow: 1, minHeight: 0 }}
				>
					<For each={manyRows}>
						{(track) => (
							<List.Item item={track} testId={`virtual-${track.id}`}>
								<List.ItemContent>
									<List.ItemTitle>{track.title}</List.ItemTitle>
									<List.ItemDescription>
										{`${track.artist} · ${track.album}`}
									</List.ItemDescription>
								</List.ItemContent>
							</List.Item>
						)}
					</For>
				</virtual-list>
			</List.Root>
		</Frame>
	);
}

export function ListDemo() {
	return (
		<Page
			title="List"
			subtitle="Single selection, keyboard navigation, end-of-list loading"
		>
			<Section title="Plain: no selection, so no tab stop and no keys">
				<Frame height={230}>
					<ScrollArea>
						<List.Root items={tracks} getItemKey={key}>
							<Rows items={tracks.slice(0, 3)} />
						</List.Root>
					</ScrollArea>
				</Frame>
			</Section>
			<Section title="Selection and keyboard">
				<Selectable />
			</Section>
			<Section title="glassSelection: the selected row is the glass material">
				<GlassSelection />
			</Section>
			<Section title="endThreshold and onEndReached: loads more as the end nears">
				<Endless />
			</Section>
			<Section title="Rows of a long list in a virtual-list: 5,000, only the visible ones built">
				<Virtual />
			</Section>
		</Page>
	);
}

export async function listScenario(shot: Shot) {
	shot.expectText('list-selected', 'Teardrop');
	await shot.capture('selection');

	// A click selects.
	await shot.click('row-four');
	shot.expectText('list-selected', 'Glory Box');

	// Keys: the list is the tab stop, focused as the user would arrive at it.
	await shot.click('list-focus');
	await shot.keys('ArrowDown');
	shot.expectText('list-selected', 'Hyperballad');
	await shot.keys('Control+p');
	shot.expectText('list-selected', 'Glory Box');
	await shot.keys('Home');
	shot.expectText('list-selected', 'Paranoid Android');
	await shot.keys('End');
	shot.expectText('list-selected', 'Windowlicker');
	shot.expectText('list-key', 'End');
	await shot.capture('end-selected');

	await shot.reveal('glass-three');
	await shot.click('glass-three');
	await shot.capture('glass-selection');

	await shot.reveal('endless-count');
	// Reaching the end loads another page; the first fires on its own, as the list is short.
	await shot.wait(300);
	const first = shot.scrollMetrics('endless-scroll-viewport');
	await shot.scrollTo('endless-scroll-viewport', first.scrollHeight);
	await shot.wait(400);
	shot.expectText('endless-count', '24');
	await shot.capture('endless');

	// The virtual list builds a window of its rows.
	await shot.reveal('virtual-row-1');
	shot.expectPresent('virtual-row-0');
	shot.expectNotPainted('virtual-row-4000');
	await shot.click('virtual-row-1');
	await shot.capture('virtual');
}
