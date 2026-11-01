import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

export type TintColor =
	| 'primary'
	| 'secondary'
	| 'blue'
	| 'green'
	| 'yellow'
	| 'orange'
	| 'red'
	| 'purple'
	| 'magenta';

export const tintColors: readonly TintColor[] = [
	'primary',
	'secondary',
	'blue',
	'green',
	'yellow',
	'orange',
	'red',
	'purple',
	'magenta',
];

/**
 * The treatment `Badge` and `Callout` share: a support colour is a same-hue
 * tint with matching text, `primary` is the high-contrast solid and
 * `secondary` the soft control surface.
 */
export function tint(color: TintColor): {
	backgroundColor: string;
	color: string;
} {
	switch (color) {
		case 'primary':
			return { backgroundColor: colors.fg, color: colors.bg };
		case 'secondary':
			return {
				backgroundColor: semanticColors.surfaceControl,
				color: semanticColors.textSecondary,
			};
		case 'blue':
			return { backgroundColor: colors.supportBlue10, color: colors.blue };
		case 'green':
			return { backgroundColor: colors.supportGreen10, color: colors.green };
		case 'yellow':
			return { backgroundColor: colors.supportYellow10, color: colors.yellow };
		case 'orange':
			return { backgroundColor: colors.supportOrange10, color: colors.orange };
		case 'red':
			return { backgroundColor: colors.supportRed10, color: colors.red };
		case 'purple':
			return { backgroundColor: colors.supportPurple10, color: colors.purple };
		case 'magenta':
			return {
				backgroundColor: colors.supportMagenta10,
				color: colors.magenta,
			};
	}
}
