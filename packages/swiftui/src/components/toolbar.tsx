import {
	createContext,
	type JSX,
	children as resolveChildren,
	Show,
	splitProps,
	useContext,
} from 'solid-js';
import { usePanelContext } from '#src/components/panel-context.ts';
import { ProgressiveBlur } from '#src/components/progressive-blur.tsx';
import { useSidebarContext } from '#src/components/sidebar-context.ts';
import {
	type ToolbarInset,
	useSplitViewColumnContext,
} from '#src/components/split-view-column-context.ts';
import { Text } from '#src/components/text.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { nodesOf } from '#src/resolved.ts';
import { withAlpha } from '#src/tokens/color-math.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

export type { ToolbarInset };
export { ToolbarScrolledContext };

/** Clears the traffic lights. */
const WINDOW_CONTROLS_INSET = 80;
/** Clears the traffic lights and a pinned sidebar toggle. */
const WINDOW_CONTROLS_AND_BUTTON_INSET = 124;
const DEFAULT_INSET_TRANSITION =
	'padding 200ms cubic-bezier(0.165, 0.84, 0.44, 1)';

function insetPadding(inset: ToolbarInset): number {
	switch (inset) {
		case 'none':
			return 0;
		case 'windowControls':
			return WINDOW_CONTROLS_INSET;
		case 'windowControlsAndButton':
			return WINDOW_CONTROLS_AND_BUTTON_INSET;
	}
}

interface ToolbarContextValue {
	readonly inset: ToolbarInset;
	readonly insetTransition: string | undefined;
	/** The row's place among the toolbar's rows: rows are indexed in the order they are created. */
	nextRowIndex: () => number;
}

const ToolbarContext = createContext<ToolbarContextValue>();

/** Whether the content has scrolled under the toolbar: a `ScrollArea` publishes it to the toolbar it builds or is given. */
const ToolbarScrolledContext = createContext<() => boolean>();

/** How much of the window's solid background shows over a scrolled toolbar's blur: enough that glass controls scrolling under it stay readable, which a backdrop blur cannot do (it cannot see a native view). */
const SCROLLED_FILL_ALPHA = 0.8;

/** The root elements `ToolbarRow` made: a host element carries no component identity, so `Toolbar` recognises composed rows by these. */
const rowElements = new WeakSet<object>();

export interface ToolbarRowProps extends HostAttributes {}

export function ToolbarRow(props: ToolbarRowProps) {
	const toolbar = useContext(ToolbarContext);
	if (toolbar === undefined) {
		throw new Error('ToolbarRow must be used within a Toolbar component');
	}
	const [own, rest] = splitProps(props, ['style', 'children', 'ref']);
	const isFirstRow = toolbar.nextRowIndex() === 0;
	const inSidebar = useSidebarContext();
	return (
		<div
			{...rest}
			ref={(element) => {
				rowElements.add(element);
				own.ref?.(element);
			}}
			style={{
				width: '100%',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 8,
				...(inSidebar ? { minHeight: 36 } : { height: 52 }),
				paddingLeft: isFirstRow ? insetPadding(toolbar.inset) : 0,
				transition: toolbar.insetTransition ?? DEFAULT_INSET_TRANSITION,
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

/** Wraps bare children in a row when the toolbar was given none. */
function ToolbarBody(props: { children?: JSX.Element }) {
	const resolved = resolveChildren(() => props.children);
	const hasRows = () =>
		nodesOf(resolved).some(
			(node) =>
				typeof node === 'object' && node !== null && rowElements.has(node),
		);
	return (
		<Show when={hasRows()} fallback={<ToolbarRow>{resolved()}</ToolbarRow>}>
			{resolved()}
		</Show>
	);
}

export interface ToolbarProps extends HostAttributes {
	position?: 'top' | 'bottom';
	/**
	 * Escape hatch; normally resolved from the panel and split-view layout.
	 * Footers (`position="bottom"`) never get an inset.
	 */
	inset?: ToolbarInset;
	background?: 'progressive-blur' | 'full-blur';
	/**
	 * Scroll edge: while false there is no blur, fill or hairline; once true the
	 * `background` blur shows under a translucent fill, with a hairline on the
	 * bar's far edge. Left unset, a toolbar in a `ScrollArea` takes it from the
	 * area's scroll offset, and one outside shows its blur always.
	 */
	scrolled?: boolean;
	disableLayoutTransition?: boolean;
}

/**
 * Native macOS-style sticky header. Most apps reach for `ScrollArea`'s
 * `title`, `subtitle`, `actions` and `leading` props (they build a `Toolbar`)
 * rather than this directly.
 *
 * A top toolbar is a window drag region (`appRegion: 'drag'`); a `Button`
 * inside it opts out of its own box. Inside a `Sidebar` the horizontal padding
 * is the flush macOS 27 inset, 10px each side.
 */
export function Toolbar(props: ToolbarProps) {
	const [own, rest] = splitProps(props, [
		'position',
		'inset',
		'background',
		'scrolled',
		'disableLayoutTransition',
		'style',
		'children',
	]);
	const panel = usePanelContext();
	const column = useSplitViewColumnContext();
	const inSidebar = useSidebarContext();
	const position = () => own.position ?? 'top';
	const background = () => own.background ?? 'progressive-blur';
	const scrolledByArea = useContext(ToolbarScrolledContext);
	const scrolled = () => own.scrolled ?? scrolledByArea?.();
	const isScrollEdge = () => scrolled() !== undefined;
	const showsBackground = () => scrolled() ?? true;

	const inset = (): ToolbarInset => {
		if (own.inset !== undefined) return own.inset;
		if (position() === 'bottom') return 'none';
		if (column !== null) {
			return column.insetHint ?? (column.isFirst ? 'windowControls' : 'none');
		}
		if (panel === null) return 'windowControls';
		if (panel.isFirstPanel && panel.orientation === 'horizontal') {
			return 'windowControls';
		}
		return 'none';
	};

	let rowCount = 0;
	return (
		<ToolbarContext.Provider
			value={{
				get inset() {
					return inset();
				},
				get insetTransition() {
					return column?.insetTransition;
				},
				nextRowIndex: () => rowCount++,
			}}
		>
			<div
				{...rest}
				style={{
					width: '100%',
					position: 'relative',
					zIndex: 20,
					paddingInline: inSidebar ? 10 : 8,
					...(position() === 'top' ? { appRegion: 'drag' } : {}),
					...own.style,
				}}
			>
				{/* A sidebar's glass is a native view, which a backdrop blur over it cannot see; `ScrollArea` fades the list out there instead. */}
				<Show
					when={
						background() === 'progressive-blur' &&
						!inSidebar &&
						showsBackground()
					}
				>
					<ProgressiveBlur
						position={position()}
						height="100%"
						style={{ zIndex: -1 }}
					/>
				</Show>
				<Show when={background() === 'full-blur' && showsBackground()}>
					<div
						style={{
							position: 'absolute',
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							zIndex: -1,
							backdropFilter: 'blur(24px)',
							...(isScrollEdge()
								? {}
								: {
										borderStyle: 'solid',
										borderColor: semanticColors.borderTertiary,
										borderTopWidth: position() === 'bottom' ? 1 : 0,
										borderBottomWidth: position() === 'bottom' ? 0 : 1,
									}),
						}}
					/>
				</Show>
				<Show when={isScrollEdge() && !inSidebar && showsBackground()}>
					{/* Over the blur, not under it: a native glass control scrolling beneath is invisible to the blur, so the fill is what keeps it from colliding with the title. */}
					<div
						style={{
							pointerEvents: 'none',
							position: 'absolute',
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							zIndex: -1,
							backgroundColor: withAlpha(
								semanticColors.backgroundSolid,
								SCROLLED_FILL_ALPHA,
							),
						}}
					/>
					<div
						style={{
							pointerEvents: 'none',
							position: 'absolute',
							left: 0,
							right: 0,
							height: 1,
							zIndex: -1,
							backgroundColor: semanticColors.borderSeparator,
							...(position() === 'bottom' ? { top: 0 } : { bottom: 0 }),
						}}
					/>
				</Show>
				<div
					style={{
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						...(own.disableLayoutTransition === true
							? {}
							: { transition: 'all 300ms ease-out' }),
					}}
				>
					<ToolbarBody>{own.children}</ToolbarBody>
				</div>
			</div>
		</ToolbarContext.Provider>
	);
}

export interface ToolbarContentProps extends HostAttributes {}

export function ToolbarContent(props: ToolbarContentProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: 0,
				minWidth: 0,
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

const clippedLine = {
	paddingLeft: 6,
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	textOverflow: 'ellipsis',
	overflow: 'clip',
} as const;

export interface ToolbarTitleProps extends Omit<HostAttributes, 'color'> {}

/**
 * Title for the current view: the active filename, selected item, or section
 * name, never the app name. SwiftUI's `navigationTitle` on macOS 26 is 13px
 * bold on a 15px line, with the 11px subtitle on a 13px line under it.
 */
export function ToolbarTitle(props: ToolbarTitleProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Text
			{...rest}
			as="h2"
			variant="strong"
			style={{
				...clippedLine,
				fontWeight: 700,
				lineHeight: '15px',
				...own.style,
			}}
		>
			{own.children}
		</Text>
	);
}

export interface ToolbarDescriptionProps
	extends Omit<HostAttributes, 'color'> {}

export function ToolbarDescription(props: ToolbarDescriptionProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Text
			{...rest}
			as="p"
			variant="small"
			color="secondary"
			style={{ ...clippedLine, lineHeight: '13px', ...own.style }}
		>
			{own.children}
		</Text>
	);
}

export interface ToolbarActionsProps extends HostAttributes {}

export function ToolbarActions(props: ToolbarActionsProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				marginLeft: 'auto',
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}
