import { WINDOW_TITLE } from '#src/app.tsx';

export const windowOptions = {
	title: WINDOW_TITLE,
	width: 960,
	height: 640,
	focus: process.env.GPUIX_BACKGROUND !== '1',
};
