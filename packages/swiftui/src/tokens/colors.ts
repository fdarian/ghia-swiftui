import { accentColor } from '#src/tokens/accent.ts';
import { withAlpha } from '#src/tokens/color-math.ts';
import { colorScheme } from '#src/tokens/color-scheme.ts';
import { defineTokens } from '#src/tokens/define-tokens.ts';

const seeds = {
	light: {
		bg: '#ffffff',
		bgSecondary: '#ffffff',
		fg: '#000000',
		themeAccent: '#138af2',
		selection: '#000000',
		loader: '#000000',
		red: '#b12424',
		orange: '#c75d07',
		yellow: '#f8a300',
		green: '#006b4f',
		blue: '#138af2',
		purple: '#6a3dec',
		magenta: '#9a1b6e',
	},
	dark: {
		bg: '#000000',
		bgSecondary: '#000000',
		fg: '#ffffff',
		themeAccent: '#4fa3f8',
		selection: '#ffffff',
		loader: '#ffffff',
		red: '#ff6363',
		orange: '#ff9217',
		yellow: '#ffc531',
		green: '#59d499',
		blue: '#56c2ff',
		purple: '#a485ff',
		magenta: '#cf2f98',
	},
} as const;

type Seed = keyof typeof seeds.light;
type Support =
	| 'red'
	| 'orange'
	| 'yellow'
	| 'green'
	| 'blue'
	| 'purple'
	| 'magenta';
type RampBase = 'bg' | 'bgSecondary' | 'fg' | 'accent' | 'selection' | 'loader';
type RampStep = 0 | 5 | 10 | 20 | 40 | 60 | 80;

export type ColorTokenName =
	| Seed
	| 'accent'
	| 'fg700'
	| `${RampBase}${RampStep}`
	| `support${Capitalize<Support>}${RampStep}`;

const steps: readonly RampStep[] = [0, 5, 10, 20, 40, 60, 80];
const rampBases: readonly RampBase[] = [
	'bg',
	'bgSecondary',
	'fg',
	'accent',
	'selection',
	'loader',
];
const supports: readonly Support[] = [
	'red',
	'orange',
	'yellow',
	'green',
	'blue',
	'purple',
	'magenta',
];

function seed(name: Seed) {
	return seeds[colorScheme()][name];
}

function accent() {
	return accentColor() ?? seed('themeAccent');
}

function read(name: RampBase | Support) {
	return name === 'accent' ? accent() : seed(name);
}

const definitions: Partial<Record<ColorTokenName, () => string>> = {
	accent,
	fg700: () => withAlpha(seed('fg'), 0.6),
};
for (const name of Object.keys(seeds.light) as Seed[]) {
	definitions[name] = () => seed(name);
}
for (const base of rampBases) {
	for (const step of steps) {
		definitions[`${base}${step}`] = () => withAlpha(read(base), step / 100);
	}
}
for (const support of supports) {
	const capitalized = `${support.charAt(0).toUpperCase()}${support.slice(1)}`;
	for (const step of steps) {
		definitions[`support${capitalized}${step}` as ColorTokenName] = () =>
			withAlpha(read(support), step / 100);
	}
}

/**
 * Primitive palette plus alpha ramps. Components read `semanticColors`
 * instead, except where syne itself reaches for a seed or a support ramp
 * (`colors.red`, `colors.supportBlue10`).
 */
export const colors = defineTokens(
	definitions as Record<ColorTokenName, () => string>,
);
