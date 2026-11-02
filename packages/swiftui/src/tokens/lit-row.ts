import { colors } from '#src/tokens/colors.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

/** The highlighted row of a native macOS menu: an accent fill under accent-contrast ink. Read inside JSX props or effects. */
export const litRow = {
	fill: (lit: boolean) => (lit ? colors.accent : 'transparent'),
	ink: (lit: boolean, rest: string) =>
		lit ? semanticColors.accentContrast : rest,
};
