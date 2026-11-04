import { realpathSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * One runtime instance of solid-js and @ghia/solid across the demo,
 * packages/swiftui and ghia-base-ui: a second copy of either gives a
 * second reactive graph or renderer registry, and nothing fails loudly.
 */
const root = realpathSync(`${import.meta.dir}/..`);
const swiftui = realpathSync(`${root}/node_modules/ghia-swiftui`);
const baseUi = realpathSync(`${swiftui}/node_modules/ghia-base-ui`);

const ghiaSolid = dirname(realpathSync(Bun.resolveSync('@ghia/solid', root)));

const importers = [
	['@ghia/solid', ghiaSolid],
	['demo', root],
	['ghia-swiftui', swiftui],
	['ghia-base-ui', baseUi],
] as const;
const specifiers = ['solid-js', '@ghia/solid', '@ghia/native'] as const;

let failed = false;
for (const specifier of specifiers) {
	const resolved = new Map<string, string[]>();
	for (const importer of importers) {
		// ghia-base-ui imports no native package.
		if (specifier === '@ghia/native' && importer[0] === 'ghia-base-ui')
			continue;
		const file = realpathSync(Bun.resolveSync(specifier, importer[1]));
		resolved.set(file, [...(resolved.get(file) ?? []), importer[0]]);
	}
	for (const [file, names] of resolved)
		console.log(specifier, names.join(', '), file);
	if (resolved.size !== 1) {
		failed = true;
		console.error(`${specifier}: ${resolved.size} instances`);
	}
}
if (failed) process.exit(1);
console.log(
	'check-single-instance: one instance of solid-js, @ghia/solid, @ghia/native',
);
