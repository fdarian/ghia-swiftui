import { type Accessor, onMount, Show } from 'solid-js';
import { Button } from '#src/components/button.tsx';
import { Text } from '#src/components/text.tsx';

/**
 * Full-window fallback for an uncaught render error (use it as
 * `ErrorBoundary`'s `fallback`). Shows the raw error message plus a Reload
 * action when `reset` is given. There is no Mac-App-Store vs. editable-app
 * branching and no "Fix with Agent" deep link, as in syne.
 */
export function ErrorBoundaryView(props: {
	error: unknown;
	/** Solid's `ErrorBoundary` reset: re-renders the failed subtree. */
	reset?: () => void;
}) {
	onMount(() => {
		console.error('[ErrorBoundaryView] Uncaught error:', props.error);
	});
	return (
		<div
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				width: '100%',
				height: '100%',
				gap: 8,
				padding: 32,
				textAlign: 'center',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: 52,
					appRegion: 'drag',
				}}
			/>
			<Text as="p" variant="heading1">
				Something went wrong
			</Text>
			<Show
				when={props.error instanceof Error ? props.error : undefined}
				fallback={
					<Text as="p" color="secondary" style={{ maxWidth: 480 }}>
						An unexpected error occurred.
					</Text>
				}
			>
				{(error: Accessor<Error>) => (
					<Text
						as="pre"
						variant="smallMono"
						color="quaternary"
						style={{ maxWidth: '80%', whiteSpace: 'pre-wrap', marginTop: 4 }}
					>
						{error().message}
					</Text>
				)}
			</Show>
			<Show when={props.reset !== undefined}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
						marginTop: 16,
					}}
				>
					<Button variant="filled" onClick={() => props.reset?.()}>
						Reload
					</Button>
				</div>
			</Show>
		</div>
	);
}
