import {
	applyColorScheme,
	Button,
	ColorSchemeProvider,
	ContextMenuHost,
	followSystemColorScheme,
	Text,
	TooltipProvider,
} from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createSignal, For, Show } from 'solid-js';
import { type Demo, demos } from '#src/demos/index.ts';

export const WINDOW_TITLE = 'ghia-swiftui';

const schemeChoices = [
	{ name: 'system', label: 'System', apply: followSystemColorScheme },
	{ name: 'light', label: 'Light', apply: () => applyColorScheme(false) },
	{ name: 'dark', label: 'Dark', apply: () => applyColorScheme(true) },
] as const;

export function App(props: { initial?: string }) {
	const initial = props.initial ?? demos[0]?.name;
	if (initial === undefined) throw new Error('No demos registered');
	const [selected, setSelected] = createSignal(initial);
	const [scheme, setScheme] = createSignal<string>('system');
	const current = () => {
		const demo = demos.find((candidate) => candidate.name === selected());
		if (demo === undefined) throw new Error(`Unknown demo: ${selected()}`);
		return demo;
	};
	return (
		<ColorSchemeProvider>
			<TooltipProvider>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						position: 'fixed',
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
						backgroundColor: semanticColors.backgroundSolid,
					}}
				>
					<div
						testId="nav"
						style={{
							display: 'flex',
							flexDirection: 'column',
							width: 200,
							flexShrink: 0,
							padding: 8,
							gap: 2,
							borderRightWidth: 1,
							borderStyle: 'solid',
							borderColor: semanticColors.borderSecondary,
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								flexGrow: 1,
								gap: 2,
								overflow: 'auto',
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
											cursor: 'default',
											backgroundColor:
												selected() === demo.name
													? semanticColors.surfaceListSelection
													: 'transparent',
											hover: {
												backgroundColor:
													selected() === demo.name
														? semanticColors.surfaceListSelection
														: semanticColors.surfaceListHover,
											},
										}}
									>
										<Text>{demo.name}</Text>
									</div>
								)}
							</For>
						</div>
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								gap: 4,
								paddingTop: 8,
							}}
						>
							<For each={schemeChoices}>
								{(choice) => (
									<Button
										testId={`scheme-${choice.name}`}
										size="small"
										radius="rounded"
										variant={scheme() === choice.name ? 'accent' : 'filled'}
										onClick={() => {
											setScheme(choice.name);
											choice.apply();
										}}
										style={{ paddingInline: 6, fontSize: 11 }}
									>
										{choice.label}
									</Button>
								)}
							</For>
						</div>
					</div>
					<div style={{ flexGrow: 1, minWidth: 0 }}>
						<Show when={current()} keyed>
							{(demo: Demo) => <demo.component />}
						</Show>
					</div>
				</div>
				<ContextMenuHost />
			</TooltipProvider>
		</ColorSchemeProvider>
	);
}
