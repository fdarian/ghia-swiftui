import { colorScheme } from '#src/tokens/color-scheme.ts';
import { semanticColors } from '#src/tokens/semantic-colors.ts';

/**
 * Radii, shadows, blur and icon sizes, in px as plain numbers (ghia styles
 * take numbers). The shadows read the scheme: use them inside JSX props or
 * effects.
 */
export const style = {
	radius2: 2,
	radius4: 4,
	radius6: 6,
	radius8: 8,
	radius10: 10,
	radius12: 12,
	radius16: 16,
	radius18: 18,
	radius20: 20,
	radius26: 26,
	radiusFull: 9999,
	radiusControl: 12,
	radiusPanel: 18,
	radiusPopover: 12,
	radiusWindow: 16,
	radiusPill: 9999,
	radiusDialog: 24,
	radiusCard: 12,

	borderWidthControl: 1,
	borderWidthPanel: 1,

	get shadowPanel() {
		return colorScheme() === 'dark'
			? `inset 0 0 0 1px ${semanticColors.borderTertiary}, 0 8px 10px -6px rgba(0,0,0,0.4), 0 20px 25px -5px rgba(0,0,0,0.48)`
			: `inset 0 0 0 1px ${semanticColors.borderSecondary}, 0 8px 10px -6px rgba(0,0,0,0.1), 0 20px 25px -5px rgba(0,0,0,0.16)`;
	},
	get shadowPopover() {
		return colorScheme() === 'dark'
			? `inset 0 0 0 1px ${semanticColors.borderSecondary}, 0 8px 28px rgba(0,0,0,0.48)`
			: `inset 0 0 0 1px ${semanticColors.borderPrimary}, 0 8px 24px rgba(0,0,0,0.18)`;
	},
	get shadowDialog() {
		return colorScheme() === 'dark'
			? '0 32px 64px -8px rgba(0,0,0,0.85), 0 10px 20px -4px rgba(0,0,0,0.4)'
			: '0 20px 48px -12px rgba(0,0,0,0.35)';
	},

	blurPanel: 24,
	blurPopover: 36,

	iconSmall: 12,
	iconMedium: 16,
	iconLarge: 22,
};
