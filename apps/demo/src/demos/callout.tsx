import { Button, Callout, type CalloutColor, Icon } from 'ghia-swiftui';
import { createSignal, For, Show } from 'solid-js';
import { Page, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const colors: readonly CalloutColor[] = [
	'primary',
	'secondary',
	'blue',
	'green',
	'yellow',
	'orange',
	'red',
	'purple',
	'magenta',
];

export function CalloutDemo() {
	const [visible, setVisible] = createSignal(true);
	return (
		<Page title="Callout">
			<Section title="Simple (text only, centred)">
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
						maxWidth: 520,
					}}
				>
					<For each={colors}>
						{(color) => <Callout color={color}>{color} callout</Callout>}
					</For>
				</div>
			</Section>
			<Section title="Props API: icon, actions, onDismiss">
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
						maxWidth: 520,
					}}
				>
					<Callout
						color="blue"
						icon={<Icon name="info" />}
						actions={
							<Button size="small" variant="accent">
								Review
							</Button>
						}
					>
						A new version is available.
					</Callout>
					<Show when={visible()}>
						<Callout
							testId="callout-dismissible"
							color="orange"
							icon={<Icon name="triangle-alert" />}
							dismissLabel="Dismiss warning"
							onDismiss={() => setVisible(false)}
						>
							Storage is almost full.
						</Callout>
					</Show>
					<Callout
						color="red"
						icon={<Icon name="circle-alert" />}
						onDismiss={() => {}}
					>
						The sync failed. Check your connection and try again.
					</Callout>
				</div>
			</Section>
			<Section title="Composed API: Callout.Icon, .Text, .Actions, .Close">
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
						maxWidth: 520,
					}}
				>
					<Callout color="green">
						<Callout.Icon>
							<Icon name="circle-check" />
						</Callout.Icon>
						<Callout.Text>Everything is up to date.</Callout.Text>
						<Callout.Actions>
							<Button size="small">Details</Button>
						</Callout.Actions>
						<Callout.Close />
					</Callout>
					<Callout color="secondary">
						<Callout.Text>Text only, left aligned.</Callout.Text>
					</Callout>
				</div>
			</Section>
		</Page>
	);
}

export async function calloutScenario(shot: Shot) {
	shot.expectPresent('callout-dismissible');
	await shot.clickEnd('callout-dismissible');
	shot.expectAbsent('callout-dismissible');
	await shot.capture('dismissed');
}
