/**
 * Imported first by every script that opens a window: `GPUIX_BACKGROUND=1`
 * makes the window open behind the active app and never take focus. It is
 * set here rather than left to the caller's environment, because a script that
 * forgot it would take the keyboard from whatever the user is typing in.
 */
process.env.GPUIX_BACKGROUND = '1';
