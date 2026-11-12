import type { StyleDesc } from '@ghia/solid';
import { createSignal, Show } from 'solid-js';
import { Button } from '#src/components/button.tsx';
import { useFieldDisabled } from '#src/components/field-disabled-context.ts';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '#src/components/tooltip.tsx';
import { Icon } from '#src/icons/icon.tsx';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';
import { style as styleTokens } from '#src/tokens/style.ts';
import { typography } from '#src/tokens/typography.ts';

/**
 * The four modifiers `global-hotkey` (the crate behind
 * `tauri-plugin-global-shortcut`) recognizes, in the order macOS itself uses
 * for a combined shortcut glyph (⌃⌥⇧⌘). Both the accelerator string this
 * component produces and the glyphs it renders follow this order.
 */
const MODIFIER_ORDER = ['control', 'alt', 'shift', 'cmd'] as const;
type ModifierName = (typeof MODIFIER_ORDER)[number];

const MODIFIER_TOKEN: Record<ModifierName, string> = {
	control: 'Control',
	alt: 'Alt',
	shift: 'Shift',
	cmd: 'Cmd',
};

const MODIFIER_SYMBOL: Record<ModifierName, string> = {
	control: '⌃',
	alt: '⌥',
	shift: '⇧',
	cmd: '⌘',
};

type ModifierState = Record<ModifierName, boolean>;

const NO_MODIFIERS: ModifierState = {
	control: false,
	alt: false,
	shift: false,
	cmd: false,
};

function modifiersFromEvent(event: {
	ctrlKey?: boolean;
	altKey?: boolean;
	shiftKey?: boolean;
	metaKey?: boolean;
}): ModifierState {
	return {
		control: event.ctrlKey === true,
		alt: event.altKey === true,
		shift: event.shiftKey === true,
		cmd: event.metaKey === true,
	};
}

function heldModifierSymbols(modifiers: ModifierState): string[] {
	return MODIFIER_ORDER.filter((name) => modifiers[name]).map(
		(name) => MODIFIER_SYMBOL[name],
	);
}

function isModifierKey(key: string | undefined): boolean {
	return (
		key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta'
	);
}

/** `KeyboardEvent.code` values for the modifier keys themselves: never a valid main key. */
function isModifierCode(code: string): boolean {
	return (
		code.startsWith('Control') ||
		code.startsWith('Alt') ||
		code.startsWith('Shift') ||
		code.startsWith('Meta')
	);
}

/**
 * Friendly glyphs for the codes a global shortcut is actually likely to use.
 * Anything not listed falls back to the bare `KeyboardEvent.code` in
 * `labelForCode`: still a legal accelerator, just spelled out.
 */
const KEY_LABEL: Record<string, string> = {
	Space: 'Space',
	Enter: '↵',
	Tab: '⇥',
	Escape: '⎋',
	Backspace: '⌫',
	Delete: '⌦',
	ArrowUp: '↑',
	ArrowDown: '↓',
	ArrowLeft: '←',
	ArrowRight: '→',
	Home: '↖',
	End: '↘',
	PageUp: '⇞',
	PageDown: '⇟',
};

function labelForCode(code: string): string {
	const known = KEY_LABEL[code];
	if (known !== undefined) return known;
	if (code.startsWith('Key')) return code.slice(3);
	if (code.startsWith('Digit')) return code.slice(5);
	return code;
}

/**
 * Builds the accelerator string `tauri-plugin-global-shortcut` parses (the
 * `global-hotkey` crate's grammar: modifiers, then exactly one main key,
 * e.g. `Control+Alt+KeyK`). `KeyboardEvent.code` is used verbatim for the
 * main key: `global-hotkey` matches the DOM `code` spelling directly.
 */
function buildAccelerator(modifiers: ModifierState, code: string): string {
	const tokens: string[] = MODIFIER_ORDER.filter((name) => modifiers[name]).map(
		(name) => MODIFIER_TOKEN[name],
	);
	tokens.push(code);
	return tokens.join('+');
}

/** Renders a stored accelerator string as macOS glyphs, e.g. `Control+Alt+KeyK` -> `⌃⌥K`. */
function formatAccelerator(accelerator: string): string {
	const tokens = accelerator.split('+');
	const code = tokens[tokens.length - 1];
	if (code === undefined || code === '') return accelerator;
	const modifierTokens = new Set(
		tokens.slice(0, -1).map((token) => token.toUpperCase()),
	);
	const symbols = MODIFIER_ORDER.filter((name) =>
		modifierTokens.has(MODIFIER_TOKEN[name].toUpperCase()),
	).map((name) => MODIFIER_SYMBOL[name]);
	return [...symbols, labelForCode(code)].join('');
}

const boxSizes = {
	small: { height: 28, paddingInline: 10, borderRadius: styleTokens.radius8 },
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

export type ShortcutRecorderSize = keyof typeof boxSizes;

export interface ShortcutRecorderProps {
	/** The stored accelerator (`tauri-plugin-global-shortcut` syntax), or `null` for "no shortcut". */
	value: string | null;
	onValueChange: (value: string | null) => void;
	size?: ShortcutRecorderSize;
	disabled?: boolean;
	/** Locator id of the recording box; the clear button's is `<testId>-clear`. */
	testId?: string;
	style?: StyleDesc;
}

/**
 * A focusable control that captures the next key chord pressed while it has
 * focus and reports it as the accelerator string
 * `tauri-plugin-global-shortcut` parses. Requires at least one modifier,
 * like every other OS-level global-shortcut picker: a bare key would
 * otherwise hijack that key everywhere, all the time.
 *
 * Click (or `Enter` / `Space` while focused) to start recording; the first
 * key chord with a modifier commits and exits recording. `Escape` cancels
 * without changing `value`, and is stopped before it reaches a window-level
 * Escape handler. Losing focus while recording also cancels.
 */
export function ShortcutRecorder(props: ShortcutRecorderProps) {
	const [isRecording, setIsRecording] = createSignal(false);
	const [liveModifiers, setLiveModifiers] =
		createSignal<ModifierState>(NO_MODIFIERS);
	const [hint, setHint] = createSignal<string>();
	const size = () => boxSizes[props.size ?? 'medium'];
	const fieldDisabled = useFieldDisabled();
	const isDisabled = () => props.disabled === true || fieldDisabled();

	const startRecording = () => {
		if (isDisabled()) return;
		setIsRecording(true);
		setLiveModifiers(NO_MODIFIERS);
		setHint(undefined);
	};
	const stopRecording = () => {
		setIsRecording(false);
		setLiveModifiers(NO_MODIFIERS);
		setHint(undefined);
	};

	const held = () => heldModifierSymbols(liveModifiers());
	const isPlaceholder = () => isRecording() || !props.value;
	const label = () => {
		if (isRecording()) {
			return hint() ?? (held().length > 0 ? held().join('') : 'Type shortcut…');
		}
		return props.value ? formatAccelerator(props.value) : 'Record Shortcut';
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 6,
				...props.style,
			}}
		>
			<div
				testId={props.testId}
				role="button"
				aria-label={label()}
				aria-disabled={isDisabled()}
				tabIndex={isDisabled() ? -1 : 0}
				formControl={isDisabled() ? 'disabled' : 'enabled'}
				onClick={startRecording}
				onKeyDown={(event) => {
					if (!isRecording()) {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							startRecording();
						}
						return;
					}
					event.preventDefault();
					event.stopPropagation();

					if (event.key === 'Escape') {
						stopRecording();
						return;
					}

					const modifiers = modifiersFromEvent(event);
					setLiveModifiers(modifiers);
					// A hint from a rejected attempt must not outlive it.
					setHint(undefined);

					const code = event.code;
					// Still just a modifier on its own: keep waiting for the main key.
					if (isModifierKey(event.key) || (code && isModifierCode(code))) {
						return;
					}
					// A key with no physical code has no accelerator spelling.
					if (!code) {
						setHint('That key cannot be used');
						return;
					}

					if (!MODIFIER_ORDER.some((name) => modifiers[name])) {
						setHint('Include ⌘, ⌥, ⌃, or ⇧');
						return;
					}

					props.onValueChange(buildAccelerator(modifiers, code));
					stopRecording();
				}}
				onKeyUp={(event) => {
					if (!isRecording()) return;
					event.preventDefault();
					event.stopPropagation();
					setLiveModifiers(modifiersFromEvent(event));
				}}
				onBlur={stopRecording}
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'center',
					minWidth: 108,
					borderWidth: 1,
					borderStyle: 'solid',
					borderColor: isRecording()
						? colors.accent
						: semanticColors.borderField,
					backgroundColor: 'transparent',
					cursor: 'default',
					keyboardFocusDim: false,
					...size(),
					focusVisible: {
						borderColor: isRecording() ? colors.accent : colors.fg40,
					},
					...(isDisabled()
						? { pointerEvents: 'none', opacity: 0.5, cursor: 'not-allowed' }
						: {}),
				}}
			>
				<span
					style={{
						...typography.variants.regular,
						color: isPlaceholder()
							? semanticColors.textPlaceholder
							: semanticColors.textPrimary,
					}}
				>
					{label()}
				</span>
			</div>
			<Show when={props.value && !isRecording()}>
				<Tooltip>
					<TooltipTrigger>
						<Button
							testId={
								props.testId === undefined ? undefined : `${props.testId}-clear`
							}
							variant="transparent"
							size={props.size ?? 'medium'}
							iconOnly
							disabled={isDisabled()}
							onClick={() => props.onValueChange(null)}
							aria-label="Clear shortcut"
							// A `transparent` button is its bare icon: the clear keeps a 24px target.
							style={{ width: 24, height: 24 }}
						>
							<Icon name="x" />
						</Button>
					</TooltipTrigger>
					<TooltipContent
						testId={
							props.testId === undefined
								? undefined
								: `${props.testId}-clear-tooltip`
						}
					>
						Clear shortcut
					</TooltipContent>
				</Tooltip>
			</Show>
		</div>
	);
}
