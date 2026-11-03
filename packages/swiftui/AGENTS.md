`ghia-swiftui`: the component library. Source only: `exports` point at TS (`.` is `src/index.ts`, `./preload`, `./tokens/*`, `./objc`).

## Layout

- `src/components/<name>.tsx` — one file per component, plus `*-context.ts` for shared context. Public names are re-exported from `src/index.ts`; a component that is not there is internal (`ProgressiveBlur`, `NativeGlass`).
- `src/tokens/` — colours, typography and style as objects of getters (`define-tokens.ts`) over the scheme and accent signals. Read them inside JSX props or effects, never at module scope.
- `src/native-glass.ts`, `src/objc.ts` — real `NSGlassEffectView` from `bun:ffi` on libobjc, inside `<nativeview>`; `components/native-glass.tsx` wraps it and falls back to `glass.ts` (in-window material) when there is no view.
- `src/preload.ts` — Bun plugin that compiles base-ui-solid-gpuix's TSX; consumers list it in `bunfig.toml`.
- `src/panel-storage.ts` — layouts persist through a storage the app sets (`setPanelStorage`); there is no default.

## Conventions

- Imports are `#src/...` with the file extension. Props types extend `HostAttributes` (`host-props.ts`) and spread `rest` on the root; `style` is merged last so the caller wins.
- Syne's API is the contract: same prop names and variants. Adapt React to Solid (`children`, signals, `onValueChange`), not the surface. Anything that differs goes in [DRIFT.md](DRIFT.md) (one row: component, syne, here, cause).
- Resolve `children` once (`resolveChildren`, `hasNodes`); reading a children prop twice builds its elements twice.

## Gotchas

- A `backdropFilter` painted over a native view (glass) blurs nothing. Anything that sits over `NativeGlass` and needs a soft edge uses a gradient mask (see the sidebar's `ScrollArea`), not `ProgressiveBlur`.
- `no-dom` TypeScript lib: DOM types in the program break this source.
- Native calls that touch AppKit run on Bun's JS thread, which is the app's main thread (`assertMainThread`).
