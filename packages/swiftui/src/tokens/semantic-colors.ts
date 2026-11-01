import { mix, withAlpha } from '#src/tokens/color-math.ts';
import { colorScheme } from '#src/tokens/color-scheme.ts';
import { colors } from '#src/tokens/colors.ts';
import { defineTokens } from '#src/tokens/define-tokens.ts';

export type SemanticColorName =
	| 'textPrimary'
	| 'textSecondary'
	| 'textTertiary'
	| 'textQuaternary'
	| 'textDisabled'
	| 'textSecondarySolid'
	| 'textTertiarySolid'
	| 'textQuaternarySolid'
	| 'textPlaceholder'
	| 'textLink'
	| 'surfaceControl'
	| 'surfaceControlSubtle'
	| 'surfaceControlActive'
	| 'surfaceWell'
	| 'surfacePanel'
	| 'surfacePopover'
	| 'surfacePopoverHover'
	| 'surfaceListHover'
	| 'surfaceListSelection'
	| 'surfaceInput'
	| 'borderPrimary'
	| 'borderSecondary'
	| 'borderTertiary'
	| 'borderSeparator'
	| 'borderField'
	| 'windowBg'
	| 'windowBgSecondary'
	| 'panelBackground'
	| 'panelOverlay'
	| 'panelBackdrop'
	| 'background'
	| 'backgroundSolid'
	| 'sidebar'
	| 'sidebarBorder'
	| 'panelBorder'
	| 'panelBorderHover'
	| 'accentHover'
	| 'redHover'
	| 'accentContrast';

const dark = () => colorScheme() === 'dark';

const surfacePopover = () =>
	mix(dark() ? '#111113' : '#fcfcfc', colors.bg, 0.15);

/**
 * Semantic roles: what components reach for instead of the raw palette.
 * `panelBorderHover` and the dark `*Hover` mixes follow syne's dark theme
 * overrides.
 */
export const semanticColors = defineTokens<SemanticColorName, string>({
	textPrimary: () => colors.fg,
	textSecondary: () => colors.fg60,
	textTertiary: () => colors.fg40,
	textQuaternary: () => colors.fg20,
	textDisabled: () => colors.fg40,
	textSecondarySolid: () => mix(colors.bg, colors.fg, 0.6),
	textTertiarySolid: () => mix(colors.bg, colors.fg, 0.4),
	textQuaternarySolid: () => mix(colors.bg, colors.fg, 0.2),
	textPlaceholder: () => mix(colors.bg, colors.fg, 0.4),
	textLink: () => colors.accent,

	surfaceControl: () => colors.fg10,
	surfaceControlSubtle: () => colors.fg5,
	surfaceControlActive: () => colors.fg20,
	surfaceWell: () => withAlpha(colors.fg, 0.025),
	surfacePanel: () => colors.bgSecondary40,
	surfacePopover,
	surfacePopoverHover: () => mix(surfacePopover(), colors.fg, 0.05),
	surfaceListHover: () => colors.selection5,
	surfaceListSelection: () => colors.selection10,
	surfaceInput: () => colors.fg5,

	borderPrimary: () => colors.fg20,
	borderSecondary: () => colors.fg10,
	borderTertiary: () => colors.fg5,
	borderSeparator: () => colors.fg10,
	borderField: () => colors.fg20,

	windowBg: () => colors.bg40,
	windowBgSecondary: () => colors.bgSecondary40,
	panelBackground: () => colors.bgSecondary40,
	panelOverlay: () => colors.bg,
	panelBackdrop: () => (dark() ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.18)'),
	background: () => colors.bg40,
	backgroundSolid: () => (dark() ? colors.bg : colors.bgSecondary),
	sidebar: () => colors.bgSecondary,
	sidebarBorder: () => colors.fg10,
	panelBorder: () => colors.fg10,
	panelBorderHover: () => (dark() ? colors.fg20 : colors.fg10),
	accentHover: () =>
		dark()
			? mix(colors.accent, '#ffffff', 0.15)
			: mix(colors.accent, '#000000', 0.05),
	redHover: () =>
		dark()
			? mix(colors.red, '#ffffff', 0.15)
			: mix(colors.red, '#000000', 0.05),
	accentContrast: () => '#ffffff',
});
