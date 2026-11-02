import type { HostElement, StyleDesc } from '@ghia/solid';
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
	mergeProps,
	on,
	children as resolveChildren,
	Show,
	splitProps,
	untrack,
	useContext,
} from 'solid-js';
import { isInvalid } from '#src/aria.ts';
import { useFieldDisabled } from '#src/components/field-disabled-context.ts';
import { NativeGlass } from '#src/components/native-glass.tsx';
import { glass } from '#src/glass.ts';
import type { HostAttributes } from '#src/host-props.ts';
import { Icon } from '#src/icons/icon.tsx';
import { SHADOW_PAD } from '#src/popup.tsx';
import { withAlpha } from '#src/tokens/color-math.ts';
import { colors } from '#src/tokens/colors.ts';
import { litRow } from '#src/tokens/lit-row.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';
import { typography } from '#src/tokens/typography.ts';

/** An NSMenu row, as drawn by macOS 26: 24pt tall, rows touching, inset 5pt from the panel's sides and 4pt from its top and bottom. */
const ROW_HEIGHT = 24;
const POPUP_PADDING_BLOCK = 4;
const POPUP_PADDING_INLINE = 5;
const POPUP_MAX_HEIGHT = 300;
const ROW_PADDING = 8;
const CHECK_SLOT = 10;
const ROW_GAP = 6;
/** Concentric with the popup's 12pt corner, 5pt in. */
const ROW_RADIUS = 7;
/** How far the row's label sits in from the popup's left edge. */
const LABEL_INSET = POPUP_PADDING_INLINE + ROW_PADDING + CHECK_SLOT + ROW_GAP;
/** The popup leaves at once, as it appears. */
const EXIT_MS = 0;
/** What the window leaves a popup: its margin and the layer's shadow padding on both ends. */
const ALIGNED_MAX_HEIGHT = `calc(100vh - ${(POPUP_MARGIN + SHADOW_PAD) * 2}px)`;
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
	const fieldDisabled = useFieldDisabled();
	const disabled = () => props.disabled === true || fieldDisabled();
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
		disabled,
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
						top: POPUP_PADDING_BLOCK + index * ROW_HEIGHT,
						height: ROW_HEIGHT,
					}))
				: [],
		scrollPadding: POPUP_PADDING_BLOCK,
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
				disabled,
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

/**
 * SwiftUI's `.controlSize` on a `Picker` on macOS 26, measured from the
 * reference app, the same boxes as `Button`'s: `small`/`medium`/`large` are
 * `.small`/`.regular`/`.large`. `chevron` is the up/down glyph's svg size and
 * stroke, `chevronInset` the gap from its ink to the trigger's right edge, and
 * `gap` the space between the widest label and the glyph, fitted to the
 * reference's trigger widths.
 */
const triggerSizes = {
	small: {
		height: 20,
		paddingInline: 10,
		borderRadius: 5,
		fontSize: 11,
		lineHeight: 14,
		gap: 12.5,
		chevron: { size: 12, strokeWidth: 2.2 },
		chevronInset: 8.5,
	},
	medium: {
		height: 24,
		paddingInline: 12,
		borderRadius: 6,
		fontSize: 13,
		lineHeight: 16,
		gap: 15,
		chevron: { size: 14, strokeWidth: 2.5 },
		chevronInset: 10,
	},
	large: {
		height: 28,
		paddingInline: 14,
		borderRadius: 14,
		fontSize: 13,
		lineHeight: 16,
		gap: 18,
		chevron: { size: 17, strokeWidth: 2.8 },
		chevronInset: 10.5,
	},
} as const;

/** A transparent trigger's label sits this close to its round chevron button, as before the retune: SwiftUI draws no distinct one to measure. */
const TRANSPARENT_GAP = 8;

/** The chevron pair's ink width: its path spans 10 of the svg's 24 units, plus the stroke. */
function inkWidth(size: (typeof triggerSizes)[keyof typeof triggerSizes]) {
	return ((10 + size.chevron.strokeWidth) * size.chevron.size) / 24;
}

export type SelectTriggerVariant = 'default' | 'transparent' | 'glass';
export type SelectTriggerSize = keyof typeof triggerSizes;

export interface SelectTriggerProps extends HostAttributes {
	/** Visual style. */
	variant?: SelectTriggerVariant;
	/** Control size: 20 / 24 / 28pt tall, as SwiftUI's `.small` / `.regular` / `.large`. */
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
	createComputed(() => {
		context.setTrigger({
			height: size().height,
			labelInset: size().paddingInline,
		});
		context.setBleed(variant() === 'transparent' ? 8 : 0);
	});
	const shared = mergeProps(rest, context.root.triggerProps, {
		ref: (element: HostElement) => {
			context.root.triggerRef(element);
			own.ref?.(element);
		},
		get formControl() {
			return context.disabled() ? ('disabled' as const) : ('enabled' as const);
		},
	});
	const [hovered, setHovered] = createSignal(false);
	const isGlass = () => variant() === 'glass';
	const style = (): StyleDesc => ({
		display: 'flex',
		flexDirection: 'row',
		width: 'fit-content',
		maxWidth: '100%',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: variant() === 'transparent' ? TRANSPARENT_GAP : size().gap,
		// Clipping would cut the glass's own shadow and edge highlight.
		...(isGlass() ? {} : { overflow: 'hidden' }),
		whiteSpace: 'nowrap',
		fontSize: size().fontSize,
		fontWeight: 400,
		lineHeight: `${size().lineHeight}px`,
		color: semanticColors.textPrimary,
		cursor: 'default',
		keyboardFocusDim: false,
		height: size().height,
		paddingInline: size().paddingInline,
		borderRadius: size().borderRadius,
		...(variant() === 'default'
			? { backgroundColor: semanticColors.surfaceBordered }
			: {}),
		...(variant() === 'transparent'
			? { hover: { backgroundColor: semanticColors.surfaceControlSubtle } }
			: {}),
		focusVisible: { outline: `2px solid ${colors.fg20}` },
		...(isInvalid(rest['aria-invalid'])
			? { outline: `1px solid ${colors.red}` }
			: {}),
		// A glass trigger dims its content instead: opacity on the glass itself would draw the label under the glass.
		...(context.disabled()
			? {
					pointerEvents: 'none',
					cursor: 'not-allowed',
					...(isGlass() ? {} : { opacity: 0.5 }),
				}
			: {}),
		...own.style,
	});
	// The glyph's ink sits in the middle of its svg box: pull the box out so the ink is `chevronInset` from the edge.
	const chevronMargin = () =>
		size().chevronInset -
		size().paddingInline -
		(size().chevron.size - inkWidth(size())) / 2;
	const content = () => (
		<>
			{own.children}
			<Show
				when={variant() === 'transparent'}
				fallback={
					<Icon
						name="chevrons-up-down"
						size={size().chevron.size}
						strokeWidth={size().chevron.strokeWidth}
						style={{
							color: semanticColors.textPrimary,
							marginRight: chevronMargin(),
						}}
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
		</>
	);
	return (
		<Show
			when={isGlass()}
			fallback={
				<div {...shared} style={style()}>
					{content()}
				</div>
			}
		>
			<NativeGlass
				{...shared}
				radius={size().borderRadius}
				tint={hovered() ? semanticColors.surfaceControlSubtle : undefined}
				style={style()}
				onMouseEnter={(event) => {
					setHovered(true);
					rest.onMouseEnter?.(event);
				}}
				onMouseLeave={(event) => {
					setHovered(false);
					rest.onMouseLeave?.(event);
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						flexGrow: 1,
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: size().gap,
						...(context.disabled() ? { opacity: 0.5 } : {}),
					}}
				>
					{content()}
				</div>
			</NativeGlass>
		</Show>
	);
}

export interface SelectValueProps extends Omit<HostAttributes, 'children'> {
	placeholder?: string;
}

/**
 * The selected item's label, or the placeholder. Like a SwiftUI `Picker`, the
 * trigger is as wide as its widest label, so it does not resize with the value.
 */
export function SelectValue(props: SelectValueProps) {
	const context = useSelectContext();
	const [own, rest] = splitProps(props, ['placeholder', 'style']);
	const selected = () =>
		context.options().find((option) => option.value === context.root.value());
	const labels = () => [
		...(own.placeholder === undefined ? [] : [own.placeholder]),
		...context.options().map((option) => option.label),
	];
	return (
		<div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
			<div aria-hidden style={{ height: 0, overflow: 'hidden' }}>
				<For each={labels()}>
					{(label) => <text style={{ whiteSpace: 'nowrap' }}>{label}</text>}
				</For>
			</div>
		</div>
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
		context.options().length * ROW_HEIGHT + POPUP_PADDING_BLOCK * 2;
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
								POPUP_PADDING_BLOCK +
								index * ROW_HEIGHT +
								ROW_HEIGHT / 2
							) - SHADOW_PAD,
					},
				});
			});
		}),
	);
	/**
	 * `onPlacement` reports the room on one side of the trigger, measured to
	 * the layer's edge, which holds the shadow's padding on both sides. An
	 * aligned popup reaches above the trigger too and the layer slides to stay
	 * inside the window (its list is never over `POPUP_MAX_HEIGHT`), so the
	 * room below the trigger says nothing about it: the window is its limit.
	 */
	const maxHeight = () =>
		anchor().aligned
			? ALIGNED_MAX_HEIGHT
			: placement.maxHeight(POPUP_MAX_HEIGHT + SHADOW_PAD * 2) - SHADOW_PAD * 2;
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
				<div
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
					<NativeGlass
						radius={styleTokens.radiusPopover}
						shadow={styleTokens.shadowGlassPopover}
						fallback={{
							...glass.tinted(withAlpha(semanticColors.surfacePopover, 0.7)),
							outline: `1px solid ${semanticColors.borderSecondary}`,
						}}
						style={{
							display: 'flex',
							flexDirection: 'column',
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
								borderRadius: styleTokens.radiusPopover,
								paddingBlock: POPUP_PADDING_BLOCK,
								paddingInline: POPUP_PADDING_INLINE,
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
				</div>
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
				borderRadius: ROW_RADIUS,
				cursor: 'default',
				keyboardFocusDim: false,
				backgroundColor: litRow.fill(lit()),
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
					color: litRow.ink(lit(), semanticColors.textPrimary),
				}}
			>
				<Show when={checked()}>
					<Icon name="check" size={14} strokeWidth={3} />
				</Show>
			</div>
			<text
				style={{
					...typography.variants.regular,
					whiteSpace: 'nowrap',
					color: litRow.ink(lit(), semanticColors.textPrimary),
				}}
			>
				{props.option.label}
			</text>
		</div>
	);
}
