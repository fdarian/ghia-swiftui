import { withAlpha } from '#src/tokens/color-math.ts';
import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

/** The highlighted row of a native macOS menu, and the selected row of a sidebar: an accent fill under accent-contrast ink. Read inside JSX props or effects. */
export const litRow = {
	fill: (lit: boolean) => (lit ? colors.accent : 'transparent'),
	ink: (lit: boolean, rest: string) =>
		lit ? semanticColors.accentContrast : rest,
	/** Secondary text on the fill (a subtitle, an accessory): the ink dimmed, as AppKit's secondary label on a selection. */
	inkSecondary: (lit: boolean, rest: string) =>
		lit ? withAlpha(semanticColors.accentContrast, 0.7) : rest,
};
