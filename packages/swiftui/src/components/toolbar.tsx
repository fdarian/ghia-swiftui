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
import { semanticColors } from '#src/tokens/semantic-colors.ts';

export type { ToolbarInset };

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
		'disableLayoutTransition',
		'style',
		'children',
	]);
	const panel = usePanelContext();
	const column = useSplitViewColumnContext();
	const inSidebar = useSidebarContext();
	const position = () => own.position ?? 'top';
	const background = () => own.background ?? 'progressive-blur';

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
				<Show when={background() === 'progressive-blur'}>
					<ProgressiveBlur
						position={position()}
						height="100%"
						style={{ zIndex: -1 }}
					/>
				</Show>
				<Show when={background() === 'full-blur'}>
					<div
						style={{
							position: 'absolute',
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							zIndex: -1,
							backdropFilter: 'blur(24px)',
							borderStyle: 'solid',
							borderColor: semanticColors.borderTertiary,
							borderTopWidth: position() === 'bottom' ? 1 : 0,
							borderBottomWidth: position() === 'bottom' ? 0 : 1,
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
 * name, never the app name. Native (Tahoe) unified-toolbar titles render at
 * 15px medium, a size the `Text` scale does not have.
 */
export function ToolbarTitle(props: ToolbarTitleProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Text
			{...rest}
			as="h2"
			variant="strong"
			style={{ ...clippedLine, fontSize: 15, fontWeight: 500, ...own.style }}
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
			color="secondary"
			style={{ ...clippedLine, ...own.style }}
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
