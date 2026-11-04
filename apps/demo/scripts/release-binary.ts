/**
 * Compiles the gallery into the darwin-arm64 release tarball and writes its
 * checksum into the library package, which ships it to the npx shim.
 * Run after the library build: that build owns `packages/swiftui/dist`.
 */
import { resolve } from 'node:path';
import { createSolidPlugin } from '@ghia/solid/bun-plugin';
import type { BunPlugin } from 'bun';

const NAME = 'ghia-swiftui';
const TARGET = 'darwin-arm64';

const demo = resolve(import.meta.dir, '..');
const binDir = `${demo}/dist/bin`;
const binary = `${binDir}/${NAME}`;
const releasesDir = `${demo}/dist/releases`;
const tarball = `${releasesDir}/${NAME}-${TARGET}.tar.gz`;
const checksums = resolve(demo, '../../packages/swiftui/dist/checksums.json');

/**
 * `@ghia/native` loads its addon through `createRequire(import.meta.url)`,
 * which the bundler cannot see, so `bun build --compile` leaves the 38 MB
 * `.node` out and the binary dies with "Cannot find native binding". Dropping
 * the `createRequire` makes `require` the bundler's, and the literal
 * `require('./gpuix-native.darwin-arm64.node')` embeds the addon (Bun extracts
 * it to $TMPDIR on first load).
 */
const embedNativeAddon: BunPlugin = {
	name: 'embed-native-addon',
	setup(build) {
		build.onLoad(
			{ filter: /@ghia[/\\]native[/\\]index\.js$/ },
			async (args) => {
				const source = await Bun.file(args.path).text();
				const patched = source
					.replace("import { createRequire } from 'module'\n", '')
					.replace('const require = createRequire(import.meta.url)\n', '');
				if (patched === source) {
					throw new Error(
						`${args.path}: createRequire lines not found, update embedNativeAddon`,
					);
				}
				return { contents: patched, loader: 'js' };
			},
		);
	},
};

function run(command: string[]) {
	const result = Bun.spawnSync(command, {
		stdout: 'inherit',
		stderr: 'inherit',
	});
	if (result.exitCode !== 0) {
		throw new Error(`${command.join(' ')} exited ${result.exitCode}`);
	}
}

const build = await Bun.build({
	entrypoints: [`${demo}/src/main.tsx`],
	plugins: [createSolidPlugin(), embedNativeAddon],
	compile: { target: `bun-${TARGET}`, outfile: binary },
	minify: true,
});
if (!build.success) {
	for (const log of build.logs) console.error(log);
	throw new Error('Bun.build --compile failed');
}

// Bun's own signature is not trusted on Apple Silicon: re-sign before tarring.
run(['codesign', '--force', '--sign', '-', binary]);

run(['mkdir', '-p', releasesDir]);
run(['tar', '-czf', tarball, '-C', binDir, NAME]);

const hasher = new Bun.CryptoHasher('sha256');
hasher.update(await Bun.file(tarball).arrayBuffer());
await Bun.write(
	checksums,
	`${JSON.stringify({ [TARGET]: hasher.digest('hex') }, null, '\t')}\n`,
);
console.log(`${tarball}\n${checksums}`);
