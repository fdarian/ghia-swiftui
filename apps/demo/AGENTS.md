`ghia-swiftui-demo`: a native window that shows every `ghia-swiftui` component, and the scripts that capture and check it. Private package, never published itself; `release:binary` compiles it into the signed darwin-arm64 gallery binary that `npx ghia-swiftui` downloads from the GitHub Release.

## Layout

- `src/demos/<name>.tsx` — one demo per component, listed in `src/demos/index.ts` (`name` is the slug the scripts and test ids use, `title` the sidebar label, `groups` the sidebar sections). A demo that needs interaction exports a `scenario` that drives it through `Shot`.
- `src/app.tsx` — the shell: `SplitView` with a `Sidebar` of demos. `src/main.tsx` is the real entry (`pnpm start`).
- `scripts/` — `screenshot` (offscreen `createTestRoot`, no window; shows the glass fallback), `live-capture` (real window, composited pixels, real glass), `glass-check`, `scroll-edge-check`, `window-check`, `check-single-instance`. `live-window.tsx` and `window-pixels.ts` are their shared helpers; `frame-trace.ts` and `frame-sampler.ts` (a worker) back `live-capture`'s `trace=` step, which counts the composited frames around a click.

## Verifying a change

- Every component has a demo with the scenario that shows it working, in light and dark. Run `pnpm screenshot <demo>` and read the PNGs under `screenshots/<demo>/` (gitignored).
- Anything involving glass, the sidebar or the window frame: `GPUIX_BACKGROUND=1 pnpm live-capture <demo> [steps]` and read the PNG. The demo's window is opaque and `App` paints it, so the glass samples the app and not the desktop. The window opens parked ([Test windows](../../AGENTS.md#test-windows)); a covered strip is "not checkable".
- `pnpm window-check` (layout, resize, collapse, glass, scroll edge), `pnpm glass-check` and `pnpm --filter ghia-swiftui-demo scroll-edge-check` need the parked strip uncovered (exit 3 "not checkable" otherwise).
- Committed README images are live captures under the repo's `docs/`.
