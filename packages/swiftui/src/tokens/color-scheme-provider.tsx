import { createAppearance, useGpuixRequired } from '@ghia/solid';
import { type JSX, onCleanup } from 'solid-js';
import { bindColorScheme, colorScheme } from '#src/tokens/color-scheme.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

/**
 * Binds the tokens to the window's appearance, which follows the OS until
 * `applyColorScheme` forces one. Render the whole app inside it: a token read
 * outside throws.
 *
 * Also sets the inherited text colour, the role syne's global `body` rule
 * plays, so icons and bare text take `textPrimary` without a `Text` around
 * them. It adds no box: `display: contents`.
 */
export function ColorSchemeProvider(props: { children?: JSX.Element }) {
	onCleanup(
		bindColorScheme({
			appearance: createAppearance(),
			renderer: useGpuixRequired(),
		}),
	);
	return (
		<div
			style={{
				display: 'contents',
				colorScheme: colorScheme(),
				color: semanticColors.textPrimary,
			}}
		>
			{props.children}
		</div>
	);
}
