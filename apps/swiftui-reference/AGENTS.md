`ghia-swiftui-reference`: a minimal real SwiftUI app (macOS 26 APIs, built with `swiftc` from the Xcode toolchain, no Xcode project) that draws the system's own control for each demo page with the demo's labels, plus the scripts that capture it and put it beside the demo. It is the target `ghia-swiftui` is tuned against. Private; not published.

## Layout

- `Sources/Pages.swift` — one SwiftUI view per page (`button`, `select`, `menu`, `input`, `sidebar`, `toolbar`, `tooltip`, `checkbox`, `radio`, `list`, `scrollbar`, `glass`, `liquid`, `status`), registered in `Pages`. `Kit.swift` has the demo's page frame, section and cell, and the stripe backdrops copied from the demo.
- `Sources/main.swift` — arguments, the window, state drivers (`--click`, `--focus`, `--scroll`, `--flash`, `--hover`) and the self-capture. `build.sh` compiles to `.build/` (gitignored).
- `shots.ts` — a shot is a page in one state plus the demo page and `live-capture` steps it is compared with, and the crop of each side. Add a page or state here.
- `capture.ts` — launches the app per shot and scheme, writes `screenshots/<shot>-<scheme>.png` (gitignored). `compare.ts` — runs `capture` and the demo's `live-capture`, writes `<reference> | <ours>`; its pixel helpers are the demo's `scripts/window-pixels.ts`.

## Gotchas

- The app captures its own window (`CGWindowListCreateImage[FromArray]` by window id, called through `dlsym` because the SDK marks it obsolete): another process's pixels need screen-recording permission, a process's own do not. An open menu is a second window of the same process, so `--click` captures every window the app owns.
- The app must never take focus. It runs `RunLoop.main.run()`, not `NSApplication.run()` (whose `finishLaunching` makes it frontmost), its `NSApplication` subclass makes `activate` a no-op, and its window can never be key. Windows still draw without `run()`; clicks are `NSEvent`s handed to `window.sendEvent`, nothing is posted to the OS. If the app is somehow active at capture time it exits 3 and `capture.ts` retries.
- Windows are parked behind everything with a 60pt strip on the screen's edge showing (a covered window gets no frames). A click state (`--click`) puts the window in front for about three seconds, because a menu needs room.
- Both sides are captured in an inactive window, so glass tints match; the cost is that Apple's accent fills (`.borderedProminent`, checkbox, radio, sidebar selection) draw grey in the reference while the demo's draw in colour. A key window cannot be had without activating the app (a non-activating `NSPanel` turned key but the app reported active), so read those fills' shape and size, not their colour.
- Not reachable: `.help` tooltips (AppKit shows them for the real pointer only), hover and pressed states, and a focus ring in an inactive window.
- `Picker` ignores `.menuStyle` and `.buttonStyle`, so its transparent and glass rows look like the default one; `role: .destructive` does not colour a `borderedProminent` button (the page uses `.tint(.red)`).
- The reference window's own rounded corners show in the capture's corners; the page content is what to compare. Both sides are captured at the display's scale and `compare` refuses different scales.
