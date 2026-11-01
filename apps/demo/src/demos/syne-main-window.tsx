import {
	Badge,
	Button,
	Checkbox,
	EmptyState,
	EmptyStateDescription,
	EmptyStateTitle,
	Icon,
	type IconName,
	List,
	ScrollArea,
	Sidebar,
	SidebarFooter,
	SidebarList,
	SidebarListItem,
	SplitView,
	Status,
	showContextMenu,
	Text,
	toast,
} from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { Frame, Page } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

/*
 * The composition of syne's main window (`apps/desktop/src/main/root-view.tsx`,
 * `app-sidebar.tsx`, `history-view.tsx`) over canned data: a SplitView with an
 * AppSidebar (now playing, navigation, a Settings row in the footer) and the
 * history, sync log and integration views.
 */

interface Track {
	id: number;
	title: string;
	artist: string;
	album: string;
	scrobbled: boolean;
	playedAt: string;
}

const SONGS: Array<Pick<Track, 'title' | 'artist' | 'album'>> = [
	{ title: 'Paranoid Android', artist: 'Radiohead', album: 'OK Computer' },
	{ title: 'Teardrop', artist: 'Massive Attack', album: 'Mezzanine' },
	{ title: 'Roads', artist: 'Portishead', album: 'Dummy' },
	{ title: 'Glory Box', artist: 'Portishead', album: 'Dummy' },
	{ title: 'Hyperballad', artist: 'Björk', album: 'Post' },
	{ title: 'Windowlicker', artist: 'Aphex Twin', album: 'Windowlicker' },
	{ title: 'Pyramid Song', artist: 'Radiohead', album: 'Amnesiac' },
	{ title: 'Angel', artist: 'Massive Attack', album: 'Mezzanine' },
];

const PAGE = 14;
const TOTAL = 42;

function trackAt(id: number): Track {
	const song = SONGS[id % SONGS.length];
	if (song === undefined) throw new Error('no song');
	return {
		id,
		...song,
		scrobbled: id % 3 === 0,
		playedAt: id < 3 ? `${id + 1}m ago` : `${Math.floor(id / 2) + 1}h ago`,
	};
}

type NavId = 'history' | 'sync-log' | 'account';

const NAV: Array<{ id: NavId; title: string; icon: IconName }> = [
	{ id: 'history', title: 'History', icon: 'clock' },
	{ id: 'sync-log', title: 'Sync Log', icon: 'scroll-text' },
	{ id: 'account', title: 'Integration', icon: 'user-round' },
];

function AlbumArt(props: { size: number; tint?: string }) {
	return (
		<div
			style={{
				width: props.size,
				height: props.size,
				flexShrink: 0,
				borderRadius: 6,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: props.tint ?? semanticColors.surfaceControl,
				color: semanticColors.textSecondary,
			}}
		>
			<Icon name="music" size={props.size / 2.2} />
		</div>
	);
}

/**
 * Inline, not pinned: this window sits inside the demo window, so its left
 * edge is not where the traffic lights are, and the primary toolbar has to
 * hold the toggle or a collapsed sidebar could not be reopened.
 */
function SidebarToggle() {
	return (
		<SplitView.SidebarToggle testId="syne-sidebar-toggle" pinned={false} />
	);
}

function AppSidebar(props: {
	selected: NavId;
	onSelect: (id: NavId) => void;
	skipped: boolean;
	onToggleSkip: () => void;
}) {
	const selectedItem = () => NAV.find((item) => item.id === props.selected);
	return (
		<Sidebar
			footer={
				<SidebarFooter>
					<SidebarListItem
						testId="syne-settings"
						icon={<Icon name="settings" />}
						title="Settings"
						onClick={() => toast.info('Settings would open its own window')}
					/>
				</SidebarFooter>
			}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 4,
					minWidth: 0,
					paddingInline: 12,
					paddingTop: 4,
					paddingBottom: 12,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
						minWidth: 0,
					}}
				>
					<AlbumArt size={32} />
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							flexGrow: 1,
							flexShrink: 1,
							flexBasis: 0,
							minWidth: 0,
						}}
					>
						<Text variant="smallStrong" truncate>
							Teardrop
						</Text>
						<Text
							variant="mini"
							color={props.skipped ? 'orange' : 'tertiary'}
							truncate
							testId="syne-now-playing-sub"
						>
							{props.skipped ? "Skipped — won't record" : 'Massive Attack'}
						</Text>
					</div>
					<Button
						testId="syne-skip"
						variant={props.skipped ? 'accent' : 'transparent'}
						size="small"
						iconOnly
						onClick={props.onToggleSkip}
						aria-label={props.skipped ? 'Un-skip track' : 'Skip and play next'}
					>
						<Icon name="skip-forward" />
					</Button>
				</div>
				<Text variant="mini" color="tertiary" truncate>
					Last.fm · farrel
				</Text>
			</div>
			<SidebarList
				items={NAV}
				selectedItem={selectedItem()}
				onSelectedItemChange={(item) => props.onSelect(item.id)}
				getItemKey={(item) => item.id}
			>
				<For each={NAV}>
					{(item) => (
						<SidebarListItem
							testId={`syne-nav-${item.id}`}
							item={item}
							icon={<Icon name={item.icon} />}
							title={item.title}
						/>
					)}
				</For>
			</SidebarList>
		</Sidebar>
	);
}

function HistoryRow(props: {
	track: Track;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	isActive: boolean;
}) {
	const canSelect = () => !props.track.scrobbled;
	return (
		<List.Item
			item={props.track}
			testId={`history-row-${props.track.id}`}
			onClick={() => {
				if (canSelect()) props.onCheckedChange(!props.checked);
			}}
			onContextMenu={async (event) => {
				event.preventDefault();
				const picked = await showContextMenu({
					items: [{ id: 'show', label: 'Show in Apple Music' }],
					x: event.clientX ?? 0,
					y: event.clientY ?? 0,
				});
				if (picked === 'show') toast.success(`Opening ${props.track.title}…`);
			}}
			style={{
				group: true,
				hover: { backgroundColor: semanticColors.surfaceListHover },
			}}
		>
			<div
				style={{
					position: 'relative',
					flexShrink: 0,
					width: 32,
					height: 32,
				}}
			>
				<div
					style={{
						opacity: props.checked ? 0 : 1,
						...(canSelect() && !props.checked
							? { groupHover: { opacity: 0 } }
							: {}),
					}}
				>
					<AlbumArt size={32} />
				</div>
				<Show when={canSelect()}>
					<div
						style={{
							position: 'absolute',
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							opacity: props.checked ? 1 : 0,
							...(props.checked ? {} : { groupHover: { opacity: 1 } }),
						}}
					>
						<Checkbox
							testId={`history-check-${props.track.id}`}
							checked={props.checked}
							onCheckedChange={props.onCheckedChange}
							aria-label={`Select ${props.track.title}`}
						/>
					</div>
				</Show>
			</div>
			<List.ItemContent>
				<List.ItemTitle>{props.track.title}</List.ItemTitle>
				<List.ItemDescription>
					{`${props.track.artist} · ${props.track.album}`}
				</List.ItemDescription>
			</List.ItemContent>
			<List.ItemAccessory style={{ gap: 8 }}>
				<Button
					variant={props.isActive ? 'accent' : 'transparent'}
					size="small"
					iconOnly
					aria-label={`Preview ${props.track.title}`}
					style={
						props.isActive ? {} : { opacity: 0, groupHover: { opacity: 1 } }
					}
				>
					<Icon name={props.isActive ? 'pause' : 'play'} />
				</Button>
				<Show
					when={props.track.scrobbled}
					fallback={<Badge color="yellow">Pending</Badge>}
				>
					<Badge color="green">Synced</Badge>
				</Show>
				<Text
					variant="small"
					color="tertiary"
					style={{ fontVariantNumeric: 'tabular-nums' }}
				>
					{props.track.playedAt}
				</Text>
			</List.ItemAccessory>
		</List.Item>
	);
}

function HistoryView() {
	const [loaded, setLoaded] = createSignal(PAGE);
	const [selected, setSelected] = createSignal<ReadonlySet<number>>(new Set());
	const [syncing, setSyncing] = createSignal(false);
	const tracks = createMemo(() =>
		Array.from({ length: loaded() }, (_, index) => trackAt(index)),
	);
	const selectable = () => tracks().filter((track) => !track.scrobbled);
	const pending = () =>
		Array.from({ length: TOTAL }, (_, index) => trackAt(index)).filter(
			(track) => !track.scrobbled,
		).length;
	const allSelected = () =>
		selectable().length > 0 && selected().size === selectable().length;
	const toggleOne = (id: number, checked: boolean) =>
		setSelected((previous) => {
			const next = new Set(previous);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});

	return (
		<ScrollArea
			testId="syne-history"
			leading={<SidebarToggle />}
			title="History"
			subtitle={`${pending()} pending · ${TOTAL} total`}
			actions={
				<>
					<Show when={selected().size > 0}>
						<Button
							testId="syne-delete"
							variant="destructive"
							onClick={() => {
								toast.success(`Removed ${selected().size} tracks`);
								setSelected(new Set<number>());
							}}
						>
							<Icon name="trash" />
							{`Delete ${selected().size}`}
						</Button>
					</Show>
					<Button
						testId="syne-sync"
						variant="accent"
						disabled={syncing()}
						onClick={() => {
							setSyncing(true);
							setTimeout(() => {
								setSyncing(false);
								toast.success('Synced 14 tracks to Last.fm');
							}, 800);
						}}
					>
						<Icon name="refresh-cw" />
						{syncing() ? 'Syncing…' : 'Sync to Last.fm'}
					</Button>
				</>
			}
		>
			<Show
				when={tracks().length > 0}
				fallback={
					<EmptyState>
						<EmptyStateTitle>No listening history</EmptyStateTitle>
						<EmptyStateDescription>
							Play something in Apple Music or Spotify.
						</EmptyStateDescription>
					</EmptyState>
				}
			>
				<Show when={selected().size > 0}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 8,
							paddingInline: 16,
							paddingBlock: 8,
							borderBottomWidth: 1,
							borderStyle: 'solid',
							borderColor: semanticColors.borderSeparator,
						}}
					>
						<Checkbox
							testId="syne-select-all"
							checked={allSelected() ? true : 'indeterminate'}
							onCheckedChange={(checked) =>
								setSelected(
									checked
										? new Set(selectable().map((track) => track.id))
										: new Set<number>(),
								)
							}
							aria-label="Select all"
						/>
						<Text
							variant="small"
							color="secondary"
							testId="syne-selected-count"
						>
							{`${selected().size} selected`}
						</Text>
					</div>
				</Show>
				<List.Root
					testId="syne-list"
					items={tracks()}
					getItemKey={(track) => String(track.id)}
					endThreshold={80}
					onEndReached={() => setLoaded((now) => Math.min(now + PAGE, TOTAL))}
				>
					<For each={tracks()}>
						{(track) => (
							<HistoryRow
								track={track}
								checked={selected().has(track.id)}
								onCheckedChange={(checked) => toggleOne(track.id, checked)}
								isActive={track.id === 1}
							/>
						)}
					</For>
				</List.Root>
			</Show>
		</ScrollArea>
	);
}

const LOG = [
	{ id: 1, when: 'Today 10:42', message: 'Synced 14 tracks', ok: true },
	{ id: 2, when: 'Today 09:15', message: 'Synced 6 tracks', ok: true },
	{
		id: 3,
		when: 'Yesterday 22:03',
		message: 'Last.fm rejected 2 tracks: timestamps too old',
		ok: false,
	},
	{ id: 4, when: 'Yesterday 18:30', message: 'Synced 21 tracks', ok: true },
];

function SyncLogView() {
	return (
		<ScrollArea
			leading={<SidebarToggle />}
			title="Sync Log"
			subtitle={`${LOG.length} runs`}
		>
			<List.Root items={LOG} getItemKey={(entry) => String(entry.id)}>
				<For each={LOG}>
					{(entry) => (
						<List.Item item={entry}>
							<List.ItemContent>
								<List.ItemTitle>{entry.when}</List.ItemTitle>
								<List.ItemDescription>{entry.message}</List.ItemDescription>
							</List.ItemContent>
							<List.ItemAccessory>
								<Badge color={entry.ok ? 'green' : 'red'}>
									{entry.ok ? 'OK' : 'Partial'}
								</Badge>
							</List.ItemAccessory>
						</List.Item>
					)}
				</For>
			</List.Root>
		</ScrollArea>
	);
}

function AccountView() {
	return (
		<ScrollArea
			leading={<SidebarToggle />}
			title="Integration"
			subtitle="Last.fm"
		>
			<div
				style={{
					padding: 24,
					display: 'flex',
					flexDirection: 'column',
					gap: 12,
				}}
			>
				<Status variant="success">Connected as farrel</Status>
				<Text variant="small" color="secondary">
					Plays are sent to Last.fm after you have listened past the halfway
					mark.
				</Text>
			</div>
		</ScrollArea>
	);
}

export function SyneMainWindowDemo() {
	const [view, setView] = createSignal<NavId>('history');
	const [skipped, setSkipped] = createSignal(false);
	return (
		<Page
			title="Syne main window"
			subtitle="root-view, app-sidebar and history-view composed from the library"
		>
			<Frame height={520} testId="syne-window">
				<SplitView
					storageKey="demo-syne-main"
					style={{ height: '100%' }}
					sidebar={
						<AppSidebar
							selected={view()}
							onSelect={setView}
							skipped={skipped()}
							onToggleSkip={() => setSkipped((now) => !now)}
						/>
					}
				>
					<Show when={view() === 'history'}>
						<HistoryView />
					</Show>
					<Show when={view() === 'sync-log'}>
						<SyncLogView />
					</Show>
					<Show when={view() === 'account'}>
						<AccountView />
					</Show>
				</SplitView>
			</Frame>
		</Page>
	);
}

export async function syneMainWindowScenario(shot: Shot) {
	await shot.capture('history');

	// Selecting a pending track shows the selection bar and the Delete action.
	shot.expectAbsent('syne-delete');
	await shot.click('history-row-1');
	shot.expectPresent('syne-delete');
	shot.expectText('syne-selected-count', '1 selected');
	await shot.click('history-check-2');
	shot.expectText('syne-selected-count', '2 selected');
	await shot.capture('selected');

	// A synced row cannot be selected.
	await shot.click('history-row-3');
	shot.expectText('syne-selected-count', '2 selected');

	// The row's context menu.
	await shot.rightClick('history-row-4');
	await shot.wait(200);
	await shot.capture('context-menu');
	await shot.keys('Escape');
	await shot.wait(300);

	// The skip button.
	await shot.click('syne-skip');
	shot.expectText('syne-now-playing-sub', "Skipped — won't record");

	// Reaching the end loads the next page.
	await shot.scrollTo('syne-history-viewport', 10_000);
	await shot.wait(500);
	shot.expectPresent('history-row-14');
	await shot.capture('more-loaded');

	await shot.click('syne-nav-sync-log');
	await shot.capture('sync-log');
	await shot.click('syne-nav-account');
	await shot.capture('integration');

	// The pinned toggle collapses the sidebar; the toolbar leaves room for it.
	await shot.click('syne-sidebar-toggle');
	await shot.wait(450);
	await shot.capture('sidebar-collapsed');
}
