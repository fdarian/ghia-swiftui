import { createSignal, For, Show } from 'solid-js';
import { type Demo, demos } from '#src/demos/index.ts';

export const WINDOW_TITLE = 'ghia-swiftui';

export function App(props: { initial?: string }) {
	const initial = props.initial ?? demos[0]?.name;
	if (initial === undefined) throw new Error('No demos registered');
	const [selected, setSelected] = createSignal(initial);
	const current = () => {
		const demo = demos.find((candidate) => candidate.name === selected());
		if (demo === undefined) throw new Error(`Unknown demo: ${selected()}`);
		return demo;
	};
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				width: '100%',
				height: '100%',
				backgroundColor: '#1e1e1e',
			}}
		>
			<div
				testId="nav"
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: 200,
					padding: 8,
					gap: 2,
					borderRightWidth: 1,
					borderStyle: 'solid',
					borderColor: '#38383a',
				}}
			>
				<For each={demos}>
					{(demo) => (
						<div
							testId={`nav-${demo.name}`}
							onClick={() => setSelected(demo.name)}
							style={{
								padding: 6,
								borderRadius: 6,
								cursor: 'pointer',
								backgroundColor:
									selected() === demo.name ? '#ffffff22' : 'transparent',
							}}
						>
							<text style={{ color: '#ffffff', fontSize: 13 }}>
								{demo.name}
							</text>
						</div>
					)}
				</For>
			</div>
			<div style={{ flexGrow: 1, padding: 24 }}>
				<Show when={current()} keyed>
					{(demo: Demo) => <demo.component />}
				</Show>
			</div>
		</div>
	);
}
