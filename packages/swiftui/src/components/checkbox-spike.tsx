import { createCheckboxRoot } from 'base-ui-solid-gpuix/checkbox';
import { createCheckboxGroup } from 'base-ui-solid-gpuix/checkbox-group';

/** Slice 1 integration probe, replaced by the real Checkbox in slice 3: proves base-ui source resolves and runs under the alias. */
export function CheckboxSpike(props: {
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	const group = createCheckboxGroup();
	const item = createCheckboxRoot(group, {
		index: 0,
		label: () => props.label,
		checked: () => props.checked,
		onCheckedChange: (checked) => props.onCheckedChange(checked),
	});
	return (
		<div {...group.groupProps}>
			<div
				{...item.rowProps}
				ref={(row) => item.register(row)}
				testId="checkbox-spike"
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 8,
					cursor: 'pointer',
				}}
			>
				<div
					style={{
						width: 16,
						height: 16,
						borderRadius: 4,
						borderStyle: 'solid',
						borderWidth: 1,
						borderColor: props.checked ? '#138af2' : '#8e8e93',
						backgroundColor: props.checked ? '#138af2' : 'transparent',
					}}
				/>
				<text style={{ color: '#ffffff', fontSize: 13 }}>{props.label}</text>
			</div>
		</div>
	);
}
