import type { Component } from 'solid-js';
import { CheckboxDemo, checkboxScenario } from '#src/demos/checkbox.tsx';
import type { Shot } from '#src/demos/shot.ts';

export interface Demo {
	name: string;
	component: Component;
	/** Steps run after `initial.png` is captured, driving the offscreen renderer. */
	scenario?: (shot: Shot) => Promise<void>;
}

export const demos: readonly Demo[] = [
	{ name: 'checkbox', component: CheckboxDemo, scenario: checkboxScenario },
];
