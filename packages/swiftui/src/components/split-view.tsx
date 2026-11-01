import { type DomEvent, type KeyEvent, window } from '@ghia/solid';
import {
	createEffect,
	createMemo,
	createRenderEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	splitProps,
} from 'solid-js';
import { Button, type ButtonProps } from '#src/components/button.tsx';
import { Panel, PanelGroup } from '#src/components/panel.tsx';
import { useSidebarContext } from '#src/components/sidebar-context.ts';
import {
	SplitViewColumnContext,
	type SplitViewColumnContextValue,
	useSplitViewColumnContext,
} from '#src/components/split-view-column-context.ts';
import {
	SplitViewContext,
	type SplitViewContextValue,
	useSplitView,
} from '#src/components/split-view-context.ts';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '#src/components/tooltip.tsx';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import { Icon } from '#src/icons/icon.tsx';
import { panelStorage } from '#src/panel-storage.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

const SIDEBAR_DEFAULT_SIZE = 200;
const SIDEBAR_MIN_SIZE = 180;
const SIDEBAR_MAX_SIZE = 300;

const LIST_DEFAULT_SIZE = 300;
const LIST_MIN_SIZE = 240;

const INSPECTOR_DEFAULT_SIZE = 280;
const INSPECTOR_MIN_SIZE = 240;

const TOGGLE_DURATION_MS = 200;
const TOGGLE_EASE_IN = 'cubic-bezier(0.165, 0.84, 0.44, 1)';
const TOGGLE_EASE_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

/** The pinned toggle is a fixed 36px glass circle on macOS 27. */
const TOGGLE_SIZE = 36;
const TOOLBAR_HEIGHT = 52;

export interface SlotSize {
	default?: number;
	min?: number;
	max?: number;
}

export interface SplitViewProps {
	/** Leftmost column (typically a `<Sidebar>`). A slot is there when its prop is passed. */
	sidebar?: JSX.Element;
	sidebarSize?: SlotSize;
	sidebarCollapsed?: boolean;
	defaultSidebarCollapsed?: boolean;
	onSidebarCollapsedChange?: (collapsed: boolean) => void;
	/** Browsing and selection column between `sidebar` and the primary column. */
	list?: JSX.Element;
	listSize?: SlotSize;
	/** Primary column (always flex). */
	children?: JSX.Element;
	primarySize?: Pick<SlotSize, 'min'>;
	/** Trailing metadata or preview column. */
	inspector?: JSX.Element;
	inspectorSize?: SlotSize;
	inspectorCollapsed?: boolean;
	defaultInspectorCollapsed?: boolean;
	onInspectorCollapsedChange?: (collapsed: boolean) => void;
	/** Scoped key for resize and collapse persistence. Must be unique when nesting. */
	storageKey?: string;
	style?: HostAttributes['style'];
	testId?: string;
}

interface PersistedCollapse {
	sidebar: boolean;
	inspector: boolean;
}

function readPersistedCollapse(
	storageKey: string | undefined,
	defaults: PersistedCollapse,
): PersistedCollapse {
	if (storageKey === undefined) return defaults;
	const raw = panelStorage().get(storageKey);
	if (raw === undefined) return defaults;
	const parsed: unknown = JSON.parse(raw);
	if (typeof parsed !== 'object' || parsed === null) return defaults;
	const stored = parsed as Partial<Record<keyof PersistedCollapse, unknown>>;
	return {
		sidebar:
			typeof stored.sidebar === 'boolean' ? stored.sidebar : defaults.sidebar,
		inspector:
			typeof stored.inspector === 'boolean'
				? stored.inspector
				: defaults.inspector,
	};
}

/** A collapse state that is the prop's when controlled and its own otherwise. */
function createCollapse(options: {
	value: () => boolean | undefined;
	initial: boolean;
	onChange: () => ((collapsed: boolean) => void) | undefined;
	persist: (collapsed: boolean) => void;
}) {
	const [internal, setInternal] = createSignal(options.initial);
	return {
		current: () => options.value() ?? internal(),
		set(collapsed: boolean) {
			const controlled = options.value() !== undefined;
			if (!controlled) setInternal(collapsed);
			options.onChange()?.(collapsed);
			if (!controlled) options.persist(collapsed);
		},
	};
}

/** The count of toggles mounted, as a registration. */
function createRegistry() {
	const [count, setCount] = createSignal(0);
	return {
		active: () => count() > 0,
		register() {
			setCount((value) => value + 1);
			return () => setCount((value) => value - 1);
		},
	};
}

/** Render functions of pinned toggles, drawn in the SplitView's frame anchor. */
function createPinnedSlot() {
	const [renders, setRenders] = createSignal<Array<() => JSX.Element>>([]);
	return {
		renders,
		register(render: () => JSX.Element) {
			setRenders((current) => [...current, render]);
			return () => setRenders((current) => current.filter((r) => r !== render));
		},
	};
}

/**
 * Mac-style app shell with up to four columns (sidebar, list, primary,
 * inspector): `PanelGroup` and `Panel` with semantic slots, preset sizing, and
 * a column context `Toolbar` and `ScrollArea` read for the window-control inset
 * and scrollbar clearance.
 */
function SplitView(props: SplitViewProps) {
	const parent = useSplitViewColumnContext();
	const isOutermost = parent === null;

	const hasSidebar = () => 'sidebar' in props;
	const hasList = () => 'list' in props;
	const hasInspector = () => 'inspector' in props;

	const collapseStorageKey =
		props.storageKey === undefined ? undefined : `${props.storageKey}-collapse`;
	const defaults: PersistedCollapse = {
		sidebar: props.defaultSidebarCollapsed ?? false,
		inspector: props.defaultInspectorCollapsed ?? false,
	};
	const persisted = readPersistedCollapse(collapseStorageKey, defaults);
	let persistedNow = persisted;
	const persistCollapse = (next: Partial<PersistedCollapse>) => {
		persistedNow = { ...persistedNow, ...next };
		if (collapseStorageKey !== undefined) {
			panelStorage().set(collapseStorageKey, JSON.stringify(persistedNow));
		}
	};

	const sidebarCollapse = createCollapse({
		value: () => props.sidebarCollapsed,
		initial: persisted.sidebar,
		onChange: () => props.onSidebarCollapsedChange,
		persist: (sidebar) => persistCollapse({ sidebar }),
	});
	const inspectorCollapse = createCollapse({
		value: () => props.inspectorCollapsed,
		initial: persisted.inspector,
		onChange: () => props.onInspectorCollapsedChange,
		persist: (inspector) => persistCollapse({ inspector }),
	});
	const sidebarCollapsed = () => hasSidebar() && sidebarCollapse.current();
	const inspectorCollapsed = () =>
		hasInspector() && inspectorCollapse.current();
	const toggleSidebar = () => sidebarCollapse.set(!sidebarCollapsed());
	const toggleInspector = () => inspectorCollapse.set(!inspectorCollapsed());

	const pinnedLeading = createPinnedSlot();
	const pinnedTrailing = createPinnedSlot();
	const pinnedSidebar = createRegistry();
	const sidebarToggles = createRegistry();
	const inspectorToggles = createRegistry();

	createEffect(() => {
		if (!isOutermost) return;
		if (!sidebarToggles.active() && !inspectorToggles.active()) return;
		const onKeyDown = (domEvent: DomEvent) => {
			const event = domEvent as KeyEvent;
			if (
				event.metaKey !== true ||
				event.ctrlKey !== true ||
				event.altKey === true ||
				event.shiftKey === true
			) {
				return;
			}
			if (event.key === undefined) return;
			const key = event.key.toLowerCase();
			if (sidebarToggles.active() && key === 's') {
				event.preventDefault();
				toggleSidebar();
			} else if (inspectorToggles.active() && key === 'i') {
				event.preventDefault();
				toggleInspector();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		onCleanup(() => window.removeEventListener('keydown', onKeyDown));
	});

	const context: SplitViewContextValue = {
		get hasSidebar() {
			return hasSidebar();
		},
		get sidebarCollapsed() {
			return sidebarCollapsed();
		},
		setSidebarCollapsed: sidebarCollapse.set,
		toggleSidebar,
		get hasInspector() {
			return hasInspector();
		},
		get inspectorCollapsed() {
			return inspectorCollapsed();
		},
		setInspectorCollapsed: inspectorCollapse.set,
		toggleInspector,
		registerPinnedSidebarToggle(render) {
			const unregisterCount = pinnedSidebar.register();
			const unregisterSlot = pinnedLeading.register(render);
			return () => {
				unregisterCount();
				unregisterSlot();
			};
		},
		registerPinnedInspectorToggle: pinnedTrailing.register,
		get hasPinnedSidebarToggle() {
			return pinnedSidebar.active();
		},
		get hasSidebarToggle() {
			return sidebarToggles.active();
		},
		registerSidebarToggle: sidebarToggles.register,
		get hasInspectorToggle() {
			return inspectorToggles.active();
		},
		registerInspectorToggle: inspectorToggles.register,
	};

	const indices = createMemo(() => {
		let next = 0;
		const sidebar = hasSidebar() ? next++ : -1;
		const list = hasList() ? next++ : -1;
		const primary = next++;
		const inspector = hasInspector() ? next : -1;
		return { sidebar, list, primary, inspector };
	});
	const visible = createMemo(() => {
		const at = indices();
		const result: number[] = [];
		if (hasSidebar() && !sidebarCollapsed()) result.push(at.sidebar);
		if (hasList()) result.push(at.list);
		result.push(at.primary);
		if (hasInspector() && !inspectorCollapsed()) result.push(at.inspector);
		return result;
	});
	const insetTransition = () =>
		`padding ${TOGGLE_DURATION_MS}ms ${sidebarCollapsed() ? TOGGLE_EASE_OUT : TOGGLE_EASE_IN}`;

	const columnValue = (index: () => number): SplitViewColumnContextValue => {
		const isFirst = () => index() === visible()[0] && (parent?.isFirst ?? true);
		const parentWantsButton = () =>
			parent?.insetHint === 'windowControlsAndButton';
		return {
			get isFirst() {
				return isFirst();
			},
			get isLast() {
				return index() === visible().at(-1) && (parent?.isLast ?? true);
			},
			get insetHint() {
				if (!isFirst()) return 'none';
				return pinnedSidebar.active() || parentWantsButton()
					? 'windowControlsAndButton'
					: 'windowControls';
			},
			get insetTransition() {
				if (isFirst() && parentWantsButton() && !pinnedSidebar.active()) {
					return parent?.insetTransition ?? insetTransition();
				}
				return insetTransition();
			},
		};
	};

	return (
		<SplitViewContext.Provider value={context}>
			<div
				testId={props.testId}
				style={{
					position: 'relative',
					height: '100%',
					...props.style,
				}}
			>
				<PanelGroup
					testId={props.testId && `${props.testId}-group`}
					storageKey={props.storageKey}
				>
					<Show when={hasSidebar()}>
						<Panel
							testId={props.testId && `${props.testId}-sidebar`}
							defaultSize={props.sidebarSize?.default ?? SIDEBAR_DEFAULT_SIZE}
							minSize={props.sidebarSize?.min ?? SIDEBAR_MIN_SIZE}
							maxSize={props.sidebarSize?.max ?? SIDEBAR_MAX_SIZE}
							hidden={sidebarCollapsed()}
							anchor="end"
						>
							<SplitViewColumnContext.Provider
								value={columnValue(() => indices().sidebar)}
							>
								<div style={{ height: '100%', width: '100%' }}>
									{props.sidebar}
								</div>
							</SplitViewColumnContext.Provider>
						</Panel>
					</Show>
					<Show when={hasList()}>
						<Panel
							testId={props.testId && `${props.testId}-list`}
							defaultSize={props.listSize?.default ?? LIST_DEFAULT_SIZE}
							minSize={props.listSize?.min ?? LIST_MIN_SIZE}
							maxSize={props.listSize?.max}
						>
							<SplitViewColumnContext.Provider
								value={columnValue(() => indices().list)}
							>
								<div style={{ height: '100%', width: '100%' }}>
									{props.list}
								</div>
							</SplitViewColumnContext.Provider>
						</Panel>
					</Show>
					<Panel
						testId={props.testId && `${props.testId}-primary`}
						minSize={props.primarySize?.min}
					>
						<SplitViewColumnContext.Provider
							value={columnValue(() => indices().primary)}
						>
							<div style={{ height: '100%', width: '100%' }}>
								{props.children}
							</div>
						</SplitViewColumnContext.Provider>
					</Panel>
					<Show when={hasInspector()}>
						<Panel
							testId={props.testId && `${props.testId}-inspector`}
							defaultSize={
								props.inspectorSize?.default ?? INSPECTOR_DEFAULT_SIZE
							}
							minSize={props.inspectorSize?.min ?? INSPECTOR_MIN_SIZE}
							maxSize={props.inspectorSize?.max}
							hidden={inspectorCollapsed()}
						>
							<SplitViewColumnContext.Provider
								value={columnValue(() => indices().inspector)}
							>
								<div style={{ height: '100%', width: '100%' }}>
									{props.inspector}
								</div>
							</SplitViewColumnContext.Provider>
						</Panel>
					</Show>
				</PanelGroup>
				{/* Where `pinned` toggles draw: a fixed frame position whether the panel is open or collapsed. */}
				<div
					aria-hidden
					style={{
						position: 'absolute',
						top: 0,
						left: 90,
						width: TOGGLE_SIZE,
						height: TOOLBAR_HEIGHT,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 30,
						pointerEvents: 'none',
					}}
				>
					<For each={pinnedLeading.renders()}>{(render) => render()}</For>
				</div>
				<div
					aria-hidden
					style={{
						position: 'absolute',
						top: 0,
						right: 0,
						height: TOOLBAR_HEIGHT,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'flex-end',
						gap: 8,
						paddingRight: 12,
						zIndex: 30,
						pointerEvents: 'none',
					}}
				>
					<For each={pinnedTrailing.renders()}>{(render) => render()}</For>
				</div>
			</div>
		</SplitViewContext.Provider>
	);
}

export interface SplitViewToggleProps
	extends Omit<ButtonProps, 'aria-pressed' | 'onClick' | 'children'> {
	children?: JSX.Element;
	/**
	 * Default `true`: draws the button at a fixed anchor on the SplitView
	 * frame's leading or trailing edge, so it stays in the same pixel position
	 * whether the panel is open or collapsed. `pinned={false}` renders inline
	 * at the JSX location instead.
	 */
	pinned?: boolean;
}

const SIDEBAR_SHORTCUT = ['⌃', '⌘', 'S'];
const INSPECTOR_SHORTCUT = ['⌃', '⌘', 'I'];

/** The icon of a pinned toggle sits over the button, not in it: centred inside the morphing button it jittered by a subpixel every frame. */
function PinnedIcon(props: { children?: JSX.Element }) {
	return (
		<span
			aria-hidden
			style={{
				position: 'absolute',
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				pointerEvents: 'none',
			}}
		>
			{props.children}
		</span>
	);
}

function SidebarToggle(props: SplitViewToggleProps) {
	const [own, rest] = splitProps(props, [
		'variant',
		'size',
		'iconOnly',
		'children',
		'pinned',
		'style',
		'aria-label',
	]);
	const split = useSplitView();
	const pinned = () => own.pinned ?? true;

	const icon = () => own.children ?? <Icon name="panel-left" size={18} />;
	const label = () =>
		own['aria-label'] ??
		(split.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar');
	// macOS 27: the toggle is always liquid glass at a fixed 36px.
	const ToggleButton = () => (
		<Tooltip>
			<TooltipTrigger>
				<Button
					{...rest}
					variant="glass"
					size="large"
					iconOnly={own.iconOnly ?? true}
					aria-label={label()}
					aria-pressed={!split.sidebarCollapsed}
					onClick={split.toggleSidebar}
					style={
						pinned()
							? {
									position: 'relative',
									pointerEvents: 'auto',
									width: TOGGLE_SIZE,
									height: TOGGLE_SIZE,
									...own.style,
								}
							: own.style
					}
				>
					<Show when={pinned()} fallback={icon()}>
						<span
							aria-hidden
							style={{
								position: 'absolute',
								top: 0,
								right: 0,
								bottom: 0,
								left: 0,
								borderRadius: styleTokens.radiusPill,
								pointerEvents: 'none',
								...glass.material(),
								opacity: split.sidebarCollapsed ? 1 : 0,
								transition: `opacity ${TOGGLE_DURATION_MS}ms ${TOGGLE_EASE_IN}`,
							}}
						/>
					</Show>
				</Button>
			</TooltipTrigger>
			<TooltipContent shortcut={SIDEBAR_SHORTCUT}>
				Toggle Sidebar
			</TooltipContent>
		</Tooltip>
	);

	createRenderEffect(() => onCleanup(split.registerSidebarToggle()));
	createRenderEffect(() => {
		if (!pinned()) return;
		onCleanup(
			split.registerPinnedSidebarToggle(() => (
				<>
					<ToggleButton />
					<PinnedIcon>{icon()}</PinnedIcon>
				</>
			)),
		);
	});

	return (
		<Show when={split.hasSidebar && !pinned()}>
			<ToggleButton />
		</Show>
	);
}

function InspectorToggle(props: SplitViewToggleProps) {
	const [own, rest] = splitProps(props, [
		'variant',
		'size',
		'iconOnly',
		'children',
		'pinned',
		'style',
		'aria-label',
	]);
	const split = useSplitView();
	const inSidebar = useSidebarContext();
	const pinned = () => own.pinned ?? true;

	createRenderEffect(() => onCleanup(split.registerInspectorToggle()));
	const variant = () =>
		own.variant ?? (inSidebar && !pinned() ? 'transparent' : 'glass');
	const size = () => own.size ?? (inSidebar && !pinned() ? 'small' : 'large');
	const label = () =>
		own['aria-label'] ??
		(split.inspectorCollapsed ? 'Show inspector' : 'Hide inspector');
	const ToggleButton = () => (
		<Tooltip>
			<TooltipTrigger>
				<Button
					{...rest}
					variant={variant()}
					size={size()}
					iconOnly={own.iconOnly ?? true}
					aria-label={label()}
					aria-pressed={!split.inspectorCollapsed}
					onClick={split.toggleInspector}
					style={
						pinned()
							? { position: 'relative', pointerEvents: 'auto', ...own.style }
							: own.style
					}
				>
					{own.children ?? (
						<Icon name="panel-right" size={size() === 'large' ? 18 : 16} />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent shortcut={INSPECTOR_SHORTCUT}>
				Toggle Inspector
			</TooltipContent>
		</Tooltip>
	);
	createRenderEffect(() => {
		if (!pinned()) return;
		onCleanup(split.registerPinnedInspectorToggle(() => <ToggleButton />));
	});
	return (
		<Show when={split.hasInspector && !pinned()}>
			<ToggleButton />
		</Show>
	);
}

const SplitViewWithSlots = Object.assign(SplitView, {
	SidebarToggle,
	InspectorToggle,
});

export { useSplitView } from '#src/components/split-view-context.ts';
export { SplitViewWithSlots as SplitView };
