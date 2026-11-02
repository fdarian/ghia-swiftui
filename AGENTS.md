SwiftUI-look Solid components for macOS on ghia (`@ghia/solid` 0.11.0, Bun runtime, no webview). Same component names, props and variants as syne's `packages/ui` (`~/code/fdarian/syne`), so syne migrates by changing imports. pnpm workspace, Biome, turbo for checks only.

## Layout

- [`packages/swiftui/`](packages/swiftui/AGENTS.md) — the library, `ghia-swiftui`, consumed as TS source (no build step).
- [`apps/demo/`](apps/demo/AGENTS.md) — private native-window showcase of every component, plus the capture and check scripts.
- [`apps/swiftui-reference/`](apps/swiftui-reference/AGENTS.md) — private minimal SwiftUI macOS app that shows the system's real control for each demo page, and the scripts that put it beside ours.
- [`README.md`](README.md) — install and setup for a consumer; the only copy of that, keep it true when setup changes.

## Principles

- Match SwiftUI as closely as possible. Where SwiftUI draws glass, use real `NativeGlass`, never a tint plus blur. Where syne and SwiftUI disagree, SwiftUI wins. In-window emulation only where macOS has no element to use, and then it is recorded in `DRIFT.md`.
- The SwiftUI reference is the target. Before tuning a component's look, capture it beside ours with `pnpm compare <shot>` (list in `apps/swiftui-reference/shots.ts`) and read the PNG; `--zoom x:y:w:h@N` enlarges a region of both sides to read radius, edge, padding and colour. Tune against that image, not against memory or a screen recording.
- No ancestor of a `NativeGlass` has `opacity`, animated or static: the group it forms is drawn before the glass layer, so the glass refracts its own content and its shadow is cut square. Enter and leave with `y` and `scale`; dim a disabled glass control's content.

## Commands

- `pnpm check` — `tsc` and `biome check` in both workspaces (turbo). Must pass before a commit. `pnpm format` fixes style.
- `pnpm compare <shot|all> [--scheme light|dark] [--key panel]` — reference | ours PNG into `/tmp/ghia-compare/`; `pnpm reference <shot|all>` captures the reference alone.
- `pnpm start`, `pnpm screenshot <demo>`, `pnpm live-capture <demo> [step...]`, `pnpm glass-check`, `pnpm window-check` — forwarded to the demo.

## Gotchas

- `base-ui-solid-gpuix` (headless primitives, a git dependency pinned to a SHA) imports ghia as `@gpuix/solid`. `pnpm-workspace.yaml` aliases that name to `@ghia/solid` (`overrides`) and adds `@ghia/solid` to the package's dependencies (`packageExtensions`). Do not edit that repo, or the ghia fork it runs on (`~/code/fdarian/ghia`), from here.
- Exactly one runtime instance of `solid-js` and `@ghia/solid` may exist: a second gives a second reactive graph and fails silently. `pnpm --filter ghia-swiftui-demo check:single-instance` verifies it; run it after touching dependencies.
- A bunfig must list `ghia-swiftui/preload` after `@ghia/solid/preload` (both `preload` and `[test] preload`): base-ui ships TSX source that the ghia preload skips.
- Windows open only with `GPUIX_BACKGROUND=1`, behind the active app, and scripts must never post OS input outside their own process. A window another app covers gets no frames, so animations stand still and pixel captures wait or report "not checkable".

## Where things are written down

- [`packages/swiftui/DRIFT.md`](packages/swiftui/DRIFT.md) — every place this library behaves differently from syne, with the cause. A behaviour change that moves away from syne adds or edits a row there.
- Why a thing is done a way: an inline comment at that code, not a doc.
