import type { NativeRenderer } from '@ghia/solid';
import type { Accessor } from 'solid-js';

export type ColorScheme = 'light' | 'dark';

interface SystemBinding {
	appearance: Accessor<ColorScheme>;
	renderer: NativeRenderer;
}

let binding: SystemBinding | undefined;

function bound(): SystemBinding {
	if (binding === undefined) {
		throw new Error(
			'No colour scheme source: render the app inside <ColorSchemeProvider>',
		);
	}
	return binding;
}

/** Called by `ColorSchemeProvider`, which owns the `createAppearance()` subscription. */
export function bindColorScheme(next: SystemBinding): () => void {
	binding = next;
	return () => {
		if (binding === next) binding = undefined;
	};
}

/**
 * The window's effective appearance. Reactive: read it in JSX props or
 * effects, never at module scope.
 */
export function colorScheme(): ColorScheme {
	return bound().appearance();
}

function setAppearance(appearance: 'light' | 'dark' | 'system') {
	const renderer = bound().renderer;
	if (renderer.setAppearance === undefined) {
		throw new Error('This renderer cannot change the window appearance');
	}
	renderer.setAppearance(appearance);
}

/**
 * Forces light or dark for the whole window. Goes through the renderer rather
 * than a local signal so native chrome (scrollbars, vibrancy) flips with the
 * tokens; `colorScheme()` follows once the renderer reports the change.
 */
export function applyColorScheme(isDark: boolean): void {
	setAppearance(isDark ? 'dark' : 'light');
}

/** Goes back to following the OS appearance, the default. */
export function followSystemColorScheme(): void {
	setAppearance('system');
}
