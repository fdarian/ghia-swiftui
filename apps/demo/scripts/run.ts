/**
 * Runs a script in the `ghia` Vite environment, which is what compiles its
 * JSX for ghia (Bun alone cannot), then exits when the script's module has
 * finished:
 *
 *   bun scripts/run.ts scripts/screenshot.tsx <demo>
 *
 * The script sees itself as `process.argv[1]`, with its own arguments after it.
 */
import { resolve } from 'node:path';
import { dev } from 'ghia';

const script = process.argv[2];
if (script === undefined) {
	console.error('usage: bun scripts/run.ts <script> [args...]');
	process.exit(1);
}

process.argv = [process.execPath, resolve(script), ...process.argv.slice(3)];
const handle = await dev({ entry: script });
await handle.close();
process.exit(0);
