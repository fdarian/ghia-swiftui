import {
	type DomEvent,
	type HostElement,
	type KeyEvent,
	window,
} from '@ghia/solid';
import {
	applyColorScheme,
	Button,
	ButtonDefaultsProvider,
	ColorSchemeProvider,
	ContextMenuHost,
	followSystemColorScheme,
	Icon,
	Input,
	Sidebar,
	SidebarFooter,
	SidebarList,
	SidebarListItem,
	SplitView,
	Text,
	Toaster,
	Toolbar,
	ToolbarRow,
	TooltipProvider,
} from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { type Demo, demos, filterDemoSections } from '#src/demos/index.ts';

export const WINDOW_TITLE = 'ghia-swiftui';

/** Height of the strip along the top of the window that drags it: `Toolbar`'s own row height. */
const DRAG_STRIP_HEIGHT = 52;

const schemeChoices = [
	{ name: 'system', label: 'System', apply: followSystemColorScheme },
	{ name: 'light', label: 'Light', apply: () => applyColorScheme(false) },
	{ name: 'dark', label: 'Dark', apply: () => applyColorScheme(true) },
] as const;

function DemoNav(props: { selected: Demo; onSelect: (demo: Demo) => void }) {
	const [scheme, setScheme] = createSignal<string>('system');
	const [query, setQuery] = createSignal('');
	const sections = () => filterDemoSections(query());
	let search: HostElement | undefined;

	onMount(() => {
		const onKeyDown = (domEvent: DomEvent) => {
			const event = domEvent as KeyEvent;
			if (
				event.metaKey !== true ||
				event.ctrlKey === true ||
				event.altKey === true ||
				event.shiftKey === true ||
				event.key?.toLowerCase() !== 'f'
			) {
				return;
			}
			if (search === undefined) throw new Error('nav-search has no element');
			event.preventDefault();
			search.focus();
			search.select();
		};
		window.addEventListener('keydown', onKeyDown);
		onCleanup(() => window.removeEventListener('keydown', onKeyDown));
	});

	return (
		<Sidebar
			testId="nav"
			// Sidebar's default toolbar (a 52px row of actions) plus the search row, so the field stays fixed above the list.
			toolbar={
				<Toolbar style={{ paddingTop: 16, paddingBottom: 8 }}>
					<ToolbarRow style={{ justifyContent: 'flex-end' }}>
						<ButtonDefaultsProvider
							value={{ variant: 'glass', size: 'toolbar' }}
						>
							<SplitView.SidebarToggle testId="sidebar-toggle" />
						</ButtonDefaultsProvider>
					</ToolbarRow>
					<ToolbarRow>
						<Input
							ref={(element) => {
								search = element;
							}}
							testId="nav-search"
							variant="glass"
							leading={<Icon name="search" />}
							placeholder="Search"
							value={query()}
							onValueChange={setQuery}
							onKeyDown={(event) => {
								if (event.key === 'Escape') setQuery('');
							}}
							// The toolbar is a window drag region; the field opts out of it, as a button does.
							style={{ width: '100%', minWidth: 0, appRegion: 'no-drag' }}
						/>
					</ToolbarRow>
				</Toolbar>
			}
			footer={
				<SidebarFooter>
					<div style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
						<For each={schemeChoices}>
							{(choice) => (
								<Button
									testId={`scheme-${choice.name}`}
									size="small"
									radius="rounded"
									variant={scheme() === choice.name ? 'accent' : 'filled'}
									onClick={() => {
										setScheme(choice.name);
										choice.apply();
									}}
									style={{ paddingInline: 6, fontSize: 11 }}
								>
									{choice.label}
								</Button>
							)}
						</For>
					</div>
				</SidebarFooter>
			}
		>
			<SidebarList
				testId="nav-items"
				items={sections().flatMap((section) => section.demos)}
				selectedItem={props.selected}
				onSelectedItemChange={props.onSelect}
				getItemKey={(demo) => demo.name}
				emptyState={
					<div style={{ paddingInline: 18, paddingTop: 12 }}>
						<Text testId="nav-empty" variant="small" color="secondary">
							No results
						</Text>
					</div>
				}
			>
				<For each={sections()}>
					{(section) => (
						<>
							<div
								style={{ paddingInline: 8, paddingTop: 12, paddingBottom: 4 }}
							>
								<Text variant="smallStrong" color="tertiary">
									{section.name}
								</Text>
							</div>
							<For each={section.demos}>
								{(demo) => (
									<SidebarListItem
										testId={`nav-${demo.name}`}
										item={demo}
										title={demo.title}
									/>
								)}
							</For>
						</>
					)}
				</For>
			</SidebarList>
		</Sidebar>
	);
}

export function App(props: { initial?: string }) {
	const initial = props.initial ?? demos[0]?.name;
	if (initial === undefined) throw new Error('No demos registered');
	const find = (name: string) => {
		const demo = demos.find((candidate) => candidate.name === name);
		if (demo === undefined) throw new Error(`Unknown demo: ${name}`);
		return demo;
	};
	const [selected, setSelected] = createSignal(find(initial));
	return (
		<ColorSchemeProvider>
			<TooltipProvider>
				<div
					style={{
						position: 'fixed',
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
						// An opaque window is black: this is its colour, and what the sidebar's glass samples.
						backgroundColor: semanticColors.backgroundSolid,
					}}
				>
					{/* Painted first so every later sibling, toolbar buttons included, stacks above it and keeps its own click target. */}
					<div
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							height: DRAG_STRIP_HEIGHT,
							appRegion: 'drag',
						}}
					/>
					<SplitView
						testId="shell"
						storageKey="ghia-swiftui-demo"
						style={{ height: '100%' }}
						sidebar={<DemoNav selected={selected()} onSelect={setSelected} />}
					>
						<div
							style={{
								height: '100%',
								backgroundColor: semanticColors.backgroundSolid,
							}}
						>
							<Show when={selected()} keyed>
								{(demo: Demo) => <demo.component />}
							</Show>
						</div>
					</SplitView>
				</div>
				<ContextMenuHost />
				<Toaster />
			</TooltipProvider>
		</ColorSchemeProvider>
	);
}
