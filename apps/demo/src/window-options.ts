import { WINDOW_TITLE } from '#src/app.tsx';
import { parkedOrigin } from '../scripts/park.ts';

const SIZE = { width: 960, height: 640 };
const background = process.env.GPUIX_BACKGROUND === '1';

export const windowOptions = {
	title: WINDOW_TITLE,
	...SIZE,
	// ghia orders the window front when it opens, wherever it is: opening it where only a strip is on a display is what keeps it off the user's work.
	...(background ? parkedOrigin(SIZE) : {}),
	minWidth: 640,
	minHeight: 400,
	titlebarTransparent: true,
	windowBackground: 'opaque',
	trafficLightX: 20,
	trafficLightY: 20,
	focus: !background,
};
