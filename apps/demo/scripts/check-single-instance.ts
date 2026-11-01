import { realpathSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * One runtime instance of solid-js and @ghia/solid across the demo,
 * packages/swiftui and base-ui-solid-gpuix: a second copy of either gives a
 * second reactive graph or renderer registry, and nothing fails loudly.
 * base-ui imports the alias `@gpuix/solid`, which must land on the same files
 * as `@ghia/solid`.
 */
const root = realpathSync(`${import.meta.dir}/..`);
const swiftui = realpathSync(`${root}/node_modules/ghia-swiftui`);
const baseUi = realpathSync(`${swiftui}/node_modules/base-ui-solid-gpuix`);

const ghiaSolid = dirname(realpathSync(Bun.resolveSync('@ghia/solid', root)));

const importers = [
	['@ghia/solid', ghiaSolid],
	['demo', root],
	['ghia-swiftui', swiftui],
	['base-ui-solid-gpuix', baseUi],
] as const;
const specifiers = [
	['solid-js', 'solid-js'],
	['@ghia/solid', '@gpuix/solid'],
	['@ghia/native', '@gpuix/native'],
] as const;

let failed = false;
for (const specifier of specifiers) {
	const resolved = new Map<string, string[]>();
	for (const importer of importers) {
		// Each importer imports the name it is written against: base-ui still says @gpuix/*.
		const name =
			importer[0] === 'base-ui-solid-gpuix' ? specifier[1] : specifier[0];
		// base-ui-solid-gpuix imports no native package.
		if (
			specifier[0] === '@ghia/native' &&
			importer[0] === 'base-ui-solid-gpuix'
		)
			continue;
		const file = realpathSync(Bun.resolveSync(name, importer[1]));
		resolved.set(file, [
			...(resolved.get(file) ?? []),
			`${importer[0]} (${name})`,
		]);
	}
	for (const [file, names] of resolved)
		console.log(specifier[0], names.join(', '), file);
	if (resolved.size !== 1) {
		failed = true;
		console.error(`${specifier[0]}: ${resolved.size} instances`);
	}
}
if (failed) process.exit(1);
console.log(
	'check-single-instance: one instance of solid-js, @ghia/solid, @ghia/native',
);
