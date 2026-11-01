import { createSignal } from 'solid-js';

const [accent, setAccent] = createSignal<string | undefined>(undefined);

/** The explicit accent, or `undefined` while the scheme's own `themeAccent` applies. */
export const accentColor = accent;

/**
 * Sets the accent every `colors.accent*` token and accent-coloured component
 * reads. ghia has no system accent read, so the app picks it; until it does,
 * `colors.themeAccent` applies.
 */
export function setAccentColor(color: string): void {
	if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
		throw new Error(`setAccentColor needs a #rrggbb colour, got ${color}`);
	}
	setAccent(color);
}
