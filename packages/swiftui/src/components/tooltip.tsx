import type { StyleDesc } from '@ghia/solid';
import { DismissableLayer, motion } from '@ghia/solid';
import {
	createPlacementState,
	POPUP_MARGIN,
} from 'base-ui-solid-gpuix/internals';
import {
	createTooltipPopup,
	createTooltipProvider,
	createTooltipRoot,
	createTooltipTrigger,
	TooltipProviderContext,
	useTooltipProvider,
} from 'base-ui-solid-gpuix/tooltip';
import {
	type Accessor,
	createComputed,
	createContext,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from 'solid-js';
import { PopupShadow, SHADOW_PAD } from '#src/popup.tsx';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';
import { typography } from '#src/tokens/typography.ts';

/** Base UI's `Tooltip.Provider` defaults. */
const DEFAULT_DELAY = 600;
const SKIP_DELAY = 400;
const SIDE_OFFSET = 8;
/** The popup's fade, then a buffer for a fade that never completes. */
const EXIT_MS = 200;

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface ProviderDefaults {
	closeDelay: () => number;
}

const ProviderDefaultsContext = createContext<ProviderDefaults>();

export interface TooltipProviderProps {
	children?: JSX.Element;
	/** How long the pointer rests on a trigger before its tooltip opens, in ms. */
	delay?: number;
	/** How long a tooltip stays open after the pointer leaves, in ms. */
	closeDelay?: number;
}

/** Wraps the app once at the root: shares a hover/instant-open grace period across tooltips. */
export function TooltipProvider(props: TooltipProviderProps) {
	const group = createTooltipProvider({
		delay: () => props.delay ?? DEFAULT_DELAY,
		skipDelay: () => SKIP_DELAY,
	});
	return (
		<TooltipProviderContext.Provider value={group}>
			<ProviderDefaultsContext.Provider
				value={{ closeDelay: () => props.closeDelay ?? 0 }}
			>
				{props.children}
			</ProviderDefaultsContext.Provider>
		</TooltipProviderContext.Provider>
	);
}

interface TooltipContextValue {
	setOverrides: (overrides: { delay?: number; closeDelay?: number }) => void;
	trigger: ReturnType<typeof createTooltipTrigger>;
	popup: ReturnType<typeof createTooltipPopup>;
	root: ReturnType<typeof createTooltipRoot>;
	placement: ReturnType<typeof createPlacementState>;
}

const TooltipContext = createContext<TooltipContextValue>();

function useTooltipContext(): TooltipContextValue {
	const context = useContext(TooltipContext);
	if (context === undefined) {
		throw new Error('Tooltip parts must be rendered inside a <Tooltip>');
	}
	return context;
}

export interface TooltipProps {
	children?: JSX.Element;
	/** Controlled open state. `true` forces open, `false` forces closed; omit for hover and focus. */
	open?: boolean;
}

/**
 * Holds one tooltip's state. Renders a wrapper `div` round its parts: the
 * trigger's hover, press and focus bubble up to it, and the popup is anchored
 * inside it.
 */
export function Tooltip(props: TooltipProps) {
	const ambient = useTooltipProvider();
	const defaults = useContext(ProviderDefaultsContext);
	const group =
		ambient ??
		createTooltipProvider({
			delay: () => DEFAULT_DELAY,
			skipDelay: () => SKIP_DELAY,
		});
	const [overrides, setOverrides] = createSignal<{
		delay?: number;
		closeDelay?: number;
	}>({});
	const placement = createPlacementState('top');
	const root = createTooltipRoot(
		{
			get delayDuration() {
				return overrides().delay;
			},
			get open() {
				return props.open;
			},
		},
		{ group, exitMs: EXIT_MS },
	);

	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(closeTimer));
	const closeDelay = () =>
		overrides().closeDelay ?? defaults?.closeDelay() ?? 0;
	const trigger = createTooltipTrigger(
		{
			...root,
			setOpen(next) {
				clearTimeout(closeTimer);
				if (next || closeDelay() === 0) {
					root.setOpen(next);
					return;
				}
				closeTimer = setTimeout(() => root.setOpen(false), closeDelay());
			},
		},
		{ side: placement.side },
	);
	const popup = createTooltipPopup(trigger);

	return (
		<TooltipContext.Provider
			value={{
				setOverrides,
				trigger,
				popup,
				root,
				placement,
			}}
		>
			<div
				ref={(element) => trigger.setTriggerElement(element)}
				onMouseEnter={() => {
					clearTimeout(closeTimer);
					trigger.onMouseEnter();
				}}
				onMouseMove={trigger.onMouseMove}
				onMouseLeave={trigger.onMouseLeave}
				onMouseDown={trigger.onMouseDown}
				onFocusIn={trigger.onFocusIn}
				onFocusOut={trigger.onFocusOut}
				style={{ position: 'relative', display: 'flex', flexShrink: 0 }}
			>
				{props.children}
				{/* Escape closes a hover-opened tooltip before it reaches a dialog behind it; a pinned one is not a layer. */}
				<Show when={root.opened() && props.open === undefined}>
					<DismissableLayer onEscapeKeyDown={trigger.dismiss} />
				</Show>
			</div>
		</TooltipContext.Provider>
	);
}

export interface TooltipTriggerProps {
	/** The element the tooltip describes. */
	children?: JSX.Element;
	/** Overrides the provider's delay for this tooltip, in ms. */
	delay?: number;
	/** Overrides the provider's close delay for this tooltip, in ms. */
	closeDelay?: number;
}

/** Marks the element the tooltip describes. Renders no element: the `Tooltip`'s wrapper hears the pointer and focus. */
export function TooltipTrigger(props: TooltipTriggerProps) {
	const context = useTooltipContext();
	createComputed(() =>
		context.setOverrides({
			delay: props.delay,
			closeDelay: props.closeDelay,
		}),
	);
	return props.children;
}

type TooltipContentBaseProps = {
	side?: TooltipSide;
	style?: StyleDesc;
	/** Locator id of the popup. */
	testId?: string;
};

export type TooltipContentProps = TooltipContentBaseProps &
	(
		| { children: JSX.Element; shortcut?: string[] }
		| { children?: JSX.Element; shortcut: string[] }
	);

/** The tooltip label (and/or `shortcut`), anchored against the trigger. */
export function TooltipContent(props: TooltipContentProps) {
	const context = useTooltipContext();
	const presence = context.root.presence;
	const side = () => props.side ?? 'top';
	const rest = { opacity: 0, scale: 0.96 };
	return (
		<Show when={presence.mounted()}>
			<anchored
				side={side()}
				align="center"
				fit="flip"
				gap={SIDE_OFFSET - SHADOW_PAD}
				snapMargin={POPUP_MARGIN}
				onPlacement={context.placement.onPlacement}
				deferred
				priority={2}
				style={{
					backgroundColor: 'transparent',
					padding: SHADOW_PAD,
					pointerEvents: 'none',
				}}
			>
				<motion.div
					// The popup is hoverable, like Base UI's: reaching it keeps the tooltip open.
					ref={context.popup.ref}
					{...context.popup.props}
					initial={rest}
					animate={presence.open() ? { opacity: 1, scale: 1 } : rest}
					transition={{ duration: 0.15, ease: 'easeOut' }}
					onMotionComplete={() => {
						if (!presence.open()) presence.release();
					}}
					style={{ position: 'relative', pointerEvents: 'auto' }}
				>
					<PopupShadow />
					<div
						testId={props.testId}
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 6,
							maxWidth: 'max-content',
							borderRadius: styleTokens.radiusPopover,
							outline: `1px solid ${semanticColors.borderSecondary}`,
							paddingBlock: 4,
							paddingInline: 8,
							backgroundColor: semanticColors.surfacePopover,
							color: semanticColors.textPrimary,
							...typography.variants.small,
							whiteSpace: 'nowrap',
							...props.style,
						}}
					>
						{props.children}
						<Show when={props.shortcut}>
							{(keys: Accessor<string[]>) => (
								<div
									style={{
										display: 'flex',
										flexDirection: 'row',
										alignItems: 'center',
										gap: 2,
										flexShrink: 0,
									}}
								>
									<For each={keys()}>
										{(key) => (
											<div
												style={{
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													minWidth: 16,
													height: 16,
													paddingInline: 3,
													borderRadius: styleTokens.radius4,
													backgroundColor: semanticColors.surfaceControlSubtle,
													color: semanticColors.textSecondary,
													...typography.variants.mini,
													fontFamily: typography.fontMono,
												}}
											>
												{key}
											</div>
										)}
									</For>
								</div>
							)}
						</Show>
					</div>
				</motion.div>
			</anchored>
		</Show>
	);
}
