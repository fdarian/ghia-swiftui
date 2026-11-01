import { CheckboxSpike } from 'ghia-swiftui';
import { createSignal } from 'solid-js';
import type { Shot } from '#src/demos/shot.ts';

export function CheckboxDemo() {
	const [checked, setChecked] = createSignal(false);
	return (
		<CheckboxSpike
			label="Enable notifications"
			checked={checked()}
			onCheckedChange={setChecked}
		/>
	);
}

export async function checkboxScenario(shot: Shot) {
	shot.expectChecked('checkbox-spike', false);
	await shot.click('checkbox-spike');
	shot.expectChecked('checkbox-spike', true);
	shot.capture('checked');
}
