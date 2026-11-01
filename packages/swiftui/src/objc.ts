import { dlopen, FFIType, type Pointer, ptr } from 'bun:ffi';

/*
 * The Objective-C runtime from JS with no addon and no build step: libobjc's
 * `objc_msgSend` declared once per argument shape. A CGRect or an NSColor
 * component list goes in as four `f64` arguments: on arm64 a struct of four
 * doubles is a homogeneous floating-point aggregate and is passed in d0-d3,
 * which is exactly four doubles. `objc_msgSend` cannot *return* such a struct
 * to bun:ffi (only d0 comes back), so a rect is read through NSInvocation
 * (`readRect`).
 *
 * Internal: NativeGlass and the demo's pixel capture are its only users.
 */

const LIBOBJC = '/usr/lib/libobjc.A.dylib';
const LIBSYSTEM = '/usr/lib/libSystem.B.dylib';
const APPKIT = '/System/Library/Frameworks/AppKit.framework/AppKit';

export type { Pointer };
export type Id = Pointer | null;
export type Argument =
	| Pointer
	| number
	| bigint
	| boolean
	| null
	| NodeJS.TypedArray;

/**
 * bun:ffi types a binding's result as the union of everything an FFIType could
 * return, so the real signature is restated once here.
 */
export function native<Args extends Argument[], Result>(
	library: string,
	name: string,
	args: FFIType[],
	returns: FFIType,
): (...call: Args) => Result {
	return dlopen(library, { [name]: { args, returns } }).symbols[
		name
	] as unknown as (...call: Args) => Result;
}

/** `objc_msgSend` with this argument shape: receiver, selector, then `args`. */
export function bind<Args extends Argument[], Result>(
	args: FFIType[],
	returns: FFIType,
) {
	return native<Args, Result>(LIBOBJC, 'objc_msgSend', args, returns);
}

// AppKit is loaded by the host window already; this makes sure for a script
// that has not opened one yet.
dlopen(APPKIT, { NSApplicationLoad: { args: [], returns: FFIType.bool } });

const P = FFIType.ptr;
const D = FFIType.f64;
const I = FFIType.i64;

const objcGetClass = native<[Buffer], Id>(
	LIBOBJC,
	'objc_getClass',
	[FFIType.cstring],
	P,
);
const selRegisterName = native<[Buffer], Id>(
	LIBOBJC,
	'sel_registerName',
	[FFIType.cstring],
	P,
);
const mainThreadFlag = native<[], number>(
	LIBSYSTEM,
	'pthread_main_np',
	[],
	FFIType.i32,
);

export const send = {
	object: bind<[Pointer, Pointer], Id>([P, P], P),
	void: bind<[Pointer, Pointer], void>([P, P], FFIType.void),
	objectWithObject: bind<[Pointer, Pointer, Id], Id>([P, P, P], P),
	voidWithObject: bind<[Pointer, Pointer, Id], void>([P, P, P], FFIType.void),
	voidWithInteger: bind<[Pointer, Pointer, number], void>(
		[P, P, I],
		FFIType.void,
	),
	voidWithDouble: bind<[Pointer, Pointer, number], void>(
		[P, P, D],
		FFIType.void,
	),
	objectWithFourDoubles: bind<
		[Pointer, Pointer, number, number, number, number],
		Id
	>([P, P, D, D, D, D], P),
};

const classCache = new Map<string, Pointer>();
const selectorCache = new Map<string, Pointer>();

/** The class, or null when this macOS does not have it. */
export function objcClass(name: string): Id {
	const cached = classCache.get(name);
	if (cached !== undefined) return cached;
	const found = objcGetClass(Buffer.from(`${name}\0`));
	if (found === null) return null;
	classCache.set(name, found);
	return found;
}

export function selector(name: string): Pointer {
	const cached = selectorCache.get(name);
	if (cached !== undefined) return cached;
	const registered = selRegisterName(Buffer.from(`${name}\0`));
	if (registered === null) throw new Error(`sel_registerName(${name}) failed`);
	selectorCache.set(name, registered);
	return registered;
}

export function required(value: Id, what: string): Pointer {
	if (value === null) throw new Error(`${what} returned nil`);
	return value;
}

export function requiredClass(name: string): Pointer {
	return required(objcClass(name), `objc_getClass(${name})`);
}

/** AppKit and the callbacks `<nativeview>` delivers run on the process's main thread. */
export function assertMainThread(what: string) {
	if (mainThreadFlag() !== 1) {
		throw new Error(`${what} must run on the main thread`);
	}
}

/** A CGRect-returning getter such as `bounds`, read through NSInvocation. */
export function readRect(target: Pointer, name: string): Float64Array {
	const sel = selector(name);
	const signature = required(
		send.objectWithObject(target, selector('methodSignatureForSelector:'), sel),
		`methodSignatureForSelector:(${name})`,
	);
	const invocation = required(
		send.objectWithObject(
			requiredClass('NSInvocation'),
			selector('invocationWithMethodSignature:'),
			signature,
		),
		'invocationWithMethodSignature:',
	);
	send.voidWithObject(invocation, selector('setSelector:'), sel);
	send.voidWithObject(invocation, selector('setTarget:'), target);
	send.void(invocation, selector('invoke'));
	const rect = new Float64Array(4);
	send.voidWithObject(invocation, selector('getReturnValue:'), ptr(rect));
	return rect;
}
