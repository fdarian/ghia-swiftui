import { document, type HostElement, type KeyEvent } from '@ghia/solid';
import {
	type Accessor,
	createContext,
	createMemo,
	onCleanup,
	onMount,
	Show,
	splitProps,
	useContext,
} from 'solid-js';
import { NativeGlass } from '#src/components/native-glass.tsx';
import { useScrollAreaContext } from '#src/components/scroll-area-context.ts';
import { Text } from '#src/components/text.tsx';
import type { HostAttributes } from '#src/host-props.ts';
import { contains } from '#src/host-tree.ts';
import { createRevealOnSelect } from '#src/reveal.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

/** A SwiftUI `List` row on macOS 26: 40pt tall, the selection 10pt in from the list's edge at an 8pt radius, the content 6pt inside it. */
const LIST_INSET = 10;
const ROW_HEIGHT = 40;
const ROW_PADDING_START = 6;
const ROW_PADDING_END = 8;
const ROW_RADIUS = 8;
/** The separator starts at the text's left edge and ends as far from the right one: 16pt from each side of the list. */
const SEPARATOR_INSET = ROW_PADDING_START;

/**
 * A native macOS-style vertical list with optional single selection and
 * built-in keyboard navigation (`ArrowUp`/`ArrowDown`/`Home`/`End` move
 * `selectedItem`; there is no per-row roving `tabIndex`: `List.Root` itself is
 * the one tab stop). Parts: `Root`, `Item`, `ItemContent`, `ItemTitle`,
 * `ItemDescription`, `ItemAccessory`.
 */

interface ListContextValue<T> {
	selectedItem: () => T | null | undefined;
	onItemSelect: () => ((item: T) => void) | undefined;
	items: () => T[];
	getItemKey: () => (item: T) => string;
	isSelectionEnabled: () => boolean;
}

// biome-ignore lint/suspicious/noExplicitAny: the context is generic-agnostic; consumers narrow it through useListContext<T>()
const ListContext = createContext<ListContextValue<any>>();

function useListContext<T>(): ListContextValue<T> {
	const context = useContext(ListContext);
	if (context === undefined) {
		throw new Error('List components must be used within a List.Root');
	}
	return context as ListContextValue<T>;
}

export interface ListRef {
	focus: () => void;
	handleKeyDown: (event: KeyEvent) => void;
}

export interface ListRootProps<T>
	extends Omit<HostAttributes, 'ref' | 'onKeyDown'> {
	items: T[];
	selectedItem?: T | null;
	onSelectedItemChange?: (item: T) => void;
	getItemKey: (item: T) => string;
	/**
	 * How far (px) before the end of the list `onEndReached` fires. The list
	 * must be inside a `ScrollArea`: it is the scroller that tells when the
	 * end is near.
	 */
	endThreshold?: number;
	onEndReached?: () => void;
	autoFocus?: boolean;
	onKeyDown?: (event: KeyEvent) => void;
	/** Runs after the list's own navigation, for every key the list hears. */
	onNavigationKeyDown?: (event: KeyEvent) => void;
	/** Receives the imperative handle once mounted. */
	ref?: (list: ListRef) => void;
}

/** The last 4px of the list: when it comes within `endThreshold` of the scroller's bottom, `onEndReached` runs. */
function ListEndMarker(props: {
	onEndReached: () => void;
	endThreshold: number;
}) {
	const scroll = useScrollAreaContext();
	if (scroll === undefined) {
		throw new Error('List: onEndReached needs the List inside a ScrollArea');
	}
	let marker: HostElement | undefined;
	let intersecting = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));

	const check = (reason: 'scroll' | 'layout') => {
		const viewport = scroll.viewport();
		if (viewport === undefined || marker === undefined) return;
		const area = viewport.getBoundingClientRect();
		const box = marker.getBoundingClientRect();
		const now = box.top <= area.bottom + props.endThreshold;
		// A layout change while still at the end means the list grew under it: ask again, as a fresh observer would.
		const fire = now && (!intersecting || reason === 'layout');
		intersecting = now;
		if (!fire) return;
		clearTimeout(timer);
		timer = setTimeout(props.onEndReached, 100);
	};
	onMount(() => onCleanup(scroll.subscribe(check)));

	return (
		<div
			ref={(element) => {
				marker = element;
			}}
			onLayout={() => check('layout')}
			aria-hidden
			// Opts out of scroll anchoring: as the anchor at the end of the content it would carry the offset down with every page loaded, and the end would never leave view.
			style={{ height: 4, overflowAnchor: 'none' }}
		/>
	);
}

function ListRoot<T>(props: ListRootProps<T>) {
	const [own, rest] = splitProps(props, [
		'items',
		'selectedItem',
		'onSelectedItemChange',
		'getItemKey',
		'endThreshold',
		'onEndReached',
		'autoFocus',
		'onKeyDown',
		'onNavigationKeyDown',
		'ref',
		'style',
		'children',
	]);
	let root: HostElement | undefined;

	const isSelectionEnabled = () =>
		own.selectedItem !== undefined && own.onSelectedItemChange !== undefined;

	onMount(() => {
		if (own.autoFocus !== true) return;
		const timer = setTimeout(() => {
			const active = document.activeElement;
			const isInputFocused =
				active !== null &&
				active !== undefined &&
				(active.type === 'input' || active.type === 'textarea');
			if (!isInputFocused) root?.focus({ preventScroll: true });
		}, 100);
		onCleanup(() => clearTimeout(timer));
	});

	const handleKeyDown = (event: KeyEvent) => {
		if (root === undefined || !contains(root, event.target)) return;
		if (own.items.length === 0) return;
		const select = own.onSelectedItemChange;
		if (isSelectionEnabled() && select !== undefined) {
			const selected = own.selectedItem;
			const currentIndex =
				selected === null || selected === undefined
					? -1
					: own.items.findIndex(
							(item) => own.getItemKey(item) === own.getItemKey(selected),
						);
			// Ctrl+N and Ctrl+P are Emacs-style aliases for next and previous: the quick-entry command panel wants them next to the arrows, and they land here so every list shares one navigation model.
			const isNext =
				event.key === 'ArrowDown' ||
				(event.ctrlKey === true && event.key === 'n');
			const isPrevious =
				event.key === 'ArrowUp' ||
				(event.ctrlKey === true && event.key === 'p');
			if (isNext) {
				event.preventDefault();
				const next = own.items[currentIndex + 1];
				if (currentIndex < own.items.length - 1 && next !== undefined) {
					select(next);
				}
			} else if (isPrevious) {
				event.preventDefault();
				const previous = own.items[currentIndex - 1];
				if (currentIndex > 0 && previous !== undefined) select(previous);
			} else if (event.key === 'Home') {
				event.preventDefault();
				const first = own.items[0];
				if (first !== undefined) select(first);
			} else if (event.key === 'End') {
				event.preventDefault();
				const last = own.items[own.items.length - 1];
				if (last !== undefined) select(last);
			}
		}
		own.onKeyDown?.(event);
		own.onNavigationKeyDown?.(event);
	};

	const context: ListContextValue<T> = {
		selectedItem: () => own.selectedItem,
		onItemSelect: () => own.onSelectedItemChange,
		items: () => own.items,
		getItemKey: () => own.getItemKey,
		isSelectionEnabled,
	};

	return (
		<ListContext.Provider value={context}>
			<div
				{...rest}
				ref={(element) => {
					root = element;
					own.ref?.({
						focus: () => element.focus(),
						handleKeyDown,
					});
				}}
				role={isSelectionEnabled() ? 'listbox' : 'list'}
				tabIndex={isSelectionEnabled() ? 0 : undefined}
				onKeyDown={handleKeyDown}
				style={{
					display: 'flex',
					flexDirection: 'column',
					paddingInline: LIST_INSET,
					paddingBlock: LIST_INSET,
					keyboardFocusDim: false,
					...own.style,
				}}
			>
				{own.children}
				<Show when={own.onEndReached}>
					{(onEndReached: Accessor<() => void>) => (
						<ListEndMarker
							onEndReached={onEndReached()}
							endThreshold={own.endThreshold ?? 0}
						/>
					)}
				</Show>
			</div>
		</ListContext.Provider>
	);
}

const INTERACTIVE_ROLES = new Set([
	'button',
	'menuitem',
	'option',
	'link',
	'checkbox',
	'radio',
	'switch',
	'tab',
]);

/** True when `target` is, or sits inside, a control of its own below `row`: a click on it is that control's, not the row's. */
function isInteractiveElement(target: object, row: HostElement): boolean {
	let current: HostElement | undefined = target as HostElement;
	while (current !== undefined && current !== row) {
		if (current.type === 'input' || current.type === 'textarea') return true;
		const role = current.props.get('role');
		if (typeof role === 'string' && INTERACTIVE_ROLES.has(role)) return true;
		const parent: unknown = current.parent;
		current =
			typeof parent === 'object' &&
			parent !== null &&
			(parent as { kind?: string }).kind === 'element'
				? (parent as HostElement)
				: undefined;
	}
	return false;
}

export interface ListItemProps<T> extends Omit<HostAttributes, 'onClick'> {
	item: T;
	onClick?: (item: T) => void;
	/**
	 * Use the glass material for the selected-row surface instead of the flat
	 * `surfaceListSelection` fill: for a list that floats over arbitrary content
	 * with nothing opaque behind it (the quick-entry panel). Mutually exclusive
	 * with the flat fill, not layered on it.
	 */
	glassSelection?: boolean;
}

function ListItem<T>(props: ListItemProps<T>) {
	const [own, rest] = splitProps(props, [
		'item',
		'onClick',
		'glassSelection',
		'style',
		'children',
		'ref',
		'onMouseDown',
	]);
	const list = useListContext<T>();
	const scroll = useScrollAreaContext();
	let row: HostElement | undefined;

	const isSelected = () => {
		const selected = list.selectedItem();
		return (
			list.isSelectionEnabled() &&
			selected !== null &&
			selected !== undefined &&
			list.getItemKey()(selected) === list.getItemKey()(own.item)
		);
	};
	const itemIndex = createMemo(() => {
		const key = list.getItemKey()(own.item);
		return list.items().findIndex((item) => list.getItemKey()(item) === key);
	});

	createRevealOnSelect({
		scroll,
		row: () => row,
		selected: isSelected,
		position: itemIndex,
	});

	/** A rule under the row, as SwiftUI draws between rows, unless the row or the next one is the selection (its fill is the divider there). */
	const separated = () => {
		if (own.glassSelection === true || isSelected()) return false;
		const index = itemIndex();
		const items = list.items();
		const next = items[index + 1];
		if (index === -1 || next === undefined) return false;
		const selected = list.selectedItem();
		const nextSelected =
			list.isSelectionEnabled() &&
			selected !== null &&
			selected !== undefined &&
			list.getItemKey()(selected) === list.getItemKey()(next);
		return !nextSelected;
	};
	const glassSelected = () => own.glassSelection === true && isSelected();
	return (
		<div
			{...rest}
			ref={(element) => {
				row = element;
				own.ref?.(element);
			}}
			role={list.isSelectionEnabled() ? 'option' : 'listitem'}
			aria-selected={list.isSelectionEnabled() ? isSelected() : undefined}
			onMouseDown={(event) => {
				if (event.button === 0) list.onItemSelect()?.(own.item);
				own.onMouseDown?.(event);
			}}
			onClick={(event) => {
				if (row === undefined) return;
				if (isInteractiveElement(event.target, row)) return;
				own.onClick?.(own.item);
			}}
			style={{
				display: 'flex',
				flexDirection: 'row',
				width: '100%',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 16,
				position: 'relative',
				minHeight: ROW_HEIGHT,
				borderRadius: ROW_RADIUS,
				paddingLeft: ROW_PADDING_START,
				paddingRight: ROW_PADDING_END,
				paddingBlock: 3,
				textAlign: 'left',
				...(own.glassSelection === true
					? // The material's border on macOS 27 is reserved on every row, selected or not, so selecting does not nudge the content by its width.
						{
							borderWidth: 1,
							borderStyle: 'solid',
							borderColor: 'transparent',
						}
					: {}),
				...(isSelected() && own.glassSelection !== true
					? { backgroundColor: semanticColors.surfaceListSelection }
					: {}),
				// A stacking context, so the glass at zIndex -1 sits under the row's content and not under the page.
				...(glassSelected() ? { zIndex: 0 } : {}),
				...own.style,
			}}
		>
			<Show when={glassSelected()}>
				<NativeGlass
					aria-hidden
					radius={ROW_RADIUS}
					style={{
						position: 'absolute',
						zIndex: -1,
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
					}}
				/>
			</Show>
			{own.children}
			<Show when={separated()}>
				<div
					aria-hidden
					style={{
						position: 'absolute',
						left: SEPARATOR_INSET,
						right: SEPARATOR_INSET,
						bottom: 0,
						height: 1,
						backgroundColor: semanticColors.borderSeparator,
					}}
				/>
			</Show>
		</div>
	);
}

export interface ListItemContentProps extends HostAttributes {}

function ListItemContent(props: ListItemContentProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 2,
				flexGrow: 1,
				flexShrink: 1,
				flexBasis: 0,
				minWidth: 0,
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

export interface ListItemTitleProps extends Omit<HostAttributes, 'color'> {}

function ListItemTitle(props: ListItemTitleProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Text {...rest} as="h2" variant="regular" truncate style={own.style}>
			{own.children}
		</Text>
	);
}

export interface ListItemDescriptionProps
	extends Omit<HostAttributes, 'color'> {}

function ListItemDescription(props: ListItemDescriptionProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<Text
			{...rest}
			as="p"
			variant="small"
			color="secondary"
			style={{
				overflow: 'hidden',
				lineClamp: 2,
				minWidth: '50%',
				...own.style,
			}}
		>
			{own.children}
		</Text>
	);
}

export interface ListItemAccessoryProps extends HostAttributes {}

function ListItemAccessory(props: ListItemAccessoryProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div
			{...rest}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'flex-start',
				gap: 4,
				flexShrink: 0,
				color: semanticColors.textTertiary,
				fontSize: 11,
				...own.style,
			}}
		>
			{own.children}
		</div>
	);
}

export {
	ListItem as Item,
	ListItemAccessory as ItemAccessory,
	ListItemContent as ItemContent,
	ListItemDescription as ItemDescription,
	ListItemTitle as ItemTitle,
	ListRoot as Root,
};
