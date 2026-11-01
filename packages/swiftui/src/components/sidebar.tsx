import type { HostElement, KeyEvent } from '@ghia/solid';
import { buttonProps, useGpuixRequired } from '@ghia/solid';
import {
	createContext,
	type JSX,
	children as resolveChildren,
	Show,
	splitProps,
	useContext,
} from 'solid-js';
import { ButtonDefaultsProvider } from '#src/components/button-defaults-context.tsx';
import { ProgressiveBlur } from '#src/components/progressive-blur.tsx';
import { ScrollArea } from '#src/components/scroll-area.tsx';
import { useScrollAreaContext } from '#src/components/scroll-area-context.ts';
import { SidebarContext } from '#src/components/sidebar-context.ts';
import { Text } from '#src/components/text.tsx';
import { Toolbar, ToolbarRow } from '#src/components/toolbar.tsx';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import { IconSizeContext } from '#src/icons/icon-size.ts';
import { hasNodes } from '#src/resolved.ts';
import { createRevealOnSelect } from '#src/reveal.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

const SIDEBAR_INSET = 10;
const ICON_SIZE = 16;

export interface SidebarProps extends HostAttributes {
	/** Escape hatch: pass a fully custom Toolbar. Overrides `actions`. */
	toolbar?: JSX.Element;
	footer?: JSX.Element;
	scrollEnabled?: boolean;
	/** Action buttons for the sidebar toolbar. Auto-styled with `variant="glass" size="large"`. */
	actions?: JSX.Element;
}

/** The toolbar a sidebar gets from `actions`: a 52px row (the flush layout's 16px of top padding and a 36px row), actions on the trailing edge. */
function DefaultToolbar(props: { actions?: JSX.Element }) {
	return (
		<Toolbar style={{ paddingTop: 16 }}>
			<ToolbarRow style={{ justifyContent: 'flex-end' }}>
				<ButtonDefaultsProvider value={{ variant: 'glass', size: 'large' }}>
					{props.actions}
				</ButtonDefaultsProvider>
			</ToolbarRow>
		</Toolbar>
	);
}

/**
 * Leftmost navigation column of a `SplitView` app shell: an icon and title
 * list of destinations, typically with a footer settings row. A flat,
 * non-searchable nav list: no collapsible sections, no search row.
 *
 * The macOS 27 layout only: the column is flush. No inset and no radius: a
 * full-bleed glass layer paints the whole aside and the content sits above it.
 */
export function Sidebar(props: SidebarProps) {
	const [own, rest] = splitProps(props, [
		'toolbar',
		'footer',
		'scrollEnabled',
		'actions',
		'style',
		'children',
	]);
	return (
		<SidebarContext.Provider value={true}>
			<div
				{...rest}
				style={{
					position: 'relative',
					height: '100%',
					width: '100%',
					flexShrink: 0,
					overflow: 'hidden',
					...own.style,
				}}
			>
				<div
					aria-hidden
					style={{
						position: 'absolute',
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
						...glass.material(),
					}}
				/>
				<div
					style={{
						position: 'relative',
						height: '100%',
						width: '100%',
						overflow: 'hidden',
					}}
				>
					<Show when={own.scrollEnabled !== false} fallback={own.children}>
						<ScrollArea
							toolbar={own.toolbar ?? <DefaultToolbar actions={own.actions} />}
							footer={own.footer}
						>
							{own.children}
						</ScrollArea>
					</Show>
				</div>
			</div>
		</SidebarContext.Provider>
	);
}

interface SidebarListContextValue<T> {
	selectedItem: () => T | null | undefined;
	onItemSelect: () => ((item: T) => void) | undefined;
	getItemKey: () => (item: T) => string;
	isSelectionEnabled: () => boolean;
}

// biome-ignore lint/suspicious/noExplicitAny: the context is generic-agnostic; items narrow it with their own T
const SidebarListContext = createContext<SidebarListContextValue<any>>();

export interface SidebarListProps<T> extends HostAttributes {
	items?: T[];
	selectedItem?: T | null;
	onSelectedItemChange?: (item: T) => void;
	getItemKey?: (item: T) => string;
	/** Shown in place of the list while `items` is empty. */
	emptyState?: JSX.Element;
}

export function SidebarList<T>(props: SidebarListProps<T>) {
	const [own, rest] = splitProps(props, [
		'items',
		'selectedItem',
		'onSelectedItemChange',
		'getItemKey',
		'emptyState',
		'style',
		'children',
	]);
	const isSelectionEnabled = () =>
		own.selectedItem !== undefined && own.onSelectedItemChange !== undefined;

	const handleKeyDown = (event: KeyEvent) => {
		const items = own.items;
		const getItemKey = own.getItemKey;
		const select = own.onSelectedItemChange;
		if (
			items === undefined ||
			getItemKey === undefined ||
			select === undefined ||
			!isSelectionEnabled() ||
			items.length === 0
		) {
			return;
		}
		const selected = own.selectedItem;
		const currentIndex =
			selected === null || selected === undefined
				? -1
				: items.findIndex((item) => getItemKey(item) === getItemKey(selected));
		switch (event.key) {
			case 'ArrowDown': {
				event.preventDefault();
				const next = items[currentIndex + 1];
				if (currentIndex < items.length - 1 && next !== undefined) select(next);
				break;
			}
			case 'ArrowUp': {
				event.preventDefault();
				const previous = items[currentIndex - 1];
				if (currentIndex > 0 && previous !== undefined) select(previous);
				break;
			}
			case 'Home': {
				event.preventDefault();
				const first = items[0];
				if (first !== undefined) select(first);
				break;
			}
			case 'End': {
				event.preventDefault();
				const last = items[items.length - 1];
				if (last !== undefined) select(last);
				break;
			}
		}
	};

	const isEmpty = () => own.items?.length === 0 && 'emptyState' in props;

	return (
		<Show when={!isEmpty()} fallback={own.emptyState}>
			<SidebarListContext.Provider
				value={{
					selectedItem: () => own.selectedItem,
					onItemSelect: () => own.onSelectedItemChange,
					getItemKey: () => {
						const getItemKey = own.getItemKey;
						return getItemKey === undefined ? () => '' : getItemKey;
					},
					isSelectionEnabled,
				}}
			>
				<div
					{...rest}
					role={isSelectionEnabled() ? 'listbox' : undefined}
					tabIndex={isSelectionEnabled() ? 0 : undefined}
					onKeyDown={isSelectionEnabled() ? handleKeyDown : undefined}
					style={{
						display: 'flex',
						flexDirection: 'column',
						paddingBottom: 8,
						paddingInline: SIDEBAR_INSET,
						keyboardFocusDim: false,
						...own.style,
					}}
				>
					{own.children}
				</div>
			</SidebarListContext.Provider>
		</Show>
	);
}

export interface SidebarListItemProps<T>
	extends Omit<HostAttributes, 'onClick' | 'title'> {
	onClick?: () => void;
	/** Explicit selection state. Overridden by context when `item` is provided. */
	selected?: boolean;
	/** The data item this row represents. Used with `SidebarList`'s managed selection. */
	item?: T;
	/** Leading icon, 16px. */
	icon?: JSX.Element;
	/** Row label. Its presence switches the row to props mode. */
	title?: JSX.Element;
	subtitle?: JSX.Element;
	/** Trailing content. Strings and numbers are wrapped in the muted accessory styling. */
	accessory?: JSX.Element;
	disabled?: boolean;
}

export function SidebarListItem<T>(props: SidebarListItemProps<T>) {
	const [own, rest] = splitProps(props, [
		'onClick',
		'selected',
		'item',
		'icon',
		'title',
		'subtitle',
		'accessory',
		'disabled',
		'style',
		'children',
		'ref',
	]);
	const context = useContext(SidebarListContext) as
		| SidebarListContextValue<T>
		| undefined;
	const renderer = useGpuixRequired();
	const scroll = useScrollAreaContext();
	let row: HostElement | undefined;

	// Resolved once each: a prop read twice would build its elements twice.
	const icon = resolveChildren(() => own.icon);
	const title = resolveChildren(() => own.title);
	const subtitle = resolveChildren(() => own.subtitle);
	const accessory = resolveChildren(() => own.accessory);
	const has = hasNodes;
	const usePropsMode = () => has(title);

	const isContextManaged = () =>
		context?.isSelectionEnabled() === true && own.item !== undefined;
	const isSelected = () => {
		if (!isContextManaged() || context === undefined) return own.selected;
		const selected = context.selectedItem();
		const getItemKey = context.getItemKey();
		return (
			selected !== null &&
			selected !== undefined &&
			getItemKey(selected) === getItemKey(own.item as T)
		);
	};

	createRevealOnSelect({
		scroll,
		row: () => row,
		selected: () => isContextManaged() && isSelected() === true,
	});

	const activate = () => {
		if (own.disabled === true) return;
		const select = context?.onItemSelect();
		if (isContextManaged() && select !== undefined && own.item !== undefined) {
			select(own.item);
		}
		own.onClick?.();
	};

	return (
		<div
			{...rest}
			{...buttonProps(
				{
					get disabled() {
						return own.disabled;
					},
					// A mouse press selects on the way down, as syne's row does; this runs for a key (Enter, Space), whose click no pointer made.
					onClick: (event) => {
						if (event.pointerType === '') activate();
					},
				},
				renderer,
			)}
			ref={(element) => {
				row = element;
				own.ref?.(element);
			}}
			role={isContextManaged() ? 'option' : 'button'}
			aria-selected={isContextManaged() ? isSelected() === true : undefined}
			onMouseDown={(event) => {
				if (event.button !== 0) return;
				event.preventDefault();
				activate();
			}}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				width: '100%',
				minWidth: 0,
				minHeight: 32,
				paddingInline: 8,
				paddingBlock: 4,
				borderRadius: styleTokens.radius8,
				textAlign: 'left',
				color: semanticColors.textPrimary,
				cursor: 'default',
				keyboardFocusDim: false,
				focusVisible: {
					boxShadow: `0 0 0 1px ${semanticColors.borderPrimary}`,
				},
				...(isSelected() === true
					? { backgroundColor: semanticColors.surfaceListSelection }
					: {}),
				...(own.disabled === true
					? { pointerEvents: 'none', opacity: 0.5 }
					: {}),
				...own.style,
			}}
		>
			<Show when={usePropsMode()} fallback={own.children}>
				<Show when={has(icon)}>
					<span
						style={{
							display: 'flex',
							flexShrink: 0,
							alignItems: 'center',
							width: ICON_SIZE,
							height: ICON_SIZE,
						}}
					>
						<IconSizeContext.Provider value={() => ICON_SIZE}>
							{icon()}
						</IconSizeContext.Provider>
					</span>
				</Show>
				<Show
					when={has(subtitle)}
					fallback={
						<Text
							variant="regular"
							color="inherit"
							truncate
							style={{ minWidth: 0, flexGrow: 1 }}
						>
							{title()}
						</Text>
					}
				>
					<span
						style={{
							display: 'flex',
							flexDirection: 'column',
							minWidth: 0,
							flexGrow: 1,
							gap: 1,
						}}
					>
						<Text variant="regular" color="inherit" truncate>
							{title()}
						</Text>
						<Text
							variant="small"
							truncate
							style={{ color: semanticColors.textTertiary }}
						>
							{subtitle()}
						</Text>
					</span>
				</Show>
				<Show when={has(accessory)}>
					<Show
						when={
							typeof accessory() === 'string' || typeof accessory() === 'number'
						}
						fallback={accessory()}
					>
						<span
							style={{
								marginLeft: 'auto',
								flexShrink: 0,
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								gap: 4,
								color: semanticColors.textTertiary,
								fontSize: 11,
							}}
						>
							{accessory()}
						</span>
					</Show>
				</Show>
			</Show>
		</div>
	);
}

export interface SidebarFooterProps extends HostAttributes {}

/** The footer slot's content: blurs what scrolls under it, with the flush layout's 10px inset. */
export function SidebarFooter(props: SidebarFooterProps) {
	const [own, rest] = splitProps(props, ['style', 'children']);
	return (
		<div {...rest} style={{ position: 'relative', ...own.style }}>
			<ProgressiveBlur position="bottom" height="100%" />
			<div
				style={{
					position: 'relative',
					zIndex: 10,
					paddingInline: SIDEBAR_INSET,
					paddingBottom: SIDEBAR_INSET,
				}}
			>
				{own.children}
			</div>
		</div>
	);
}
