import { CheckboxSpike } from 'ghia-swiftui';
import { createSignal } from 'solid-js';

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
