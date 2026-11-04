# ghia-swiftui

## 0.1.1

### Patch Changes

- 32a7e4f: The gallery (`npx ghia-swiftui`) no longer reads `bunfig.toml` or `.env` from the directory it is run in, so it starts inside a project whose bunfig preloads `@ghia/solid/preload`.
- 98318bc: `Input` accepts `ref`, the `<input>` element, for focusing it from code.

## 0.1.0

### Minor Changes

- 3aaa354: First npm release with built JS and types, and `npx ghia-swiftui` opens the component gallery.
