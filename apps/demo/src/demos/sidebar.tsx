import {
	Badge,
	Button,
	Icon,
	type IconName,
	Sidebar,
	SidebarFooter,
	SidebarList,
	SidebarListItem,
	Text,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Frame, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

interface Destination {
	id: string;
	title: string;
	icon: IconName;
	subtitle?: string;
	count?: number;
}

const destinations: Destination[] = [
	{ id: 'history', title: 'History', icon: 'clock', count: 12 },
	{
		id: 'log',
		title: 'Sync Log',
		icon: 'scroll-text',
		subtitle: 'Last run 2m ago',
	},
	{ id: 'account', title: 'Integration', icon: 'user-round' },
	{ id: 'settings', title: 'Settings', icon: 'settings' },
];

const key = (destination: Destination) => destination.id;

function Managed() {
	const [selected, setSelected] = createSignal<Destination | null>(
		destinations[0] ?? null,
	);
	return (
		<>
			<Row gap={16}>
				<Text variant="small" color="tertiary">
					Selected:
				</Text>
				<Text variant="small" testId="sidebar-selected">
					{selected()?.title ?? 'none'}
				</Text>
			</Row>
			<Frame height={380} width={260}>
				<Sidebar
					testId="sidebar-managed"
					actions={
						<Button iconOnly aria-label="Add">
							<Icon name="plus" />
						</Button>
					}
					footer={
						<SidebarFooter>
							<SidebarListItem
								testId="sidebar-footer-settings"
								icon={<Icon name="settings" />}
								title="Settings"
							/>
						</SidebarFooter>
					}
				>
					<SidebarList
						testId="sidebar-managed-list"
						items={destinations}
						selectedItem={selected()}
						onSelectedItemChange={setSelected}
						getItemKey={key}
					>
						<For each={destinations}>
							{(destination) => (
								<SidebarListItem
									testId={`sidebar-row-${destination.id}`}
									item={destination}
									icon={<Icon name={destination.icon} />}
									title={destination.title}
									subtitle={destination.subtitle}
									accessory={destination.count}
								/>
							)}
						</For>
					</SidebarList>
				</Sidebar>
			</Frame>
		</>
	);
}

export function SidebarDemo() {
	const [explicit, setExplicit] = createSignal('b');
	return (
		<Page
			title="Sidebar"
			subtitle="The flush macOS 27 column: glass under a toolbar, a list and a footer"
		>
			<Section title="SidebarList with managed selection: click a row, or Tab in and use the arrows, Home and End">
				<Managed />
			</Section>
			<div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
				<Section title="Explicit selected, and an accessory node">
					<Frame height={200} width={260}>
						<Sidebar>
							<SidebarList>
								<For each={['a', 'b', 'c']}>
									{(id) => (
										<SidebarListItem
											testId={`explicit-${id}`}
											selected={explicit() === id}
											onClick={() => setExplicit(id)}
											icon={<Icon name="star" />}
											title={`Row ${id.toUpperCase()}`}
											accessory={
												id === 'b' ? <Badge color="blue">New</Badge> : undefined
											}
										/>
									)}
								</For>
							</SidebarList>
						</Sidebar>
					</Frame>
				</Section>
				<Section title="emptyState while items is empty">
					<Frame height={200} width={260}>
						<Sidebar>
							<SidebarList
								items={[] as Destination[]}
								getItemKey={key}
								emptyState={
									<div style={{ padding: 16 }}>
										<Text variant="small" color="tertiary">
											Nothing here yet
										</Text>
									</div>
								}
							/>
						</Sidebar>
					</Frame>
				</Section>
			</div>
			<Section title="scrollEnabled={false}: no toolbar, no scroll; the content is the sidebar">
				<Frame height={120} width={260}>
					<Sidebar scrollEnabled={false}>
						<div style={{ padding: 16 }}>
							<Text variant="small" color="secondary">
								Unscrolled content
							</Text>
						</div>
					</Sidebar>
				</Frame>
			</Section>
		</Page>
	);
}

export async function sidebarScenario(shot: Shot) {
	shot.expectText('sidebar-selected', 'History');
	await shot.capture('initial-sidebar');

	await shot.click('sidebar-row-account');
	shot.expectText('sidebar-selected', 'Integration');

	// Tab stop is the list: ArrowUp, then Home and End.
	await shot.focus('sidebar-managed-list');
	await shot.keys('ArrowUp');
	shot.expectText('sidebar-selected', 'Sync Log');
	await shot.keys('End');
	shot.expectText('sidebar-selected', 'Settings');
	await shot.keys('Home');
	shot.expectText('sidebar-selected', 'History');
	await shot.capture('keyboard');

	await shot.click('explicit-c');
	await shot.capture('explicit');
}
