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

/** The file storage an app can pass to `setPanelStorage`: `<dir>/panels.json`, a flat `{ key: value }` object. */
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

let storage: PanelStorage | undefined;

/**
 * Sets where layouts are kept; an app calls it once, before its first render,
 * usually as `setPanelStorage(createFilePanelStorage({ appName }))`. There is
 * no default: a library that picked a directory would write into one the app
 * never named.
 */
export function setPanelStorage(next: PanelStorage) {
	storage = next;
}

/** The storage a `storageKey` persists through. Throws until `setPanelStorage` has been called. */
export function panelStorage(): PanelStorage {
	if (storage === undefined) {
		throw new Error(
			'A PanelGroup or SplitView has a storageKey but no panel storage is set: call setPanelStorage(createFilePanelStorage({ appName })) before rendering',
		);
	}
	return storage;
}
