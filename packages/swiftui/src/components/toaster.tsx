import { AnimatePresence, motion } from '@ghia/solid';
import {
	type Accessor,
	createMemo,
	createSignal,
	For,
	type JSX,
	Show,
} from 'solid-js';
import { Button } from '#src/components/button.tsx';
import { Text } from '#src/components/text.tsx';
import { glass } from '#src/glass.ts';
import { Icon, type IconName } from '#src/icons/icon.tsx';
import { PopupShadow } from '#src/popup.tsx';
import {
	dismissToast,
	pauseToasts,
	resumeToasts,
	type ToastAction,
	type ToastEntry,
	type ToastId,
	type ToastType,
	toasts,
} from '#src/toast-store.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';

export type { ToastType } from '#src/toast-store.ts';

/** Sonner's `visibleToasts`: older toasts past this stay open but out of sight. */
const VISIBLE_TOASTS = 3;
/** Sonner's `gap`. */
const GAP = 14;
/** Sonner's desktop offset from the window's bottom edge. */
const OFFSET = 24;
/** Syne's toast text column: sonner's own width cap. */
const MAX_WIDTH = 400;
/** `min(9999px, calc(1.5rem + 0.5lh))` at the 18px line height of `strong`. */
const PILL_RADIUS = 33;

const icons: Record<ToastType, { name: IconName; color: () => string }> = {
	success: { name: 'circle-check', color: () => colors.green },
	error: { name: 'octagon-x', color: () => colors.red },
	warning: { name: 'triangle-alert', color: () => colors.yellow },
	info: { name: 'info', color: () => semanticColors.textSecondary },
	loading: { name: 'loader-circle', color: () => semanticColors.textSecondary },
};

function ToastIcon(props: { type: ToastType }) {
	const icon = () => icons[props.type];
	return (
		<motion.div
			animate={props.type === 'loading' ? { rotate: 360 } : { rotate: 0 }}
			transition={
				props.type === 'loading'
					? { duration: 1, ease: 'linear', repeat: Number.POSITIVE_INFINITY }
					: { duration: 0 }
			}
			style={{ display: 'flex', width: 16, height: 16, flexShrink: 0 }}
		>
			<Icon name={icon().name} size={16} style={{ color: icon().color() }} />
		</motion.div>
	);
}

export interface ToastProps {
	id: ToastId;
	/** Which icon to show; none for a plain message. */
	type?: ToastType;
	title: JSX.Element;
	description?: JSX.Element;
	actions?: readonly ToastAction[];
	onDismiss: (id: ToastId) => void;
}

export function Toast(props: ToastProps) {
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			testId={`toast-${props.id}`}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
		>
			<div
				testId={`toast-${props.id}-dismiss`}
				role="button"
				aria-label="Dismiss toast"
				onClick={() => props.onDismiss(props.id)}
				style={{
					position: 'absolute',
					zIndex: 10,
					top: -4,
					right: -4,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: 20,
					height: 20,
					borderRadius: styleTokens.radiusPill,
					backgroundColor: semanticColors.surfacePopover,
					borderWidth: 1,
					borderStyle: 'solid',
					borderColor: semanticColors.borderSecondary,
					color: semanticColors.textSecondary,
					cursor: 'default',
					opacity: hovered() ? 1 : 0,
					pointerEvents: hovered() ? 'auto' : 'none',
					hover: { backgroundColor: semanticColors.surfacePopoverHover },
				}}
			>
				<Icon name="x" size={12} />
			</div>
			<div style={{ position: 'relative', display: 'flex' }}>
				<PopupShadow radius={PILL_RADIUS} />
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						width: '100%',
						alignItems: 'center',
						gap: 10,
						paddingInline: 16,
						paddingBlock: 12,
						borderRadius: PILL_RADIUS,
						outline: `1px solid ${semanticColors.borderSecondary}`,
						...glass.toast(),
					}}
				>
					<Show when={props.type}>
						{(type: Accessor<ToastType>) => (
							<div
								style={{ display: 'flex', alignItems: 'center', minHeight: 28 }}
							>
								<ToastIcon type={type()} />
							</div>
						)}
					</Show>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							flexGrow: 1,
							minWidth: 0,
							minHeight: 28,
							justifyContent: 'center',
						}}
					>
						<Text as="p" variant="strong" truncate>
							{props.title}
						</Text>
						<Show when={props.description}>
							<Text as="p" color="secondary" style={{ marginRight: 4 }}>
								{props.description}
							</Text>
						</Show>
					</div>
					<For each={props.actions}>
						{(action) => (
							<Button
								testId={`toast-${props.id}-action-${action.label}`}
								variant="filled"
								size="small"
								onClick={() => {
									action.onClick?.();
									props.onDismiss(props.id);
								}}
							>
								{action.label}
							</Button>
						)}
					</For>
				</div>
			</div>
		</div>
	);
}

/** One open toast. Reads the store by id and keeps the last entry it saw, so the text holds still through the exit. */
function ToastSlot(props: { id: ToastId }) {
	const entry = createMemo<ToastEntry>((previous) => {
		const current = toasts().find((candidate) => candidate.id === props.id);
		if (current !== undefined) return current;
		if (previous === undefined) throw new Error(`No toast ${props.id}`);
		return previous;
	});
	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 24, scale: 0.96 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: 8, scale: 0.96 }}
			transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
			onMouseEnter={pauseToasts}
			onMouseLeave={resumeToasts}
			style={{ pointerEvents: 'auto', maxWidth: MAX_WIDTH }}
		>
			<Show
				when={entry().custom}
				fallback={
					<Toast
						id={props.id}
						type={entry().type}
						title={entry().title}
						description={entry().description}
						actions={entry().actions}
						onDismiss={dismissToast}
					/>
				}
			>
				{(render: Accessor<(id: ToastId) => JSX.Element>) => render()(props.id)}
			</Show>
		</motion.div>
	);
}

/** Bottom-centre stack of the open toasts. Render it once, near the root of the app. */
export function Toaster() {
	const ids = createMemo(() =>
		toasts()
			.slice(-VISIBLE_TOASTS)
			.map((entry) => entry.id),
	);
	return (
		<div
			style={{
				position: 'fixed',
				left: 0,
				right: 0,
				bottom: OFFSET,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: GAP,
				pointerEvents: 'none',
			}}
		>
			<AnimatePresence mode="popLayout">
				<For each={ids()}>{(id) => <ToastSlot id={id} />}</For>
			</AnimatePresence>
		</div>
	);
}
