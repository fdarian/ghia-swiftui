/**
 * Imported first by every script that opens a window: `GPUIX_BACKGROUND=1`
 * makes the window open behind the active app and never take focus. It is
 * set here rather than left to the caller's environment, because a script that
 * forgot it would take the keyboard from whatever the user is typing in.
 *
 * Bun's `process.env` is its own copy: an assignment never reaches libc, and
 * ghia reads this variable natively (`getenv`) to emulate focus in a window
 * that is not key. `setenv` is what sets it for ghia; `process.env` is for JS
 * readers.
 */
import { dlopen, FFIType, ptr } from 'bun:ffi';

const libc = dlopen('/usr/lib/libSystem.B.dylib', {
	setenv: {
		args: [FFIType.ptr, FFIType.ptr, FFIType.i32],
		returns: FFIType.i32,
	},
});
const cString = (value: string) => ptr(Buffer.from(`${value}\0`));

if (libc.symbols.setenv(cString('GPUIX_BACKGROUND'), cString('1'), 1) !== 0) {
	throw new Error('setenv(GPUIX_BACKGROUND) failed');
}
process.env.GPUIX_BACKGROUND = '1';
