/**
 * The `Text` type scale, size, weight and line height per variant as in
 * syne. `fontFamily` stays unset for the sans variants so ghia renders the
 * system font (SF); letter spacing is dropped because ghia has no
 * `letterSpacing` on boxes.
 */
const sans = {
	heading1: { fontSize: 24, fontWeight: 600, lineHeight: '30px' },
	heading2: { fontSize: 18, fontWeight: 600, lineHeight: '24px' },
	extraLarge: { fontSize: 18, fontWeight: 400, lineHeight: '24px' },
	extraLargeStrong: { fontSize: 18, fontWeight: 500, lineHeight: '24px' },
	large: { fontSize: 16, fontWeight: 400, lineHeight: '22px' },
	largeStrong: { fontSize: 16, fontWeight: 500, lineHeight: '22px' },
	regular: { fontSize: 13, fontWeight: 400, lineHeight: '18px' },
	strong: { fontSize: 13, fontWeight: 500, lineHeight: '18px' },
	small: { fontSize: 11, fontWeight: 400, lineHeight: '14px' },
	smallStrong: { fontSize: 11, fontWeight: 500, lineHeight: '14px' },
	mini: { fontSize: 8, fontWeight: 400, lineHeight: '10px' },
	miniStrong: { fontSize: 8, fontWeight: 500, lineHeight: '10px' },
} as const;

const fontMono = 'Menlo';

const mono = {
	mono: {
		fontSize: 13,
		fontWeight: 400,
		lineHeight: '18px',
		fontFamily: fontMono,
	},
	monoStrong: {
		fontSize: 13,
		fontWeight: 600,
		lineHeight: '18px',
		fontFamily: fontMono,
	},
	smallMono: {
		fontSize: 11,
		fontWeight: 400,
		lineHeight: '14px',
		fontFamily: fontMono,
	},
} as const;

export const typography = {
	variants: { ...sans, ...mono },
	fontMono,
} as const;
