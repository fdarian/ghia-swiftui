import { Button, ErrorBoundaryView, Text } from 'ghia-swiftui';
import { createSignal, ErrorBoundary, type JSX } from 'solid-js';
import { Cell, Page, Row, Section, Surface } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

function Pane(props: { children: JSX.Element }) {
	return (
		<Surface style={{ width: 440, height: 260, padding: 0 }}>
			{props.children}
		</Surface>
	);
}

function Recoverable(props: { thrown: () => unknown; armed: boolean }) {
	if (props.armed) throw props.thrown();
	return <Text>Rendered without error.</Text>;
}

export function ErrorBoundaryViewDemo() {
	const [armed, setArmed] = createSignal(false);
	return (
		<Page title="ErrorBoundaryView">
			<Section title="Used as an ErrorBoundary fallback">
				<Row>
					<Cell label="Error: shows the message, Reload resets the boundary">
						<Pane>
							<ErrorBoundary
								fallback={(error: unknown, reset: () => void) => (
									<ErrorBoundaryView
										error={error}
										reset={() => {
											setArmed(false);
											reset();
										}}
									/>
								)}
							>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 12,
										height: '100%',
									}}
								>
									<Recoverable
										armed={armed()}
										thrown={() =>
											new Error('Cannot read properties of undefined')
										}
									/>
									<Button testId="error-throw" onClick={() => setArmed(true)}>
										Throw an error
									</Button>
								</div>
							</ErrorBoundary>
						</Pane>
					</Cell>
					<Cell label="Not an Error, no reset: generic message, no button">
						<Pane>
							<ErrorBoundary
								fallback={(error: unknown) => (
									<ErrorBoundaryView error={error} />
								)}
							>
								<Recoverable armed thrown={() => 'a thrown string'} />
							</ErrorBoundary>
						</Pane>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function errorBoundaryViewScenario(shot: Shot) {
	shot.expectPresent('error-throw');
	await shot.click('error-throw');
	shot.expectAbsent('error-throw');
	await shot.capture('thrown');
}
