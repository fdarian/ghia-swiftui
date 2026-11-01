import { transformAsync } from '@babel/core';
import typescript from '@babel/preset-typescript';
import solid from 'babel-preset-solid';
import { plugin } from 'bun';

/**
 * `@ghia/solid/preload` skips every file under node_modules, but
 * base-ui-solid-gpuix ships TSX source (`form-value.tsx`, `focus-first.tsx`).
 * Left alone, Bun compiles those with its own JSX runtime: props are read
 * once, so they never update. Same compiler setup as the ghia preload.
 */
const BASE_UI_TSX =
	/[/\\]node_modules[/\\]base-ui-solid-gpuix[/\\]src[/\\].*\.tsx(?:[?#].*)?$/;

plugin({
	name: 'ghia-swiftui-base-ui-solid',
	setup(build) {
		build.onLoad({ filter: BASE_UI_TSX }, async (args) => {
			const file = args.path.split(/[?#]/, 1)[0];
			if (file === undefined)
				throw new Error(`Empty module path: ${args.path}`);
			const result = await transformAsync(await Bun.file(file).text(), {
				filename: file,
				configFile: false,
				babelrc: false,
				presets: [
					[solid, { generate: 'universal', moduleName: '@ghia/solid' }],
					[typescript],
				],
			});
			if (result?.code == null)
				throw new Error(`Babel produced no output: ${file}`);
			return { contents: result.code, loader: 'js' };
		});
	},
});
