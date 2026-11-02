import type { HostElement, HostMouseEvent, StyleDesc } from '@ghia/solid';
import {
	createComputed,
	createContext,
	createEffect,
	createSignal,
	For,
	type JSX,
	on,
	onCleanup,
	children as resolveChildren,
	Show,
	untrack,
	useContext,
} from 'solid-js';
import { PanelContext } from '#src/components/panel-context.ts';
import { SplitViewColumnContext } from '#src/components/split-view-column-context.ts';
import { panelStorage } from '#src/panel-storage.ts';
import { nodesOf } from '#src/resolved.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

const PANEL_COLLAPSE_DURATION_MS = 200;
const PANEL_COLLAPSE_EASE_IN = 'cubic-bezier(0.165, 0.84, 0.44, 1)';
const PANEL_COLLAPSE_EASE_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const DEFAULT_MIN_SIZE = 50;
const DEFAULT_SIZE = 200;
/** The handle's hit target, centred on its 1px line. */
const GRABBER_SIZE = 8;

export type PanelOrientation = 'horizontal' | 'vertical';

export interface PanelGroupProps {
	children?: JSX.Element;
	orientation?: PanelOrientation;
	style?: StyleDesc;
	/** Called when a drag ends, with each panel's size in px (0 for a hidden one). */
	onChange?: (sizes: number[]) => void;
	onResizeStateChange?: (isDragging: boolean) => void;
	/** Persists the sizes through `setPanelStorage`'s adapter. */
	storageKey?: string;
	testId?: string;
}

export interface PanelProps {
	children?: JSX.Element;
	minSize?: number;
	maxSize?: number;
	/** Fixed size in px. A panel without one is the flexible one and takes what is left. */
	defaultSize?: number;
	style?: StyleDesc;
	hidden?: boolean;
	/**
	 * Which edge content stays anchored to while collapsing (with the inner
	 * wrapper's `minWidth`, "slides out of view", not squishing). `"start"`
	 * (default) for trailing panels like inspectors; `"end"` for leading panels
	 * like sidebars.
	 */
	anchor?: 'start' | 'end';
	testId?: string;
}

interface PanelEntry {
	props: PanelProps;
	element: HostElement;
}

interface PanelGroupScope {
	register: (entry: PanelEntry) => void;
	/** The entry a resolved child belongs to, or `undefined` for a child that is not a `Panel`. */
	entryOf: (node: unknown) => PanelEntry | undefined;
	/** Panels in document order. Until the group has resolved its children, in the order they were created. */
	entries: () => PanelEntry[];
	setOrder: (entries: PanelEntry[]) => void;
	orientation: () => PanelOrientation;
}

const PanelGroupContext = createContext<PanelGroupScope>();

const isFlexPanel = (props: PanelProps) => props.defaultSize === undefined;

const clamp = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(max, value));

type Sizes = Record<number, number>;

/** Stored sizes are an object by index (or the array an older layout wrote); an entry for a flexible panel, or of the wrong type, is dropped: the layout changed since it was saved. */
function parseStoredSizes(stored: string, panels: PanelEntry[]): Sizes | null {
	const parsed: unknown = JSON.parse(stored);
	if (typeof parsed !== 'object' || parsed === null) return null;
	const entries: [string, unknown][] = Array.isArray(parsed)
		? parsed.map((size, index) => [String(index), size])
		: Object.entries(parsed);
	const result: Sizes = {};
	for (const [key, value] of entries) {
		const index = Number.parseInt(key, 10);
		const panel = panels[index];
		if (
			Number.isNaN(index) ||
			typeof value !== 'number' ||
			panel === undefined ||
			isFlexPanel(panel.props)
		) {
			continue;
		}
		result[index] = clamp(
			value,
			panel.props.minSize ?? DEFAULT_MIN_SIZE,
			panel.props.maxSize ?? Number.POSITIVE_INFINITY,
		);
	}
	return Object.keys(result).length > 0 ? result : null;
}

/** Sizes in px: stored, else the panel's default. Flexible panels get no entry. */
function initialSizes(panels: PanelEntry[], storageKey: string): Sizes {
	const raw = panelStorage().get(storageKey);
	const stored = raw === undefined ? null : parseStoredSizes(raw, panels);
	const sizes: Sizes = {};
	panels.forEach((panel, index) => {
		if (isFlexPanel(panel.props)) return;
		sizes[index] = stored?.[index] ?? panel.props.defaultSize ?? DEFAULT_SIZE;
	});
	return sizes;
}

function ResizeHandle(props: {
	orientation: PanelOrientation;
	isDragging: boolean;
	onResize: (delta: number, isDragStart?: boolean, isDragEnd?: boolean) => void;
	testId?: string;
}) {
	const horizontal = () => props.orientation === 'horizontal';
	let grabber: HostElement | undefined;
	let last = 0;
	let dragging = false;
	const along = (event: HostMouseEvent) =>
		(horizontal() ? event.clientX : event.clientY) ?? last;
	const finish = () => {
		if (!dragging) return;
		dragging = false;
		props.onResize(0, false, true);
	};
	return (
		<div
			style={{
				position: 'relative',
				flexShrink: 0,
				backgroundColor: props.isDragging
					? semanticColors.panelBorderHover
					: semanticColors.panelBorder,
				transition: 'background-color 300ms ease',
				...(horizontal()
					? {
							width: 1,
							maskImage:
								'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
						}
					: {
							height: 1,
							maskImage:
								'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
						}),
			}}
		>
			<div
				ref={(element) => {
					grabber = element;
				}}
				testId={props.testId}
				onMouseDown={(event) => {
					// Native scrollbars and handles never move focus; ghia blurs the focused element on a press with no focusable element in its path.
					event.preventDefault();
					if (grabber === undefined) throw new Error('Handle is not mounted');
					// The drag keeps following the pointer once it leaves the 8px hit target.
					grabber.setPointerCapture(event.pointerId);
					last = along(event);
					dragging = true;
					props.onResize(0, true, false);
				}}
				onMouseMove={(event) => {
					if (!dragging) return;
					// A release the window never saw (outside it, or while inactive) may not be delivered even to a capturing element.
					if (event.buttons === 0) {
						finish();
						return;
					}
					const position = along(event);
					const delta = position - last;
					last = position;
					props.onResize(delta);
				}}
				onMouseUp={finish}
				onLostPointerCapture={finish}
				style={{
					position: 'absolute',
					zIndex: 10,
					...(horizontal()
						? {
								top: 0,
								left: -GRABBER_SIZE / 2,
								width: GRABBER_SIZE,
								height: '100%',
								cursor: 'col-resize',
							}
						: {
								left: 0,
								top: -GRABBER_SIZE / 2,
								height: GRABBER_SIZE,
								width: '100%',
								cursor: 'row-resize',
							}),
				}}
			/>
		</div>
	);
}

function PanelSlot(props: {
	entry: PanelEntry;
	index: number;
	size: number | undefined;
	orientation: PanelOrientation;
	isDragging: boolean;
	hasMounted: boolean;
}) {
	const flex = () => isFlexPanel(props.entry.props);
	const hidden = () => props.entry.props.hidden === true;
	const horizontal = () => props.orientation === 'horizontal';
	const ease = () =>
		hidden() ? PANEL_COLLAPSE_EASE_OUT : PANEL_COLLAPSE_EASE_IN;
	const animated = () => props.hasMounted && !props.isDragging;
	const naturalSize = () =>
		flex()
			? undefined
			: (props.size ?? props.entry.props.defaultSize ?? DEFAULT_SIZE);
	const flexBasis = () => {
		if (flex()) return '0%';
		if (hidden()) return '0px';
		return `${props.size ?? 0}px`;
	};
	return (
		<div
			testId={props.entry.props.testId}
			style={{
				minWidth: 0,
				flexGrow: flex() ? 1 : 0,
				flexShrink: flex() ? 1 : 0,
				flexBasis: flexBasis(),
				...(flex()
					? {
							[horizontal() ? 'minWidth' : 'minHeight']:
								props.entry.props.minSize ?? 0,
						}
					: {
							display: 'flex',
							justifyContent:
								props.entry.props.anchor === 'end' ? 'flex-end' : 'flex-start',
						}),
				...(animated()
					? {
							transition: `flex-basis ${PANEL_COLLAPSE_DURATION_MS}ms ${ease()}`,
						}
					: {}),
			}}
		>
			<div
				style={{
					height: '100%',
					width: '100%',
					...(naturalSize() !== undefined && !props.isDragging
						? { [horizontal() ? 'minWidth' : 'minHeight']: naturalSize() }
						: {}),
					...(hidden() || props.isDragging ? { pointerEvents: 'none' } : {}),
				}}
			>
				{props.entry.element}
			</div>
		</div>
	);
}

function PanelGroupBody(props: PanelGroupProps) {
	const scope = useContext(PanelGroupContext);
	if (scope === undefined) throw new Error('PanelGroupBody outside PanelGroup');
	const orientation = () => props.orientation ?? 'horizontal';
	const horizontal = () => orientation() === 'horizontal';
	const [isDragging, setIsDragging] = createSignal(false);
	const [hasMounted, setHasMounted] = createSignal(false);
	let container: HostElement | undefined;

	const resolved = resolveChildren(() => props.children);
	// A panel cannot know its place until every sibling exists, so the order is read from the resolved children, after them.
	createComputed(() => {
		scope.setOrder(
			nodesOf(resolved).map((node) => {
				const entry = scope.entryOf(node);
				if (entry === undefined) {
					throw new Error(
						'PanelGroup children must be <Panel> elements. Move anything else outside the PanelGroup or into a Panel.',
					);
				}
				return entry;
			}),
		);
	});
	const panels = () => scope.entries();

	const storageKey = () =>
		props.storageKey === undefined
			? `panel-sizes-${panels().length}`
			: `${props.storageKey}-${panels().length}`;
	const [sizes, setSizes] = createSignal<Sizes>(
		initialSizes(untrack(panels), untrack(storageKey)),
	);
	let liveSizes = untrack(sizes);
	const commitSizes = (next: Sizes) => {
		liveSizes = next;
		setSizes(next);
	};

	const structureKey = () =>
		panels()
			.map((panel, index) => `${index}:${panel.props.defaultSize ?? 'flex'}`)
			.join('|');
	createEffect(
		on(structureKey, () => commitSizes(initialSizes(panels(), storageKey())), {
			defer: true,
		}),
	);

	const mountTimer = setTimeout(() => setHasMounted(true), 50);
	onCleanup(() => clearTimeout(mountTimer));

	const persist = (next: Sizes) =>
		panelStorage().set(storageKey(), JSON.stringify(next));

	const containerLength = () => {
		if (container === undefined) throw new Error('PanelGroup is not mounted');
		return horizontal() ? container.clientWidth : container.clientHeight;
	};

	const otherFixedTotal = (excludeIndex: number) =>
		panels().reduce((total, panel, index) => {
			if (index === excludeIndex || isFlexPanel(panel.props)) return total;
			return total + (liveSizes[index] ?? 0);
		}, 0);

	const resize = (
		panelIndex: number,
		delta: number,
		isDragStart?: boolean,
		isDragEnd?: boolean,
	) => {
		const current = panels();
		const left = current[panelIndex];
		const right = current[panelIndex + 1];
		if (left === undefined || right === undefined) return;
		if (left.props.hidden === true || right.props.hidden === true) return;

		if (isDragStart) {
			setIsDragging(true);
			props.onResizeStateChange?.(true);
			return;
		}
		if (isDragEnd) {
			setIsDragging(false);
			props.onResizeStateChange?.(false);
			persist(liveSizes);
			props.onChange?.(
				current.map((panel, index) => {
					if (panel.props.hidden === true) return 0;
					if (isFlexPanel(panel.props)) {
						return horizontal()
							? panel.element.clientWidth
							: panel.element.clientHeight;
					}
					return liveSizes[index] ?? 0;
				}),
			);
			return;
		}

		const leftFlex = isFlexPanel(left.props);
		const rightFlex = isFlexPanel(right.props);
		const next = { ...liveSizes };
		if (!leftFlex) {
			const size = liveSizes[panelIndex] ?? 0;
			const min = left.props.minSize ?? DEFAULT_MIN_SIZE;
			const max = left.props.maxSize ?? Number.POSITIVE_INFINITY;
			let maxAllowed = max;
			if (rightFlex && right.props.minSize) {
				maxAllowed = Math.min(
					max,
					containerLength() -
						otherFixedTotal(panelIndex) -
						right.props.minSize -
						current.length,
				);
			}
			next[panelIndex] = clamp(size + delta, min, maxAllowed);
		}
		if (!rightFlex) {
			const size = liveSizes[panelIndex + 1] ?? 0;
			const min = right.props.minSize ?? DEFAULT_MIN_SIZE;
			const max = right.props.maxSize ?? Number.POSITIVE_INFINITY;
			let maxAllowed = max;
			if (leftFlex && left.props.minSize) {
				maxAllowed = Math.min(
					max,
					containerLength() -
						otherFixedTotal(panelIndex + 1) -
						left.props.minSize -
						current.length,
				);
			}
			next[panelIndex + 1] = clamp(size - delta, min, maxAllowed);
		}
		commitSizes(next);
	};

	return (
		<div
			ref={(element) => {
				container = element;
			}}
			testId={props.testId}
			style={{
				display: 'flex',
				height: '100%',
				width: '100%',
				flexDirection: horizontal() ? 'row' : 'column',
				...props.style,
			}}
		>
			<For each={panels()}>
				{(entry, index) => (
					<>
						<PanelSlot
							entry={entry}
							index={index()}
							size={sizes()[index()]}
							orientation={orientation()}
							isDragging={isDragging()}
							hasMounted={hasMounted()}
						/>
						<Show
							when={
								index() < panels().length - 1 &&
								entry.props.hidden !== true &&
								panels()[index() + 1]?.props.hidden !== true
							}
						>
							<ResizeHandle
								orientation={orientation()}
								isDragging={isDragging()}
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-handle-${index()}`
								}
								onResize={(delta, isDragStart, isDragEnd) =>
									resize(index(), delta, isDragStart, isDragEnd)
								}
							/>
						</Show>
					</>
				)}
			</For>
		</div>
	);
}

/**
 * Resizable panel system for native macOS-style multi-column and split layouts.
 * `PanelGroup` lays out `Panel` children with drag-to-resize handles, smooth
 * collapse and expand, and per-group size persistence.
 */
export function PanelGroup(props: PanelGroupProps) {
	const created: PanelEntry[] = [];
	const byElement = new WeakMap<object, PanelEntry>();
	const [version, bump] = createSignal(0);
	let ordered: PanelEntry[] | undefined;
	const scope: PanelGroupScope = {
		register(entry) {
			created.push(entry);
			byElement.set(entry.element, entry);
		},
		entryOf: (node) =>
			typeof node === 'object' && node !== null
				? byElement.get(node)
				: undefined,
		entries() {
			version();
			return ordered ?? created;
		},
		setOrder(next) {
			ordered = next;
			bump((count) => count + 1);
		},
		orientation: () => props.orientation ?? 'horizontal',
	};
	return (
		<PanelGroupContext.Provider value={scope}>
			<PanelGroupBody {...props} />
		</PanelGroupContext.Provider>
	);
}

export function Panel(props: PanelProps) {
	const group = useContext(PanelGroupContext);
	if (group === undefined) {
		throw new Error('Panel must be rendered inside a <PanelGroup>');
	}
	let entry: PanelEntry | undefined;
	const index = () =>
		entry === undefined ? 0 : group.entries().indexOf(entry);
	return (
		<PanelContext.Provider
			value={{
				get panelIndex() {
					return index();
				},
				get isFirstPanel() {
					return index() === 0;
				},
				get isLastPanel() {
					return index() === group.entries().length - 1;
				},
				get orientation() {
					return group.orientation();
				},
			}}
		>
			<SplitViewColumnContext.Provider value={null}>
				<div
					ref={(element) => {
						entry = { props, element };
						group.register(entry);
					}}
					style={{
						position: 'relative',
						height: '100%',
						width: '100%',
						...props.style,
					}}
				>
					{props.children}
				</div>
			</SplitViewColumnContext.Provider>
		</PanelContext.Provider>
	);
}
