SwiftUI-look Solid components for macOS on ghia (`@ghia/solid` 0.11.0, Bun runtime, no webview). Same component names, props and variants as syne's `packages/ui` (`~/code/fdarian/syne`), so syne migrates by changing imports. pnpm workspace, Biome, turbo for checks only.

## Layout

- [`packages/swiftui/`](packages/swiftui/AGENTS.md) — the library, `ghia-swiftui`, consumed as TS source (no build step).
- [`apps/demo/`](apps/demo/AGENTS.md) — private native-window showcase of every component, plus the capture and check scripts.
- [`apps/swiftui-reference/`](apps/swiftui-reference/AGENTS.md) — private minimal SwiftUI macOS app that shows the system's real control for each demo page, and the scripts that put it beside ours.
- [`README.md`](README.md) — install and setup for a consumer; the only copy of that, keep it true when setup changes.

## Principles

- Match SwiftUI as closely as possible. Where SwiftUI draws glass, use real `NativeGlass`, never a tint plus blur. Where syne and SwiftUI disagree, SwiftUI wins. In-window emulation only where macOS has no element to use, and then it is recorded in `DRIFT.md`.
- The SwiftUI reference is the target. Before tuning a component's look, capture it beside ours with `pnpm compare <shot>` (list in `apps/swiftui-reference/shots.ts`) and read the PNG; `--zoom x:y:w:h@N` enlarges a region of both sides to read radius, edge, padding and colour. Tune against that image, not against memory or a screen recording.
- Nothing a script launches may cover the user's work or take focus from their app: see [Test windows](#test-windows).
- No ancestor of a `NativeGlass` has `opacity`, animated or static: the group it forms is drawn before the glass layer, so the glass refracts its own content and its shadow is cut square. Enter and leave with `y` and `scale`; dim a disabled glass control's content.

## Commands

- `pnpm check` — `tsc` and `biome check` in both workspaces (turbo). Must pass before a commit. `pnpm format` fixes style.
- `pnpm compare <shot|all> [--scheme light|dark]` — reference | ours PNG into `/tmp/ghia-compare/`; `pnpm reference <shot|all>` captures the reference alone. `all` skips the shots marked `front` in `shots.ts` (open menus).
- `pnpm start`, `pnpm screenshot <demo>`, `pnpm live-capture <demo> [step...]`, `pnpm glass-check`, `pnpm window-check` — forwarded to the demo.

## Test windows

The one rule for every window a script opens (demo and reference); the workspace docs link here.

- **Windows open already parked**, never at a visible position first: an 8pt strip of the window on a display that does not hold the user's frontmost window (the right edge of the only display, when there is one). The rest hangs off every display and still draws and captures. The demo needs `GPUIX_BACKGROUND=1`, which its scripts set as their first import (`apps/demo/scripts/background.ts`); `apps/demo/scripts/park.ts` and `parkedOrigin` in `apps/swiftui-reference/Sources/main.swift` pick the spot. `move=<x>:<y>` overrides the demo's.
- **Nothing covers the user's work or takes focus**: no activation, no OS input outside the script's own process. Verify with `lsappinfo front` before and after.
- **A covered strip means "not checkable"** (exit 3 from the pixel checks): a window another app covers gets no frames, so animations stand still and captures wait. Report it; never bring the window forward to get frames.
- **The reference's `--front` and `--click`** (a real menu) put the window in front of the user's work, so they refuse to run without `--allow-front`. Agents never pass it. Only the user runs those shots.

## Gotchas

- `base-ui-solid-gpuix` (headless primitives, a git dependency pinned to a SHA) imports ghia as `@gpuix/solid`. `pnpm-workspace.yaml` aliases that name to `@ghia/solid` (`overrides`) and adds `@ghia/solid` to the package's dependencies (`packageExtensions`). Do not edit that repo, or the ghia fork it runs on (`~/code/fdarian/ghia`), from here.
- Exactly one runtime instance of `solid-js` and `@ghia/solid` may exist: a second gives a second reactive graph and fails silently. `pnpm --filter ghia-swiftui-demo check:single-instance` verifies it; run it after touching dependencies.
- A bunfig must list `ghia-swiftui/preload` after `@ghia/solid/preload` (both `preload` and `[test] preload`): base-ui ships TSX source that the ghia preload skips.

## Where things are written down

- [`packages/swiftui/DRIFT.md`](packages/swiftui/DRIFT.md) — every place this library behaves differently from syne, with the cause. A behaviour change that moves away from syne adds or edits a row there.
- Why a thing is done a way: an inline comment at that code, not a doc.
