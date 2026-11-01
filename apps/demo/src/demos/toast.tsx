import { Button, Text, toast } from 'ghia-swiftui';
import { semanticColors } from 'ghia-swiftui/tokens/semantic-colors';
import { createSignal } from 'solid-js';
import { Cell, Page, Row, Section } from '#src/demo-kit.tsx';
import type { Shot } from '#src/demos/shot.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ToastDemo() {
	const [undone, setUndone] = createSignal(false);
	const [events, setEvents] = createSignal('');
	return (
		<Page title="Toast">
			<Section title="Types (4s each, loading never closes)">
				<Row gap={8}>
					<Button
						testId="fire-success"
						onClick={() =>
							toast.success('Saved to your library', { id: 'success' })
						}
					>
						Success
					</Button>
					<Button
						testId="fire-error"
						onClick={() =>
							toast.error('Could not reach Last.fm', { id: 'error' })
						}
					>
						Error
					</Button>
					<Button
						testId="fire-warning"
						onClick={() =>
							toast.warning('Connect your account first', { id: 'warning' })
						}
					>
						Warning
					</Button>
					<Button
						testId="fire-info"
						onClick={() => toast('Track skipped', { id: 'info' })}
					>
						Info
					</Button>
					<Button
						testId="fire-loading"
						onClick={() =>
							toast.loading('Syncing scrobbles', { id: 'loading' })
						}
					>
						Loading
					</Button>
					<Button
						testId="fire-message"
						onClick={() =>
							toast.message('A plain message, no icon', { id: 'message' })
						}
					>
						Message
					</Button>
				</Row>
			</Section>
			<Section title="Description, action, cancel, custom">
				<Row gap={8}>
					<Button
						testId="fire-description"
						onClick={() =>
							toast.success('Disconnected from Last.fm', {
								id: 'description',
								description: 'Your history stays on this Mac.',
							})
						}
					>
						With description
					</Button>
					<Button
						testId="fire-action"
						onClick={() =>
							toast('Removed 3 tracks', {
								id: 'action',
								duration: Number.POSITIVE_INFINITY,
								action: { label: 'Undo', onClick: () => setUndone(true) },
								cancel: { label: 'Keep' },
								onDismiss: () => setEvents(`${events()} dismissed`),
							})
						}
					>
						With actions
					</Button>
					<Button
						testId="fire-custom"
						onClick={() =>
							toast.custom(
								(id) => (
									<div
										testId={`toast-custom-${id}`}
										style={{
											padding: 16,
											borderRadius: 12,
											backgroundColor: semanticColors.surfacePopover,
											borderWidth: 1,
											borderStyle: 'solid',
											borderColor: semanticColors.borderPrimary,
										}}
									>
										<Text variant="strong">Custom toast {id}</Text>
									</div>
								),
								{ id: 'custom' },
							)
						}
					>
						Custom
					</Button>
					<Button
						testId="fire-dismiss-all"
						variant="muted"
						onClick={() => toast.dismiss()}
					>
						Dismiss all
					</Button>
				</Row>
			</Section>
			<Section title="Promise: loading, then success or error">
				<Row gap={8}>
					<Button
						testId="fire-promise"
						onClick={() =>
							toast.promise(
								wait(1200).then(() => 'Radiohead'),
								{
									id: 'promise',
									loading: 'Importing history',
									success: (artist) => ({
										message: 'Imported your history',
										description: `Latest scrobble: ${artist}`,
									}),
									error: 'Import failed',
								},
							)
						}
					>
						Resolves
					</Button>
					<Button
						testId="fire-promise-error"
						onClick={() =>
							toast.promise(
								() =>
									wait(1200).then(() => {
										throw new Error('offline');
									}),
								{
									id: 'promise-error',
									loading: 'Importing history',
									success: 'Imported your history',
									error: (reason) =>
										`Import failed: ${(reason as Error).message}`,
								},
							)
						}
					>
						Rejects
					</Button>
				</Row>
			</Section>
			<Section title="State">
				<Row gap={24}>
					<Cell label="undo clicked">
						<Text testId="toast-undone">{undone() ? 'yes' : 'no'}</Text>
					</Cell>
					<Cell label="onDismiss">
						<Text testId="toast-events">
							{events() === '' ? 'none' : events()}
						</Text>
					</Cell>
				</Row>
			</Section>
		</Page>
	);
}

export async function toastScenario(shot: Shot) {
	await shot.click('fire-success');
	await shot.click('fire-error');
	await shot.click('fire-warning');
	shot.expectPresent('toast-success');
	shot.expectPresent('toast-warning');
	await shot.capture('stack');

	// The pointer on a toast holds every timer: 5s later all three are still open.
	await shot.hover('toast-success');
	await shot.capture('hover');
	await shot.wait(5000);
	shot.expectPresent('toast-success');
	shot.expectPresent('toast-error');
	shot.expectPresent('toast-warning');
	// Leaving lets the rest of their 4s run out.
	await shot.leave();
	await shot.wait(4500);
	shot.expectAbsent('toast-success');
	shot.expectAbsent('toast-error');
	shot.expectAbsent('toast-warning');

	await shot.click('fire-promise');
	await shot.wait(200);
	shot.expectPresent('toast-promise');
	await shot.capture('promise-loading');
	await shot.wait(1500);
	await shot.capture('promise-success');
	await shot.click('fire-dismiss-all');
	await shot.wait(500);

	await shot.click('fire-promise-error');
	await shot.wait(1900);
	await shot.capture('promise-error');
	await shot.click('fire-dismiss-all');
	await shot.wait(500);

	// The dismiss button appears under the pointer and closes the toast.
	await shot.click('fire-description');
	await shot.hover('toast-description');
	await shot.capture('description');
	await shot.click('toast-description-dismiss');
	await shot.wait(500);
	shot.expectAbsent('toast-description');

	await shot.click('fire-action');
	await shot.capture('actions');
	await shot.click('toast-action-action-Undo');
	await shot.wait(400);
	shot.expectText('toast-undone', 'yes');
	shot.expectAbsent('toast-action');
	await shot.click('fire-action');
	await shot.click('fire-message');
	await shot.click('fire-custom');
	await shot.click('fire-info');
	// Four are open; only the newest three show.
	shot.expectAbsent('toast-action');
	shot.expectPresent('toast-message');
	await shot.capture('limit');
	await shot.click('fire-dismiss-all');
	await shot.wait(500);
	shot.expectAbsent('toast-message');
	// The action's own pick dismissed the first, `Dismiss all` the second.
	shot.expectText('toast-events', ' dismissed dismissed');
}
