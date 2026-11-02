/**
 * What `capture` and `compare` take: a shot is one reference page in one state
 * and the demo page it is compared with. Coordinates are in points.
 */
export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Shot {
	/** The reference app's page name. */
	page: string;
	/** Extra reference app flags: how the page is put in the state to compare. */
	refArgs?: string[];
	/** The state is a real menu, which needs the window in front of everything for seconds: `all` skips it, and it runs only by name with `--allow-front`, when the user asked for it. */
	front?: true;
	/** The demo the shot is compared with (`pnpm live-capture <demo>`). */
	demo: string;
	/** `live-capture` steps that put the demo in the same state. */
	steps?: string[];
	/** The reference window's size in points. Defaults to `REFERENCE_SIZE`. */
	refSize?: { width: number; height: number };
	/** The part of the demo's window to compare. Defaults to the page beside the sidebar. */
	ours?: Rect;
	/** The part of the reference window to compare. Defaults to all of it. */
	ref?: Rect;
}

export const REFERENCE_SIZE = { width: 760, height: 640 };
export const DEMO_SIZE = { width: 960, height: 640 };

/** The demo's page: its window right of the 200pt sidebar and the 1pt divider. */
export const DEMO_PAGE: Rect = { x: 201, y: 0, width: 759, height: 640 };

export const shots: Record<string, Shot> = {
	button: { page: 'button', demo: 'button' },
	'button-icons': {
		page: 'button',
		refArgs: ['--scroll', '400'],
		demo: 'button',
		steps: ['wheel=page:400'],
	},
	'button-state': {
		page: 'button',
		refArgs: ['--scroll', '800'],
		demo: 'button',
		steps: ['wheel=page:800'],
	},
	select: { page: 'select', demo: 'select' },
	'select-open': {
		page: 'select',
		refArgs: ['--click', '236,148'],
		front: true,
		demo: 'select',
		steps: ['click=select-default-medium'],
	},
	menu: { page: 'menu', demo: 'menu' },
	'menu-open': {
		page: 'menu',
		refArgs: ['--click', '71,80'],
		front: true,
		demo: 'menu',
		steps: ['click=menu-trigger'],
	},
	input: { page: 'input', demo: 'input' },
	'input-focus': {
		page: 'input',
		refArgs: ['--focus', 'default'],
		demo: 'input',
		steps: ['click=input-focus'],
	},
	'input-glass-focus': {
		page: 'input',
		refArgs: ['--focus', 'glass'],
		demo: 'input',
		steps: ['click=input-glass-focus'],
	},
	sidebar: {
		page: 'sidebar',
		refSize: { width: 520, height: 380 },
		demo: 'sidebar',
		ours: { x: 225, y: 124, width: 260, height: 380 },
		ref: { x: 0, y: 0, width: 260, height: 380 },
	},
	toolbar: {
		page: 'toolbar',
		demo: 'toolbar',
		ours: { x: 225, y: 100, width: 711, height: 120 },
		ref: { x: 0, y: 0, width: 711, height: 120 },
	},
	tooltip: { page: 'tooltip', demo: 'tooltip' },
	checkbox: { page: 'checkbox', demo: 'checkbox' },
	radio: { page: 'radio', demo: 'radio-group' },
	list: {
		page: 'list',
		demo: 'list',
		ours: { x: 225, y: 220, width: 711, height: 360 },
		ref: { x: 24, y: 100, width: 712, height: 360 },
	},
	scrollbar: {
		page: 'scrollbar',
		refArgs: ['--scroll-inner', '200', '--flash'],
		demo: 'scroll-area',
		steps: ['wheel=basic:200'],
		ours: { x: 225, y: 100, width: 711, height: 280 },
		ref: { x: 24, y: 100, width: 712, height: 280 },
	},
	glass: { page: 'glass', demo: 'glass-panel' },
	liquid: { page: 'liquid', demo: 'liquid-glass' },
	status: { page: 'status', demo: 'status' },
};

/** What `all` runs: the shots that can be captured with the window parked. */
export const parkedShots = Object.keys(shots).filter(
	(name) => shots[name]?.front !== true,
);
