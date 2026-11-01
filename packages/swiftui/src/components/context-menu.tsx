import { createSignal, For, onCleanup, Show } from 'solid-js';
import * as Menu from '#src/components/menu.tsx';

export type ContextMenuItem = {
	/** Stable id returned when this item is chosen. */
	id: string;
	label: string;
	disabled?: boolean;
};

export type ShowContextMenuOptions = {
	items: ContextMenuItem[];
	/** Cursor position, in window pixels: a mouse event's `clientX`/`clientY`. */
	x: number;
	y: number;
};

interface ContextMenuRequest extends ShowContextMenuOptions {
	resolve: (id: string | null) => void;
}

/** How long the popup keeps its place after a pick, for its exit fade. */
const EXIT_MS = 200;

let present: ((request: ContextMenuRequest) => void) | undefined;

/**
 * Opens the menu at `x`, `y` and resolves with the chosen item's `id`, or
 * `null` if it was dismissed without a choice. Needs a `ContextMenuHost`
 * mounted somewhere in the app: there is no system menu to fall back on.
 */
export async function showContextMenu(
	options: ShowContextMenuOptions,
): Promise<string | null> {
	if (present === undefined) {
		throw new Error(
			'showContextMenu needs a <ContextMenuHost> rendered by the app',
		);
	}
	const show = present;
	return new Promise((resolve) => show({ ...options, resolve }));
}

/**
 * Where `showContextMenu`'s popup is drawn. Render it once, near the root of
 * the app, after the content it should sit above.
 */
export function ContextMenuHost() {
	if (present !== undefined) {
		throw new Error('Only one <ContextMenuHost> may be mounted');
	}
	const [request, setRequest] = createSignal<ContextMenuRequest>();
	const [open, setOpen] = createSignal(false);
	let clearTimer: ReturnType<typeof setTimeout> | undefined;

	const finish = (id: string | null) => {
		const current = request();
		if (current === undefined || !open()) return;
		setOpen(false);
		current.resolve(id);
		clearTimer = setTimeout(() => setRequest(undefined), EXIT_MS);
	};
	present = (next) => {
		// A second request while one is open dismisses the first.
		if (open()) finish(null);
		clearTimeout(clearTimer);
		setRequest(next);
		setOpen(true);
	};
	onCleanup(() => {
		clearTimeout(clearTimer);
		present = undefined;
		if (open()) request()?.resolve(null);
	});

	return (
		<Show when={request()} keyed>
			{(current: ContextMenuRequest) => (
				<div
					style={{
						position: 'fixed',
						left: current.x,
						top: current.y,
						width: 0,
						height: 0,
					}}
				>
					<Menu.Root
						open={open()}
						onOpenChange={(next) => !next && finish(null)}
					>
						<Menu.Portal>
							<Menu.Positioner side="bottom" align="start">
								<Menu.Popup testId="context-menu" highlightOnOpen={false}>
									<For each={current.items}>
										{(item) => (
											<Menu.Item
												testId={`context-menu-${item.id}`}
												label={item.label}
												disabled={item.disabled}
												onClick={() => finish(item.id)}
											>
												{item.label}
											</Menu.Item>
										)}
									</For>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>
				</div>
			)}
		</Show>
	);
}
