import { motion } from '@ghia/solid';
import {
	createPlacementState,
	POPUP_MARGIN,
} from 'base-ui-solid-gpuix/internals';
import { createSelectRoot } from 'base-ui-solid-gpuix/select';
import {
	createComputed,
	createContext,
	createEffect,
	createSignal,
	For,
	type JSX,
	on,
	children as resolveChildren,
	Show,
	splitProps,
	untrack,
	useContext,
} from 'solid-js';
import { isInvalid } from '#src/aria.ts';
import { NativeGlass } from '#src/components/native-glass.tsx';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import { Icon } from '#src/icons/icon.tsx';
import { PopupShadow, SHADOW_PAD } from '#src/popup.tsx';
import { over, withAlpha } from '#src/tokens/color-math.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';
import { typography } from '#src/tokens/typography.ts';

const ROW_HEIGHT = 28;
const POPUP_PADDING = 4;
const POPUP_MAX_HEIGHT = 300;
const ROW_PADDING = 8;
const CHECK_SLOT = 16;
const ROW_GAP = 6;
/** How far the row's label sits in from the popup's left edge. */
const LABEL_INSET = POPUP_PADDING + ROW_PADDING + CHECK_SLOT + ROW_GAP;
/** The popup's exit fade, then a buffer for a fade that never completes. */
const EXIT_MS = 160;
/** A pick holds the popup open this long so the check is seen land. */
const PICK_HOLD_MS = 100;
/** Gap between trigger and popup when no item is aligned over the trigger. */
const UNALIGNED_GAP = 4;

interface SelectOption {
	value: string;
	label: string;
	disabled: boolean;
	testId: string | undefined;
}

interface SelectContextValue {
	options: () => readonly SelectOption[];
	setOptions: (options: readonly SelectOption[]) => void;
	root: ReturnType<typeof createSelectRoot<string, SelectOption>>;
	disabled: () => boolean;
	highlighted: () => number | null;
	setHighlighted: (index: number | null) => void;
	/** What the trigger reports so the popup can line an item up with its label. */
	trigger: () => { height: number; labelInset: number };
	setTrigger: (metrics: { height: number; labelInset: number }) => void;
	/** How far the trigger extends past the box its row gives it. */
	setBleed: (bleed: number) => void;
	setMeasured: (measured: boolean) => void;
}

const SelectContext = createContext<SelectContextValue>();

function useSelectContext(): SelectContextValue {
	const context = useContext(SelectContext);
	if (context === undefined) {
		throw new Error('Select parts must be rendered inside a <Select>');
	}
	return context;
}

export interface SelectProps {
	/** Selected value (controlled). */
	value?: string;
	/** Initial value (uncontrolled). */
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Fires when the popup opens or closes. */
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
	children: JSX.Element;
}

/**
 * A select. Holds the value and the popup's state; its parts are
 * `SelectTrigger` (with a `SelectValue`) and `SelectContent` (with
 * `SelectItem`s). The popup is an in-window glass menu, not a system one.
 */
export function Select(props: SelectProps) {
	const [options, setOptions] = createSignal<readonly SelectOption[]>([]);
	const [highlighted, setHighlighted] = createSignal<number | null>(null);
	const [trigger, setTrigger] = createSignal({ height: 32, labelInset: 13 });
	const [bleed, setBleed] = createSignal(0);
	const [measured, setMeasured] = createSignal(false);
	const root = createSelectRoot<string, SelectOption>({
		items: options,
		value: () => props.value,
		defaultValue: props.defaultValue,
		onValueChange: (next) => props.onValueChange?.(next),
		disabled: () => props.disabled === true,
		required: () => undefined,
		invalid: () => false,
		labelledBy: () => undefined,
		label: () => undefined,
		exitMs: EXIT_MS,
		pickHoldMs: PICK_HOLD_MS,
		highlightedIndex: highlighted,
		onHighlightChange: (index) => setHighlighted(index),
		// Empty until the open popup has been painted: the primitive scrolls the selected row into view when the rects arrive, and an unpainted scroller cannot scroll.
		itemRects: () =>
			measured()
				? options().map((_, index) => ({
						top: POPUP_PADDING + index * ROW_HEIGHT,
						height: ROW_HEIGHT,
					}))
				: [],
		scrollPadding: POPUP_PADDING,
	});
	createEffect(
		on(root.presence.open, (open) => props.onOpenChange?.(open), {
			defer: true,
		}),
	);
	return (
		<SelectContext.Provider
			value={{
				options,
				setOptions,
				root,
				disabled: () => props.disabled === true,
				highlighted,
				setHighlighted,
				trigger,
				setTrigger,
				setBleed,
				setMeasured,
			}}
		>
			<div
				{...root.dismissProps}
				style={{
					display: 'flex',
					flexDirection: 'row',
					flexShrink: 0,
					// The popup is as wide as this box at least: it must be the trigger's width, not its parent's.
					width: 'fit-content',
					maxWidth: '100%',
					marginBlock: -bleed(),
				}}
			>
				{props.children}
			</div>
		</SelectContext.Provider>
	);
}

const triggerSizes = {
	small: { height: 28, paddingInline: 8, borderRadius: styleTokens.radius8 },
	medium: {
		height: 32,
		paddingInline: 12,
		borderRadius: styleTokens.radiusControl,
	},
	large: {
		height: 36,
		paddingInline: 12,
		borderRadius: styleTokens.radiusControl,
	},
} as const;

export type SelectTriggerVariant = 'default' | 'transparent' | 'glass';
export type SelectTriggerSize = keyof typeof triggerSizes;

export interface SelectTriggerProps extends HostAttributes {
	/** Visual style. */
	variant?: SelectTriggerVariant;
	/** Trigger height (28 / 32 / 36px). */
	size?: SelectTriggerSize;
}

/** The button that opens the popup. Always renders a chevron indicator. */
export function SelectTrigger(props: SelectTriggerProps) {
	const context = useSelectContext();
	const [own, rest] = splitProps(props, [
		'variant',
		'size',
		'style',
		'children',
		'ref',
	]);
	const variant = () => own.variant ?? 'default';
	const size = () => triggerSizes[own.size ?? 'medium'];
	const bordered = () => variant() === 'default';
	createComputed(() => {
		context.setTrigger({
			height: size().height,
			labelInset: size().paddingInline + (bordered() ? 1 : 0),
		});
		context.setBleed(variant() === 'transparent' ? 8 : 0);
	});
	const hoverFill = () =>
		variant() === 'glass'
			? over(semanticColors.surfaceControlSubtle, glass.tint)
			: semanticColors.surfaceControlSubtle;
	return (
		<div
			{...rest}
			{...context.root.triggerProps}
			ref={(element) => {
				context.root.triggerRef(element);
				own.ref?.(element);
			}}
			formControl={context.disabled() ? 'disabled' : 'enabled'}
			style={{
				display: 'flex',
				flexDirection: 'row',
				width: 'fit-content',
				maxWidth: '100%',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 8,
				overflow: 'hidden',
				whiteSpace: 'nowrap',
				...typography.variants.regular,
				color: semanticColors.textPrimary,
				cursor: 'default',
				keyboardFocusDim: false,
				...size(),
				...(variant() === 'default'
					? {
							borderWidth: 1,
							borderStyle: 'solid',
							borderColor: semanticColors.borderField,
							hover: { borderColor: colors.fg40 },
						}
					: {}),
				...(variant() === 'glass' ? glass.material() : {}),
				...(variant() === 'glass' || variant() === 'transparent'
					? { hover: { backgroundColor: hoverFill() } }
					: {}),
				focusVisible: {
					outline: `2px solid ${colors.fg20}`,
					...(variant() === 'default' ? { borderColor: colors.fg40 } : {}),
				},
				...(isInvalid(rest['aria-invalid'])
					? { outline: `1px solid ${colors.red}` }
					: {}),
				...(context.disabled()
					? { pointerEvents: 'none', opacity: 0.5, cursor: 'not-allowed' }
					: {}),
				...own.style,
			}}
		>
			{own.children}
			<Show
				when={variant() === 'transparent'}
				fallback={
					<Icon
						name="chevrons-up-down"
						size={16}
						style={{ color: semanticColors.textQuaternary }}
					/>
				}
			>
				<div
					style={{
						display: 'flex',
						flexShrink: 0,
						alignItems: 'center',
						justifyContent: 'center',
						width: 16,
						height: 16,
						borderRadius: styleTokens.radiusPill,
						backgroundColor: semanticColors.surfaceControl,
						color: semanticColors.textPrimary,
					}}
				>
					<Icon name="chevrons-up-down" size={12} />
				</div>
			</Show>
		</div>
	);
}

export interface SelectValueProps extends Omit<HostAttributes, 'children'> {
	placeholder?: string;
}

/** The selected item's label, or the placeholder. */
export function SelectValue(props: SelectValueProps) {
	const context = useSelectContext();
	const [own, rest] = splitProps(props, ['placeholder', 'style']);
	const selected = () =>
		context.options().find((option) => option.value === context.root.value());
	return (
		<text
			{...rest}
			style={{
				minWidth: 0,
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap',
				...(selected() === undefined
					? { color: semanticColors.textPlaceholder }
					: {}),
				...own.style,
			}}
		>
			{selected() === undefined ? own.placeholder : selected()?.label}
		</text>
	);
}

/**
 * What `SelectItem` returns instead of an element: `SelectContent` reads the
 * options off its resolved children, as syne's reads them off its React
 * children, so `SelectValue` knows a label while the popup is closed.
 */
class SelectItemMarker {
	constructor(
		readonly value: () => string,
		readonly label: () => string,
		readonly disabled: () => boolean,
		readonly testId: () => string | undefined,
	) {}
}

function readLabel(children: JSX.Element): string {
	if (typeof children === 'string') return children;
	if (typeof children === 'number') return String(children);
	if (Array.isArray(children)) return children.map(readLabel).join('');
	throw new Error('A SelectItem must have text children');
}

export interface SelectItemProps {
	value: string;
	disabled?: boolean;
	/** Locator id of the item's row in the popup. */
	testId?: string;
	/** The item's label: text, which is also what `SelectValue` shows. */
	children: JSX.Element;
}

/** One option. Renders nothing itself: `SelectContent` draws the rows. */
export function SelectItem(props: SelectItemProps): JSX.Element {
	return new SelectItemMarker(
		() => props.value,
		() => readLabel(props.children),
		() => props.disabled === true,
		() => props.testId,
	) as unknown as JSX.Element;
}

const unaligned = {
	aligned: false,
	gap: UNALIGNED_GAP - SHADOW_PAD,
	offset: { x: -SHADOW_PAD, y: 0 },
};

export interface SelectContentProps {
	children: JSX.Element;
}

/**
 * The popup: a glass surface opening over the trigger with the selected
 * item's label lined up with the trigger's. With nothing selected, or more
 * items than fit, it opens just below the trigger instead.
 */
export function SelectContent(props: SelectContentProps) {
	const context = useSelectContext();
	const root = context.root;
	const resolved = resolveChildren(() => props.children);
	createComputed(() => {
		context.setOptions(
			resolved
				.toArray()
				.filter(
					(node): node is SelectItemMarker => node instanceof SelectItemMarker,
				)
				.map((item) => ({
					value: item.value(),
					label: item.label(),
					disabled: item.disabled(),
					testId: item.testId(),
				})),
		);
	});

	const placement = createPlacementState('bottom');
	const [anchorWidth, setAnchorWidth] = createSignal(0);
	const contentHeight = () =>
		context.options().length * ROW_HEIGHT + POPUP_PADDING * 2;
	/** Fixed for the whole open: the selection changing as a pick closes the popup must not move it. */
	const [anchor, setAnchor] = createSignal(unaligned);
	createComputed(
		on(root.presence.open, (open) => {
			if (!open) return;
			untrack(() => {
				const index = root.selectedIndex();
				const trigger = context.trigger();
				if (index === -1 || contentHeight() > POPUP_MAX_HEIGHT) {
					setAnchor(unaligned);
					return;
				}
				setAnchor({
					aligned: true,
					gap: 0,
					offset: {
						x: trigger.labelInset - LABEL_INSET - SHADOW_PAD,
						y:
							-(
								trigger.height / 2 +
								POPUP_PADDING +
								index * ROW_HEIGHT +
								ROW_HEIGHT / 2
							) - SHADOW_PAD,
					},
				});
			});
		}),
	);
	const maxHeight = () => placement.maxHeight(POPUP_MAX_HEIGHT);
	createEffect(() => {
		if (!root.presence.mounted()) context.setMeasured(false);
	});

	return (
		<Show when={root.presence.mounted()}>
			<anchored
				side="bottom"
				align="start"
				gap={anchor().gap}
				offset={anchor().offset}
				fit={anchor().aligned ? 'snap' : 'flip'}
				snapMargin={POPUP_MARGIN}
				onPlacement={(event) => {
					placement.onPlacement(event);
					setAnchorWidth(event.anchorWidth);
				}}
				deferred
				priority={1}
				style={{
					backgroundColor: 'transparent',
					padding: SHADOW_PAD,
					pointerEvents: 'none',
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
						// Shifted left to line the labels up, the popup still reaches the trigger's right edge.
						minWidth: anchor().aligned
							? anchorWidth() - (anchor().offset.x + SHADOW_PAD)
							: 'anchor-size(width)',
						maxWidth: '100%',
						maxHeight: maxHeight(),
					}}
				>
					<PopupShadow />
					<NativeGlass
						radius={styleTokens.radiusPopover}
						fallback={glass.tinted(
							withAlpha(semanticColors.surfacePopover, 0.7),
						)}
						style={{
							display: 'flex',
							flexDirection: 'column',
							outline: `1px solid ${semanticColors.borderSecondary}`,
							maxHeight: maxHeight(),
						}}
					>
						<div
							{...root.popupProps}
							ref={root.popupRef}
							onLayout={() => context.setMeasured(true)}
							style={{
								display: 'flex',
								flexDirection: 'column',
								overflowY: 'scroll',
								padding: POPUP_PADDING,
								keyboardFocusDim: false,
								maxHeight: maxHeight(),
							}}
						>
							<For each={context.options()}>
								{(option, index) => (
									<SelectRow option={option} index={index()} />
								)}
							</For>
						</div>
					</NativeGlass>
				</motion.div>
			</anchored>
		</Show>
	);
}

function SelectRow(props: { option: SelectOption; index: number }) {
	const context = useSelectContext();
	const root = context.root;
	const itemProps = () => root.itemProps(props.option, props.index);
	const lit = () => context.highlighted() === props.index;
	const checked = () => root.value() === props.option.value;
	return (
		<div
			// Explicit, not `{...itemProps()}`: a spread applies late, so the row would become focusable (tabIndex) only after the open's `focus()`.
			testId={props.option.testId}
			id={itemProps().id}
			role={itemProps().role}
			tabIndex={itemProps().tabIndex}
			aria-selected={itemProps()['aria-selected']}
			aria-disabled={itemProps()['aria-disabled']}
			onFocus={() => {
				// A press on a disabled row still focuses it; it must not take the highlight.
				if (!props.option.disabled) itemProps().onFocus();
			}}
			onMouseDown={itemProps().onMouseDown}
			onMouseUp={itemProps().onMouseUp}
			onClick={itemProps().onClick}
			onMouseMove={(event) => {
				if (props.option.disabled) return;
				context.setHighlighted(props.index);
				root.onListMouseMove(event);
			}}
			onMouseLeave={() => {
				if (context.highlighted() === props.index) context.setHighlighted(null);
			}}
			ref={(element) => root.itemRef(props.index, element)}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				gap: ROW_GAP,
				height: ROW_HEIGHT,
				paddingInline: ROW_PADDING,
				borderRadius: styleTokens.radius8,
				cursor: 'default',
				keyboardFocusDim: false,
				backgroundColor: lit()
					? semanticColors.surfaceControlSubtle
					: 'transparent',
				...(props.option.disabled ? { opacity: 0.5 } : {}),
			}}
		>
			<div
				style={{
					display: 'flex',
					flexShrink: 0,
					alignItems: 'center',
					justifyContent: 'center',
					width: CHECK_SLOT,
					height: CHECK_SLOT,
					color: semanticColors.textPrimary,
				}}
			>
				<Show when={checked()}>
					<Icon name="check" size={14} strokeWidth={2.5} />
				</Show>
			</div>
			<text
				style={{
					...typography.variants.strong,
					whiteSpace: 'nowrap',
					color: lit()
						? semanticColors.textPrimary
						: semanticColors.textSecondary,
				}}
			>
				{props.option.label}
			</text>
		</div>
	);
}
