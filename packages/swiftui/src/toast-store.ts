import { createSignal, type JSX } from 'solid-js';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastId = string | number;

export interface ToastAction {
	label: string;
	onClick?: () => void;
}

export interface ToastEntry {
	id: ToastId;
	/** Which icon the toast wears; none for a plain message. */
	type: ToastType | undefined;
	title: JSX.Element;
	description: JSX.Element | undefined;
	actions: readonly ToastAction[];
	/** In ms; `Number.POSITIVE_INFINITY` never closes by itself. */
	duration: number;
	/** Draws the whole toast in place of the standard one. */
	custom: ((id: ToastId) => JSX.Element) | undefined;
	/** The toast was closed by `dismiss` or its close button. */
	onDismiss: ((id: ToastId) => void) | undefined;
	/** The toast's time ran out. */
	onAutoClose: ((id: ToastId) => void) | undefined;
}

/** Sonner's default. */
export const DEFAULT_DURATION = 4000;

const [entries, setEntries] = createSignal<readonly ToastEntry[]>([]);

/** The open toasts, oldest first. */
export const toasts = entries;

interface Timer {
	handle: ReturnType<typeof setTimeout> | undefined;
	remaining: number;
	startedAt: number | undefined;
}

const timers = new Map<ToastId, Timer>();
let paused = false;
let lastId = 0;

function runTimer(id: ToastId, timer: Timer) {
	if (timer.remaining === Number.POSITIVE_INFINITY) return;
	timer.startedAt = performance.now();
	timer.handle = setTimeout(() => {
		const entry = entries().find((candidate) => candidate.id === id);
		remove(id);
		entry?.onAutoClose?.(id);
	}, timer.remaining);
}

function startTimer(id: ToastId, duration: number) {
	const previous = timers.get(id);
	clearTimeout(previous?.handle);
	const timer: Timer = {
		handle: undefined,
		remaining: duration,
		startedAt: undefined,
	};
	timers.set(id, timer);
	if (!paused) runTimer(id, timer);
}

function remove(id: ToastId) {
	clearTimeout(timers.get(id)?.handle);
	timers.delete(id);
	setEntries(entries().filter((entry) => entry.id !== id));
}

export interface NewToast extends Omit<ToastEntry, 'id'> {
	/** Reuses an open toast with this id in place, as sonner does. */
	id: ToastId | undefined;
}

export function addToast(toast: NewToast): ToastId {
	const id = toast.id ?? ++lastId;
	const entry: ToastEntry = { ...toast, id };
	const existing = entries().some((candidate) => candidate.id === id);
	setEntries(
		existing
			? entries().map((candidate) => (candidate.id === id ? entry : candidate))
			: [...entries(), entry],
	);
	startTimer(id, entry.duration);
	return id;
}

export type ToastPatch = Partial<
	Pick<ToastEntry, 'type' | 'title' | 'description' | 'duration'>
>;

/** Changes an open toast and restarts its timer; a toast already gone is left alone. */
export function updateToast(id: ToastId, patch: ToastPatch) {
	const current = entries().find((entry) => entry.id === id);
	if (current === undefined) return;
	const next = { ...current, ...patch };
	setEntries(entries().map((entry) => (entry.id === id ? next : entry)));
	startTimer(id, next.duration);
}

/** Closes one toast, or every toast with no id. */
export function dismissToast(id?: ToastId) {
	const closing =
		id === undefined ? entries() : entries().filter((entry) => entry.id === id);
	for (const entry of closing) {
		remove(entry.id);
		entry.onDismiss?.(entry.id);
	}
}

/** Holds every toast's remaining time while the pointer is on the stack. */
export function pauseToasts() {
	if (paused) return;
	paused = true;
	const now = performance.now();
	for (const timer of timers.values()) {
		if (timer.startedAt === undefined) continue;
		clearTimeout(timer.handle);
		timer.remaining -= now - timer.startedAt;
		timer.startedAt = undefined;
	}
}

export function resumeToasts() {
	if (!paused) return;
	paused = false;
	for (const [id, timer] of timers) runTimer(id, timer);
}
