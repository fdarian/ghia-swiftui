import {
	DismissableLayer,
	type HostElement,
	type KeyEvent,
	motion,
} from '@ghia/solid';
import {
	createPlacementState,
	POPUP_MARGIN,
} from 'base-ui-solid-gpuix/internals';
import {
	createMenuItem,
	createMenuList,
	createMenuRoot,
	createMenuTrigger,
	type MenuItemHost,
} from 'base-ui-solid-gpuix/menu';
import {
	createContext,
	createSignal,
	type JSX,
	Show,
	splitProps,
	useContext,
} from 'solid-js';
import {
	GlassPanel,
	type GlassPanelProps,
} from '#src/components/glass-panel.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { IconSizeContext } from '#src/icons/icon-size.ts';
import { anchoredShift, PopupShadow, SHADOW_PAD } from '#src/popup.tsx';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';
import { typography } from '#src/tokens/typography.ts';

/** Matches `Button`'s own `size="small"` icon sizing: an item has no `Button` underneath to inherit it from. */
const ITEM_ICON_SIZE = 16;
/** The popup's exit fade, then a buffer for a fade that never completes. */
const EXIT_MS = 160;
/** FF focuses the first row two frames after a pointer open, once the popup itself holds focus. */
const OPEN_FOCUS_MS = 32;

type MenuRootState = ReturnType<typeof createMenuRoot>;

const MenuScopeContext = createContext<MenuRootState>();

function useMenuScope(): MenuRootState {
	const scope = useContext(MenuScopeContext);
	if (scope === undefined) {
		throw new Error('Menu parts must be rendered inside a <Menu.Root>');
	}
	return scope;
}

export interface MenuRootProps {
	/** Controlled open state. */
	open?: boolean;
	/** Initial open state (uncontrolled). */
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
	/** Accepted for syne's `modal={false}`: a menu here never blocks the page behind it. */
	modal?: boolean;
	children?: JSX.Element;
}

/**
 * Groups every part below. Renders a `div` that wraps the trigger and the
 * popup: the popup is anchored to it, and it hears the trigger's keys and a
 * press outside.
 */
export function MenuRoot(props: MenuRootProps) {
	const root = createMenuRoot(props, { exitMs: EXIT_MS });
	return (
		<MenuScopeContext.Provider value={root}>
			<div
				onKeyDown={root.onKeyDown}
				onMouseDownOutside={root.onMouseDownOutside}
				style={{ position: 'relative', display: 'flex', flexShrink: 0 }}
			>
				{props.children}
			</div>
		</MenuScopeContext.Provider>
	);
}

/** The element a press on the trigger's wrapper should hand focus back to: the first tab stop inside it. */
function firstTabStop(element: HostElement): HostElement | undefined {
	for (const child of element.children) {
		if (child.kind !== 'element') continue;
		const tabIndex = child.props.get('tabIndex');
		if (typeof tabIndex === 'number' && tabIndex >= 0) return child;
		const nested = firstTabStop(child);
		if (nested !== undefined) return nested;
	}
	return undefined;
}

export interface MenuTriggerProps extends HostAttributes {
	children?: JSX.Element;
}

/**
 * Opens the popup. Renders a `div` around its children (a `Button`, say):
 * their press bubbles up to it.
 */
export function MenuTrigger(props: MenuTriggerProps) {
	const root = useMenuScope();
	const [own, rest] = splitProps(props, ['style', 'children']);
	const trigger = createMenuTrigger({
		...root,
		// The wrapper cannot take focus back on close; the control inside it can.
		noteTrigger: (wrapper) =>
			root.noteTrigger(firstTabStop(wrapper) ?? wrapper),
	});
	return (
		<div
			{...rest}
			id={trigger.attributes.id}
			aria-haspopup={trigger.attributes['aria-haspopup']}
			aria-expanded={trigger.attributes['aria-expanded']}
			aria-controls={trigger.attributes['aria-controls']}
			onMouseDown={trigger.onMouseDown}
			onClick={trigger.onClick}
			style={{ display: 'flex', flexShrink: 0, ...own.style }}
		>
			{own.children}
		</div>
	);
}

export interface MenuPortalProps {
	children?: JSX.Element;
}

/** Mounts its children while the popup is open or fading out. */
export function MenuPortal(props: MenuPortalProps) {
	const root = useMenuScope();
	return <Show when={root.presence.mounted()}>{props.children}</Show>;
}

type MenuSide = 'top' | 'right' | 'bottom' | 'left';
type MenuAlign = 'start' | 'center' | 'end';

export interface MenuPositionerProps {
	side?: MenuSide;
	align?: MenuAlign;
	/** Distance from the trigger, in px. */
	sideOffset?: number;
	/** Shift along the trigger's edge, in px. */
	alignOffset?: number;
	children?: JSX.Element;
}

/** Positions the popup against the `Root`'s box. */
export function MenuPositioner(props: MenuPositionerProps) {
	const root = useMenuScope();
	const placement = createPlacementState(props.side ?? 'bottom');
	const shift = () =>
		anchoredShift(
			props.side ?? 'bottom',
			props.align ?? 'center',
			props.sideOffset ?? 0,
			props.alignOffset ?? 0,
		);
	return (
		<>
			{/* A layer only while open: a second Escape during the exit fade belongs to whatever is behind. */}
			<Show when={root.presence.open()}>
				<DismissableLayer onEscapeKeyDown={() => root.setOpen(false)} />
			</Show>
			<anchored
				side={props.side ?? 'bottom'}
				align={props.align ?? 'center'}
				gap={shift().gap}
				offset={shift().offset}
				fit="flip"
				snapMargin={POPUP_MARGIN}
				onPlacement={placement.onPlacement}
				deferred
				priority={1}
				style={{
					backgroundColor: 'transparent',
					padding: SHADOW_PAD,
					pointerEvents: 'none',
				}}
			>
				{props.children}
			</anchored>
		</>
	);
}

interface MenuListContextValue extends MenuItemHost {
	highlighted: () => number | null;
	setHighlighted: (index: number | null) => void;
	/** The row index of the next item to mount: items are rows in the order they are created. */
	nextIndex: () => number;
}

const MenuListContext = createContext<MenuListContextValue>();

function useMenuList(): MenuListContextValue {
	const list = useContext(MenuListContext);
	if (list === undefined) {
		throw new Error('A Menu.Item must be rendered inside a <Menu.Popup>');
	}
	return list;
}

/** Ctrl+N and Ctrl+P step like the arrows: the list ignores chords, so the key is handed to it as the arrow. */
function remapEmacsNavigationKey(event: KeyEvent): KeyEvent {
	if (event.ctrlKey !== true) return event;
	const key =
		event.key === 'n' ? 'ArrowDown' : event.key === 'p' ? 'ArrowUp' : undefined;
	if (key === undefined) return event;
	return Object.create(event, {
		key: { value: key },
		ctrlKey: { value: false },
	});
}

export interface MenuPopupProps extends Omit<GlassPanelProps, 'onKeyDown'> {
	onKeyDown?: (event: KeyEvent) => void;
	/**
	 * Whether a pointer open lights the first enabled row. `false` leaves every
	 * row unlit until the pointer or a key moves, as NSMenu does; `showContextMenu`
	 * sets it. Not in syne: its `Menu` is always the lit-on-open one.
	 */
	highlightOnOpen?: boolean;
}

/** The menu surface: a `GlassPanel` that owns the keyboard, the highlight and the open and close motion. */
export function MenuPopup(props: MenuPopupProps) {
	const root = useMenuScope();
	const [own, rest] = splitProps(props, [
		'style',
		'onKeyDown',
		'highlightOnOpen',
		'children',
	]);
	const [highlighted, setHighlighted] = createSignal<number | null>(null);
	let rowCount = 0;
	const list = createMenuList({
		open: root.presence.open,
		mounted: root.presence.mounted,
		closeAll: () => root.setOpen(false),
		closeSelf: () => root.setOpen(false),
		isSub: false,
		multiple: () => false,
		keyboardActive: root.keyboardActive,
		setKeyboardActive: root.setKeyboardActive,
		leave: root.leave,
		openFrom: root.openFrom,
		pressPick: root.pressPick,
		releasePress: root.releasePress,
		highlightedIndex: highlighted,
		onHighlightChange: (index) => setHighlighted(index),
		rowRect: () => undefined,
		revealPadding: 0,
		searchHeight: 0,
		pointer: {
			onMouseEnter: () => {},
			onMouseMove: () => {},
			onMouseLeave: () => setHighlighted(null),
		},
		openFocusMs: own.highlightOnOpen === false ? null : OPEN_FOCUS_MS,
	});
	root.watchPopupFocus(list.containsFocus);
	const panelProps = list.popupProps({
		id: root.popupId,
		labelledBy: root.triggerId,
	});

	return (
		<MenuListContext.Provider
			value={{
				...list.itemHost,
				highlighted,
				setHighlighted,
				nextIndex: () => rowCount++,
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.97 }}
				animate={
					root.presence.open()
						? { opacity: 1, scale: 1 }
						: { opacity: 0, scale: 0.97 }
				}
				transition={
					root.presence.open()
						? { type: 'spring', duration: 0.08, bounce: 0 }
						: { duration: 0.06 }
				}
				onMotionComplete={() => {
					if (!root.presence.open()) root.presence.release();
				}}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					pointerEvents: 'auto',
					width: 'max-content',
					maxWidth: '100%',
				}}
			>
				<PopupShadow />
				<GlassPanel
					{...rest}
					{...panelProps}
					ref={(element: HostElement) => {
						list.setPanel(element);
						rest.ref?.(element);
					}}
					onKeyDown={(event: KeyEvent) => {
						own.onKeyDown?.(event);
						panelProps.onKeyDown(remapEmacsNavigationKey(event));
					}}
					onMouseEnter={list.handlers.onMouseEnter}
					onMouseMove={list.handlers.onMouseMove}
					onMouseLeave={list.handlers.onMouseLeave}
					style={{
						flexDirection: 'column',
						alignItems: 'stretch',
						borderRadius: styleTokens.radiusPopover,
						outline: `1px solid ${semanticColors.borderSecondary}`,
						keyboardFocusDim: false,
						...own.style,
					}}
				>
					{own.children}
				</GlassPanel>
			</motion.div>
		</MenuListContext.Provider>
	);
}

export interface MenuItemProps extends Omit<HostAttributes, 'onClick'> {
	/** Runs when the item is picked, by click, Enter or Space. */
	onClick?: () => void;
	disabled?: boolean;
	/** Whether picking the item closes the menu. Defaults to `true`. */
	closeOnClick?: boolean;
	/** What typeahead matches against. Without it the item is skipped by typeahead (an item's children are not read for text). */
	label?: string;
}

/**
 * A selectable row. The highlight follows the pointer and the keyboard alike
 * (the list's own highlighted index, not `:hover`), so Ctrl+N, Ctrl+P and the
 * arrows light a row as a mouse would.
 */
export function MenuItem(props: MenuItemProps) {
	const list = useMenuList();
	const [own, rest] = splitProps(props, [
		'onClick',
		'disabled',
		'closeOnClick',
		'label',
		'style',
		'children',
		'ref',
	]);
	const index = list.nextIndex();
	const item = createMenuItem(list, {
		get label() {
			return own.label ?? '';
		},
		index,
		get onSelect() {
			return own.onClick;
		},
		get disabled() {
			return own.disabled;
		},
		get closeOnClick() {
			return own.closeOnClick;
		},
	});
	const lit = () => list.highlighted() === index && own.disabled !== true;
	return (
		<div
			{...rest}
			// Explicit, not `{...item.props}`: a spread applies late, so the row would become focusable (tabIndex) only after the open's `focus()`.
			id={item.props.id}
			role={item.props.role}
			tabIndex={item.props.tabIndex}
			aria-disabled={item.props['aria-disabled']}
			onFocus={(event) => {
				// A press on a disabled row still focuses it; it must not take the highlight.
				if (own.disabled !== true) item.props.onFocus(event);
			}}
			onMouseDown={item.props.onMouseDown}
			onMouseUp={item.props.onMouseUp}
			onClick={item.props.onClick}
			onMouseMove={() => {
				if (own.disabled !== true) list.setHighlighted(index);
			}}
			ref={(element: HostElement) => {
				item.setElement(element);
				own.ref?.(element);
			}}
			style={{
				display: 'flex',
				flexDirection: 'row',
				width: '100%',
				flexShrink: 0,
				alignItems: 'center',
				gap: 10,
				paddingInline: 12,
				paddingBlock: 6,
				borderRadius: styleTokens.radius8,
				textAlign: 'left',
				...typography.variants.strong,
				whiteSpace: 'nowrap',
				cursor: own.disabled === true ? 'not-allowed' : 'default',
				keyboardFocusDim: false,
				color: lit()
					? semanticColors.textPrimary
					: semanticColors.textSecondary,
				backgroundColor: lit()
					? semanticColors.surfaceControlSubtle
					: 'transparent',
				...(own.disabled === true ? { opacity: 0.5 } : {}),
				...own.style,
			}}
		>
			<IconSizeContext.Provider value={() => ITEM_ICON_SIZE}>
				{own.children}
			</IconSizeContext.Provider>
		</div>
	);
}

export {
	MenuItem as Item,
	MenuPopup as Popup,
	MenuPortal as Portal,
	MenuPositioner as Positioner,
	MenuRoot as Root,
	MenuTrigger as Trigger,
};
