import type { Component } from 'solid-js';
import { CheckboxDemo } from '#src/demos/checkbox.tsx';

export interface Demo {
	name: string;
	component: Component;
}

export const demos: readonly Demo[] = [
	{ name: 'checkbox', component: CheckboxDemo },
];
