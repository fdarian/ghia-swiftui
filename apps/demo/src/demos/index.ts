import type { Component } from 'solid-js';
import { BadgeDemo } from '#src/demos/badge.tsx';
import { ButtonDemo, buttonScenario } from '#src/demos/button.tsx';
import {
	ButtonDefaultsProviderDemo,
	buttonDefaultsProviderScenario,
} from '#src/demos/button-defaults-provider.tsx';
import { CalloutDemo, calloutScenario } from '#src/demos/callout.tsx';
import { CheckboxDemo, checkboxScenario } from '#src/demos/checkbox.tsx';
import {
	ContextMenuDemo,
	contextMenuScenario,
} from '#src/demos/context-menu.tsx';
import { EmptyStateDemo, emptyStateScenario } from '#src/demos/empty-state.tsx';
import {
	ErrorBoundaryViewDemo,
	errorBoundaryViewScenario,
} from '#src/demos/error-boundary-view.tsx';
import { FieldDemo, fieldScenario } from '#src/demos/field.tsx';
import { GlassPanelDemo, glassPanelScenario } from '#src/demos/glass-panel.tsx';
import { InputDemo, inputScenario } from '#src/demos/input.tsx';
import { LabelDemo, labelScenario } from '#src/demos/label.tsx';
import { ListDemo, listScenario } from '#src/demos/list.tsx';
import { MenuDemo, menuScenario } from '#src/demos/menu.tsx';
import {
	NumberInputDemo,
	numberInputScenario,
} from '#src/demos/number-input.tsx';
import { PanelDemo, panelScenario } from '#src/demos/panel.tsx';
import { RadioGroupDemo, radioGroupScenario } from '#src/demos/radio-group.tsx';
import { ScrollAreaDemo, scrollAreaScenario } from '#src/demos/scroll-area.tsx';
import { SelectDemo, selectScenario } from '#src/demos/select.tsx';
import { SeparatorDemo } from '#src/demos/separator.tsx';
import { SettingsDemo, settingsScenario } from '#src/demos/settings.tsx';
import {
	ShortcutRecorderDemo,
	shortcutRecorderScenario,
} from '#src/demos/shortcut-recorder.tsx';
import type { Shot } from '#src/demos/shot.ts';
import { SidebarDemo, sidebarScenario } from '#src/demos/sidebar.tsx';
import { SplitViewDemo, splitViewScenario } from '#src/demos/split-view.tsx';
import { StatusDemo, statusScenario } from '#src/demos/status.tsx';
import {
	SyneMainWindowDemo,
	syneMainWindowScenario,
} from '#src/demos/syne-main-window.tsx';
import { TextDemo } from '#src/demos/text.tsx';
import { ToastDemo, toastScenario } from '#src/demos/toast.tsx';
import { TokensDemo, tokensScenario } from '#src/demos/tokens.tsx';
import { ToolbarDemo, toolbarScenario } from '#src/demos/toolbar.tsx';
import { TooltipDemo, tooltipScenario } from '#src/demos/tooltip.tsx';

export interface Demo {
	name: string;
	/** The sidebar section the demo is listed under. */
	group: string;
	component: Component;
	/** Steps run after `initial` is captured in both schemes, driving the offscreen renderer. Omitted when the demo has no state beyond what `initial` shows. */
	scenario?: (shot: Shot) => Promise<void>;
}

const entries: Omit<Demo, 'group'>[] = [
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
	{ name: 'tooltip', component: TooltipDemo, scenario: tooltipScenario },
	{ name: 'menu', component: MenuDemo, scenario: menuScenario },
	{ name: 'toast', component: ToastDemo, scenario: toastScenario },
	{
		name: 'context-menu',
		component: ContextMenuDemo,
		scenario: contextMenuScenario,
	},
	{
		name: 'radio-group',
		component: RadioGroupDemo,
		scenario: radioGroupScenario,
	},
	{
		name: 'scroll-area',
		component: ScrollAreaDemo,
		scenario: scrollAreaScenario,
	},
	{ name: 'list', component: ListDemo, scenario: listScenario },
	{ name: 'panel', component: PanelDemo, scenario: panelScenario },
	{ name: 'sidebar', component: SidebarDemo, scenario: sidebarScenario },
	{ name: 'split-view', component: SplitViewDemo, scenario: splitViewScenario },
	{ name: 'toolbar', component: ToolbarDemo, scenario: toolbarScenario },
	{
		name: 'syne-main-window',
		component: SyneMainWindowDemo,
		scenario: syneMainWindowScenario,
	},
];

/** Sidebar sections, in order, and the demos each lists. A demo in none of them is a mistake. */
const groups: Record<string, readonly string[]> = {
	Foundations: ['tokens', 'text', 'separator', 'label', 'badge', 'status'],
	Actions: ['button', 'button-defaults-provider'],
	Feedback: ['callout', 'empty-state', 'error-boundary-view', 'toast'],
	Surfaces: ['glass-panel'],
	Forms: [
		'checkbox',
		'radio-group',
		'field',
		'input',
		'number-input',
		'shortcut-recorder',
		'select',
		'settings',
	],
	Overlays: ['tooltip', 'menu', 'context-menu'],
	Layout: [
		'scroll-area',
		'list',
		'panel',
		'sidebar',
		'split-view',
		'toolbar',
		'syne-main-window',
	],
};

function groupOf(name: string): string {
	for (const [group, names] of Object.entries(groups)) {
		if (names.includes(name)) return group;
	}
	throw new Error(`Demo ${name} is in no sidebar group`);
}

export const demos: readonly Demo[] = Object.values(groups)
	.flat()
	.map((name) => {
		const entry = entries.find((candidate) => candidate.name === name);
		if (entry === undefined)
			throw new Error(`Group lists unknown demo ${name}`);
		return { ...entry, group: groupOf(name) };
	});

if (demos.length !== entries.length) {
	throw new Error('A demo is registered but in no sidebar group');
}
