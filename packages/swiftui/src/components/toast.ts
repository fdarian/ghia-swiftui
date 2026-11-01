import type { JSX } from 'solid-js';
import {
	addToast,
	DEFAULT_DURATION,
	dismissToast,
	type ToastAction,
	type ToastId,
	type ToastType,
	updateToast,
} from '#src/toast-store.ts';

/** The options of sonner's `ExternalToast` that this toaster has. */
export interface ToastOptions {
	/** Reusing the id of an open toast updates it in place. */
	id?: ToastId;
	/** In ms; `Number.POSITIVE_INFINITY` never closes by itself. Defaults to 4000, and to never for `toast.loading`. */
	duration?: number;
	description?: JSX.Element;
	action?: ToastAction;
	cancel?: ToastAction;
	/** The toast was closed by `toast.dismiss` or its close button. */
	onDismiss?: (id: ToastId) => void;
	/** The toast's time ran out. */
	onAutoClose?: (id: ToastId) => void;
}

function createToast(
	type: ToastType | undefined,
	message: JSX.Element,
	options?: ToastOptions,
) {
	return addToast({
		id: options?.id,
		type,
		title: message,
		description: options?.description,
		actions: [options?.action, options?.cancel].filter(
			(action): action is ToastAction => action !== undefined,
		),
		duration:
			options?.duration ??
			(type === 'loading' ? Number.POSITIVE_INFINITY : DEFAULT_DURATION),
		custom: undefined,
		onDismiss: options?.onDismiss,
		onAutoClose: options?.onAutoClose,
	});
}

function custom(
	render: (id: ToastId) => JSX.Element,
	options?: Pick<ToastOptions, 'id' | 'duration' | 'onDismiss' | 'onAutoClose'>,
) {
	return addToast({
		id: options?.id,
		type: undefined,
		title: undefined,
		description: undefined,
		actions: [],
		duration: options?.duration ?? DEFAULT_DURATION,
		custom: render,
		onDismiss: options?.onDismiss,
		onAutoClose: options?.onAutoClose,
	});
}

interface PromiseResult {
	message: JSX.Element;
	description?: JSX.Element;
}

/**
 * A static state is text: `JSX.Element` includes `Node`, which accepts a
 * function too, so with it in the union `success: (data) => ...` would lose
 * its parameter type. A node is returned from a function instead.
 */
type PromiseStateResult<Data> =
	| string
	| number
	| PromiseResult
	| ((
			data: Data,
	  ) => JSX.Element | PromiseResult | Promise<JSX.Element | PromiseResult>);

export interface PromiseOptions<Data>
	extends Omit<ToastOptions, 'description'> {
	loading?: JSX.Element;
	success?: PromiseStateResult<Data>;
	error?: PromiseStateResult<unknown>;
	finally?: () => void | Promise<void>;
}

function resolvePromiseResult(
	result: JSX.Element | PromiseResult,
): PromiseResult {
	if (typeof result === 'object' && result !== null && 'message' in result) {
		return result as PromiseResult;
	}
	return { message: result };
}

async function settle<Data>(
	id: ToastId,
	type: 'success' | 'error',
	state: PromiseStateResult<Data> | undefined,
	value: Data,
	duration: number | undefined,
) {
	if (state === undefined) {
		dismissToast(id);
		return;
	}
	const result =
		typeof state === 'function'
			? await (state as (data: Data) => JSX.Element | PromiseResult)(value)
			: state;
	const resolved = resolvePromiseResult(result);
	updateToast(id, {
		type,
		title: resolved.message,
		description: resolved.description,
		duration: duration ?? DEFAULT_DURATION,
	});
}

/** Shows a loading toast and turns it into a success or an error when the promise settles. Returns the toast's id. */
function toastPromise<Data>(
	promise: Promise<Data> | (() => Promise<Data>),
	options: PromiseOptions<Data>,
): ToastId {
	const pending = typeof promise === 'function' ? promise() : promise;
	const id = addToast({
		id: options.id,
		type: 'loading',
		title: options.loading ?? 'Loading...',
		description: undefined,
		actions: [],
		duration: Number.POSITIVE_INFINITY,
		custom: undefined,
		onDismiss: options.onDismiss,
		onAutoClose: options.onAutoClose,
	});
	pending
		.then(
			(data) => settle(id, 'success', options.success, data, options.duration),
			(reason: unknown) =>
				settle(id, 'error', options.error, reason, options.duration),
		)
		.finally(options.finally);
	return id;
}

/** Toast trigger, mirroring `sonner`'s `toast()` shape. */
export const toast = Object.assign(
	(message: JSX.Element, options?: ToastOptions) =>
		createToast('info', message, options),
	{
		success: (message: JSX.Element, options?: ToastOptions) =>
			createToast('success', message, options),
		error: (message: JSX.Element, options?: ToastOptions) =>
			createToast('error', message, options),
		warning: (message: JSX.Element, options?: ToastOptions) =>
			createToast('warning', message, options),
		info: (message: JSX.Element, options?: ToastOptions) =>
			createToast('info', message, options),
		loading: (message: JSX.Element, options?: ToastOptions) =>
			createToast('loading', message, options),
		promise: toastPromise,
		dismiss: dismissToast,
		custom,
		message: (message: JSX.Element, options?: ToastOptions) =>
			createToast(undefined, message, options),
	},
);
