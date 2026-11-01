import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Where `PanelGroup` and `SplitView` keep sizes and collapse state between
 * runs. syne uses `localStorage`; a ghia app has none. Values are strings (the
 * callers store JSON), read synchronously because a layout is sized on its
 * first frame.
 */
export interface PanelStorage {
	get(key: string): string | undefined;
	set(key: string, value: string): void;
}

/** The one file the default storage writes: `<dir>/panels.json`, a flat `{ key: value }` object. */
export function createFilePanelStorage(options: {
	/** The directory `~/Library/Application Support/<appName>/` the file lives in. */
	appName: string;
}): PanelStorage {
	const file = join(
		homedir(),
		'Library',
		'Application Support',
		options.appName,
		'panels.json',
	);
	let cache: Record<string, string> | undefined;

	const load = (): Record<string, string> => {
		if (cache !== undefined) return cache;
		if (!existsSync(file)) {
			cache = {};
			return cache;
		}
		const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			throw new Error(`${file} is not a JSON object`);
		}
		const entries: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value !== 'string') {
				throw new Error(`${file}: the value of ${key} is not a string`);
			}
			entries[key] = value;
		}
		cache = entries;
		return cache;
	};

	return {
		get: (key) => load()[key],
		set(key, value) {
			const entries = load();
			entries[key] = value;
			mkdirSync(dirname(file), { recursive: true });
			// Written beside the file and renamed over it, so a crash mid-write leaves the old layout, not half of one.
			const temporary = `${file}.tmp`;
			writeFileSync(temporary, JSON.stringify(entries, null, '\t'));
			renameSync(temporary, file);
		},
	};
}

const DEFAULT_APP_NAME = 'ghia-swiftui';

let storage: PanelStorage | undefined;

/**
 * Replaces where layouts are kept. The default is a file under
 * `~/Library/Application Support/ghia-swiftui/`: an app calls
 * `setPanelStorage(createFilePanelStorage({ appName }))` once, before its first
 * render, to keep its own directory.
 */
export function setPanelStorage(next: PanelStorage) {
	storage = next;
}

export function panelStorage(): PanelStorage {
	storage ??= createFilePanelStorage({ appName: DEFAULT_APP_NAME });
	return storage;
}
