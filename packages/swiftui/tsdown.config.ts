import { readdirSync } from 'node:fs';
import solid from 'rolldown-plugin-solid';
import { defineConfig } from 'tsdown';

const tokenEntries = Object.fromEntries(
	readdirSync('src/tokens')
		.filter((file) => /\.tsx?$/.test(file))
		.map((file) => [
			`tokens/${file.replace(/\.tsx?$/, '')}`,
			`src/tokens/${file}`,
		]),
);

export default defineConfig([
	{
		entry: {
			index: 'src/index.ts',
			'native-glass': 'src/native-glass.ts',
			objc: 'src/objc.ts',
			...tokenEntries,
		},
		format: ['esm'],
		dts: true,
		// The two configs build in parallel into one dir: this one must not wipe cli.js.
		clean: ['dist/**', '!dist/cli.js'],
		outDir: 'dist',
		fixedExtension: false,
		deps: { neverBundle: ['bun:ffi'] },
		// Same compile as `solid()` from @ghia/solid/vite: universal output importing from @ghia/solid, never solid-js/web.
		plugins: [
			solid({ solid: { generate: 'universal', moduleName: '@ghia/solid' } }),
		],
	},
	{
		entry: { cli: 'src/cli.ts' },
		format: ['esm'],
		platform: 'node',
		dts: false,
		clean: false,
		outDir: 'dist',
		fixedExtension: false,
	},
]);
