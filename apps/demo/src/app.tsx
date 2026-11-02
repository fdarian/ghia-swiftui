import {
	applyColorScheme,
	Button,
	ColorSchemeProvider,
	ContextMenuHost,
	followSystemColorScheme,
	Sidebar,
	SidebarFooter,
	SidebarList,
	SidebarListItem,
	SplitView,
	Text,
	Toaster,
	TooltipProvider,
} from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createSignal, For, Show } from 'solid-js';
import { type Demo, demos } from '#src/demos/index.ts';

export const WINDOW_TITLE = 'ghia-swiftui';

/** Height of the strip along the top of the window that drags it: `Toolbar`'s own row height. */
const DRAG_STRIP_HEIGHT = 52;

const schemeChoices = [
	{ name: 'system', label: 'System', apply: followSystemColorScheme },
	{ name: 'light', label: 'Light', apply: () => applyColorScheme(false) },
	{ name: 'dark', label: 'Dark', apply: () => applyColorScheme(true) },
] as const;

/** Section names in the order the demos list them first. */
const sections = [...new Set(demos.map((demo) => demo.group))];

function DemoNav(props: { selected: Demo; onSelect: (demo: Demo) => void }) {
	const [scheme, setScheme] = createSignal<string>('system');
	return (
		<Sidebar
			testId="nav"
			actions={<SplitView.SidebarToggle testId="sidebar-toggle" />}
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
				items={[...demos]}
				selectedItem={props.selected}
				onSelectedItemChange={props.onSelect}
				getItemKey={(demo) => demo.name}
			>
				<For each={sections}>
					{(section) => (
						<>
							<div
								style={{ paddingInline: 8, paddingTop: 12, paddingBottom: 4 }}
							>
								<Text variant="smallStrong" color="tertiary">
									{section}
								</Text>
							</div>
							<For each={demos.filter((demo) => demo.group === section)}>
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
