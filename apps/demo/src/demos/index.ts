import type { Component } from 'solid-js';
import { BadgeDemo } from '#src/demos/badge.tsx';
import { ButtonDemo, buttonScenario } from '#src/demos/button.tsx';
import {
	ButtonDefaultsProviderDemo,
	buttonDefaultsProviderScenario,
} from '#src/demos/button-defaults-provider.tsx';
import { CalloutDemo, calloutScenario } from '#src/demos/callout.tsx';
import { CheckboxDemo, checkboxScenario } from '#src/demos/checkbox.tsx';
import { EmptyStateDemo, emptyStateScenario } from '#src/demos/empty-state.tsx';
import {
	ErrorBoundaryViewDemo,
	errorBoundaryViewScenario,
} from '#src/demos/error-boundary-view.tsx';
import { FieldDemo, fieldScenario } from '#src/demos/field.tsx';
import { GlassPanelDemo, glassPanelScenario } from '#src/demos/glass-panel.tsx';
import { InputDemo, inputScenario } from '#src/demos/input.tsx';
import { LabelDemo, labelScenario } from '#src/demos/label.tsx';
import {
	NumberInputDemo,
	numberInputScenario,
} from '#src/demos/number-input.tsx';
import { RadioGroupDemo, radioGroupScenario } from '#src/demos/radio-group.tsx';
import { SelectDemo, selectScenario } from '#src/demos/select.tsx';
import { SeparatorDemo } from '#src/demos/separator.tsx';
import { SettingsDemo, settingsScenario } from '#src/demos/settings.tsx';
import {
	ShortcutRecorderDemo,
	shortcutRecorderScenario,
} from '#src/demos/shortcut-recorder.tsx';
import type { Shot } from '#src/demos/shot.ts';
import { StatusDemo, statusScenario } from '#src/demos/status.tsx';
import { TextDemo } from '#src/demos/text.tsx';
import { TokensDemo, tokensScenario } from '#src/demos/tokens.tsx';

export interface Demo {
	name: string;
	component: Component;
	/** Steps run after `initial` is captured in both schemes, driving the offscreen renderer. Omitted when the demo has no state beyond what `initial` shows. */
	scenario?: (shot: Shot) => Promise<void>;
}

export const demos: readonly Demo[] = [
	{ name: 'tokens', component: TokensDemo, scenario: tokensScenario },
	{ name: 'text', component: TextDemo },
	{ name: 'separator', component: SeparatorDemo },
	{ name: 'label', component: LabelDemo, scenario: labelScenario },
	{ name: 'badge', component: BadgeDemo },
	{ name: 'status', component: StatusDemo, scenario: statusScenario },
	{ name: 'button', component: ButtonDemo, scenario: buttonScenario },
	{
		name: 'button-defaults-provider',
		component: ButtonDefaultsProviderDemo,
		scenario: buttonDefaultsProviderScenario,
	},
	{ name: 'callout', component: CalloutDemo, scenario: calloutScenario },
	{
		name: 'empty-state',
		component: EmptyStateDemo,
		scenario: emptyStateScenario,
	},
	{
		name: 'error-boundary-view',
		component: ErrorBoundaryViewDemo,
		scenario: errorBoundaryViewScenario,
	},
	{
		name: 'glass-panel',
		component: GlassPanelDemo,
		scenario: glassPanelScenario,
	},
	{ name: 'checkbox', component: CheckboxDemo, scenario: checkboxScenario },
	{ name: 'field', component: FieldDemo, scenario: fieldScenario },
	{ name: 'input', component: InputDemo, scenario: inputScenario },
	{
		name: 'number-input',
		component: NumberInputDemo,
		scenario: numberInputScenario,
	},
	{
		name: 'shortcut-recorder',
		component: ShortcutRecorderDemo,
		scenario: shortcutRecorderScenario,
	},
	{ name: 'settings', component: SettingsDemo, scenario: settingsScenario },
	{ name: 'select', component: SelectDemo, scenario: selectScenario },
	{
		name: 'radio-group',
		component: RadioGroupDemo,
		scenario: radioGroupScenario,
	},
];
