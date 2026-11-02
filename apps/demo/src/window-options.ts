import { WINDOW_TITLE } from '#src/app.tsx';

export const windowOptions = {
	title: WINDOW_TITLE,
	width: 960,
	height: 640,
	minWidth: 640,
	minHeight: 400,
	titlebarTransparent: true,
	windowBackground: 'opaque',
	trafficLightX: 20,
	trafficLightY: 20,
	focus: process.env.GPUIX_BACKGROUND !== '1',
};
