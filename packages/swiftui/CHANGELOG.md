# ghia-swiftui

## 0.2.0

### Minor Changes

- 89d4a0b: Requires `@ghia/solid` 0.12.1, which runs on Vite: the `@ghia/solid/preload` bunfig entry is gone. An app depends on `ghia` and `vite`, uses `ghia()` and `solid()` in `vite.config.mts`, and runs with `ghia dev` and `ghia build` (see the README).

### Patch Changes

- 32a7e4f: The gallery (`npx ghia-swiftui`) no longer reads `bunfig.toml` or `.env` from the directory it is run in, so it starts inside a project whose bunfig preloads `@ghia/solid/preload`.
- 98318bc: `Input` accepts `ref`, the `<input>` element, for focusing it from code.
- d262f5b: Remove border on resize handler

## 0.1.0

### Minor Changes

- 3aaa354: First npm release with built JS and types, and `npx ghia-swiftui` opens the component gallery.
