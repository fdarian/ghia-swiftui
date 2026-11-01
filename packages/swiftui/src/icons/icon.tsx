import type { StyleDesc } from '@ghia/solid';
import { For } from 'solid-js';
import { useIconSize } from '#src/icons/icon-size.ts';

const circle = (cx: number, cy: number, r: number) =>
	`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

/** Lucide's 24px outline glyphs (ISC), the few syne's components and demos use. */
const glyphs = {
	x: ['M18 6 6 18', 'm6 6 12 12'],
	plus: ['M5 12h14', 'M12 5v14'],
	check: ['M20 6 9 17l-5-5'],
	'chevron-up': ['m18 15-6-6-6 6'],
	'chevron-down': ['m6 9 6 6 6-6'],
	'chevrons-up-down': ['m7 15 5 5 5-5', 'm7 9 5-5 5 5'],
	info: [circle(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],
	'circle-alert': [circle(12, 12, 10), 'M12 8v4', 'M12 16h.01'],
	'circle-check': [circle(12, 12, 10), 'm9 12 2 2 4-4'],
	'triangle-alert': [
		'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
		'M12 9v4',
		'M12 17h.01',
	],
	'octagon-x': [
		'm15 9-6 6',
		'm9 9 6 6',
		'M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z',
	],
	'loader-circle': ['M21 12a9 9 0 1 1-6.219-8.56'],
	'external-link': [
		'M15 3h6v6',
		'M10 14 21 3',
		'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
	],
	search: [circle(11, 11, 8), 'm21 21-4.3-4.3'],
	trash: [
		'M3 6h18',
		'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6',
		'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
		'M10 11v6',
		'M14 11v6',
	],
	download: [
		'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
		'm7 10 5 5 5-5',
		'M12 15V3',
	],
	inbox: [
		'M22 12h-6l-2 3h-4l-2-3H2',
		'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
	],
	star: [
		'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
	],
} as const;

export type IconName = keyof typeof glyphs;

export const iconNames = Object.keys(glyphs) as IconName[];

export interface IconProps {
	name: IconName;
	/** Defaults to the surrounding `IconSizeContext`. */
	size?: number;
	strokeWidth?: number;
	style?: StyleDesc;
}

/** Strokes with `currentColor`, so it takes the `color` of the element it sits in. */
export function Icon(props: IconProps) {
	const contextSize = useIconSize();
	const size = () => props.size ?? contextSize();
	return (
		<svg
			viewBox="0 0 24 24"
			style={{
				width: size(),
				height: size(),
				flexShrink: 0,
				...props.style,
			}}
		>
			<For each={glyphs[props.name]}>
				{(d) => (
					<path
						d={d}
						fill="none"
						stroke="currentColor"
						strokeWidth={props.strokeWidth ?? 2}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				)}
			</For>
		</svg>
	);
}
