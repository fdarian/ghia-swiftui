import {
	Button,
	Icon,
	List,
	ScrollArea,
	Sidebar,
	SidebarList,
	SidebarListItem,
	SplitView,
	Text,
	useSplitView,
} from 'ghia-swiftui';
import { createSignal, For } from 'solid-js';
import { Frame, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const items = ['Inbox', 'Drafts', 'Sent', 'Archive'] as const;

/** What `useSplitView` reports, read from inside the SplitView. */
function Readout() {
	const split = useSplitView();
	return (
		<Text variant="small" color="tertiary" testId="split-state">
			{`useSplitView: sidebar ${split.sidebarCollapsed ? 'collapsed' : 'open'}, inspector ${split.inspectorCollapsed ? 'collapsed' : 'open'}`}
		</Text>
	);
}

function Primary(props: { selected: string }) {
	return (
		<ScrollArea
			title={props.selected}
			subtitle="The primary column"
			leading={
				<SplitView.SidebarToggle testId="split-sidebar-toggle" pinned={false} />
			}
			actions={
				<SplitView.InspectorToggle
					testId="split-inspector-toggle"
					pinned={false}
				/>
			}
		>
			<div
				style={{
					padding: 24,
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
				}}
			>
				<Readout />
				<For each={Array.from({ length: 20 }, (_, index) => index)}>
					{(index) => <Text>{`${props.selected} message ${index + 1}`}</Text>}
				</For>
			</div>
		</ScrollArea>
	);
}

function FourColumns() {
	const [selected, setSelected] = createSignal<string>('Inbox');
	return (
		<Frame height={420}>
			<SplitView
				testId="split"
				storageKey="demo-split-view"
				listSize={{ default: 220, min: 160 }}
				inspectorSize={{ default: 200, min: 160 }}
				sidebar={
					<Sidebar>
						<SidebarList
							items={[...items]}
							selectedItem={selected()}
							onSelectedItemChange={setSelected}
							getItemKey={(item) => item}
						>
							<For each={items}>
								{(item) => (
									<SidebarListItem
										testId={`split-folder-${item}`}
										item={item}
										icon={<Icon name="inbox" />}
										title={item}
									/>
								)}
							</For>
						</SidebarList>
					</Sidebar>
				}
				list={
					<ScrollArea title="Messages" subtitle={selected()}>
						<List.Root items={[...items]} getItemKey={(item) => item}>
							<For each={items}>
								{(item) => (
									<List.Item item={item}>
										<List.ItemContent>
											<List.ItemTitle>{`${item} message`}</List.ItemTitle>
											<List.ItemDescription>
												A line of preview text
											</List.ItemDescription>
										</List.ItemContent>
									</List.Item>
								)}
							</For>
						</List.Root>
					</ScrollArea>
				}
				inspector={
					<ScrollArea title="Inspector">
						<div style={{ padding: 16 }}>
							<Text variant="small" color="secondary">
								Details of the selected message
							</Text>
						</div>
					</ScrollArea>
				}
			>
				<Primary selected={selected()} />
			</SplitView>
		</Frame>
	);
}

function Controlled() {
	const [collapsed, setCollapsed] = createSignal(false);
	return (
		<>
			<Row gap={12}>
				<Button
					testId="controlled-toggle"
					size="small"
					onClick={() => setCollapsed((now) => !now)}
				>
					{collapsed() ? 'Show the sidebar' : 'Hide the sidebar'}
				</Button>
				<Text variant="small" color="tertiary" testId="controlled-state">
					{collapsed() ? 'controlled: collapsed' : 'controlled: open'}
				</Text>
			</Row>
			<Frame height={200}>
				<SplitView
					testId="controlled"
					sidebarCollapsed={collapsed()}
					onSidebarCollapsedChange={setCollapsed}
					sidebarSize={{ default: 160, min: 120, max: 240 }}
					sidebar={
						<Sidebar
							actions={
								<SplitView.SidebarToggle
									testId="controlled-sidebar-toggle"
									pinned={false}
								/>
							}
						>
							<SidebarList>
								<SidebarListItem title="One" icon={<Icon name="star" />} />
							</SidebarList>
						</Sidebar>
					}
				>
					<ScrollArea title="Controlled">
						<div style={{ padding: 16 }}>
							<Text variant="small" color="secondary">
								The sidebar's collapse state is the parent's: the unpinned
								toggle reports it, the button above sets it.
							</Text>
						</div>
					</ScrollArea>
				</SplitView>
			</Frame>
		</>
	);
}

export function SplitViewDemo() {
	return (
		<Page
			title="SplitView"
			subtitle="Sidebar, list, primary and inspector columns that resize and collapse"
		>
			<Section title="Four columns: drag a handle or use a toggle (⌃⌘S is the demo window's own)">
				<FourColumns />
			</Section>
			<Section title="A controlled sidebar, with an inline toggle (pinned={false})">
				<Controlled />
			</Section>
		</Page>
	);
}

export async function splitViewScenario(shot: Shot) {
	await shot.capture('initial-columns');
	const open = shot.box('split-sidebar').width;
	if (open < 150) throw new Error(`the sidebar is ${open} wide when open`);

	// The pinned toggle collapses the sidebar and the column slides out.
	await shot.click('split-sidebar-toggle');
	await shot.wait(450);
	if (shot.box('split-sidebar').width > 2) {
		throw new Error('the sidebar did not collapse');
	}
	shot.expectText(
		'split-state',
		'useSplitView: sidebar collapsed, inspector open',
	);
	await shot.capture('sidebar-collapsed');
	await shot.click('split-sidebar-toggle');
	await shot.wait(450);
	shot.expectText('split-state', 'useSplitView: sidebar open, inspector open');
	if (Math.abs(shot.box('split-sidebar').width - open) > 2) {
		throw new Error('the sidebar did not come back at its size');
	}

	await shot.click('split-inspector-toggle');
	await shot.wait(450);
	if (shot.box('split-inspector').width > 2) {
		throw new Error('the inspector did not collapse');
	}
	await shot.capture('inspector-collapsed');
	await shot.click('split-inspector-toggle');
	await shot.wait(450);

	// ⌃⌘S is the window's: only the outermost SplitView, the demo shell here, listens, and it collapses its own sidebar.
	const shell = shot.box('shell-sidebar').width;
	await shot.keys('Control+Meta+s');
	await shot.wait(450);
	if (shot.box('shell-sidebar').width > 2) {
		throw new Error('⌃⌘S did not collapse the outermost sidebar');
	}
	if (Math.abs(shot.box('split-sidebar').width - open) > 2) {
		throw new Error('⌃⌘S reached a nested SplitView');
	}
	await shot.capture('shell-collapsed');
	await shot.keys('Control+Meta+s');
	await shot.wait(450);
	if (Math.abs(shot.box('shell-sidebar').width - shell) > 2) {
		throw new Error('⌃⌘S did not bring the outermost sidebar back');
	}

	// Dragging the sidebar's handle resizes it, within its limits.
	const before = shot.box('split-sidebar').width;
	await shot.drag('split-group-handle-0', 40, 0);
	const after = shot.box('split-sidebar').width;
	if (Math.abs(after - Math.min(before + 40, 300)) > 2) {
		throw new Error(`the sidebar went from ${before} to ${after}`);
	}
	await shot.capture('resized');

	// A controlled sidebar follows its prop and reports an unpinned toggle.
	await shot.click('controlled-toggle');
	await shot.wait(450);
	shot.expectText('controlled-state', 'controlled: collapsed');
	if (shot.box('controlled-sidebar').width > 2) {
		throw new Error('the controlled sidebar did not collapse');
	}
	await shot.click('controlled-toggle');
	await shot.wait(450);
	await shot.click('controlled-sidebar-toggle');
	await shot.wait(450);
	shot.expectText('controlled-state', 'controlled: collapsed');
	await shot.capture('controlled-collapsed');
}
