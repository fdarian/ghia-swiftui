# ghia issues found while building ghia-swiftui

For the ghia maintainer. Versions: `@ghia/solid` and `@ghia/native` 0.11.0, macOS 26+ `NSGlassEffectView` through `<nativeview>`.

Paths are relative to the ghia repo. "Observed" means seen in a live window. "From source" means read in the code and consistent with what we saw, but not isolated in ghia itself. Nothing here has a minimal reproduction yet, and ghia was not modified.

## Likely bugs

### 1. Effect-group bounds ignore shadow blur

An ancestor with an opacity animation becomes an effect group. The group's bounds take a shadow at `(bounds + offset).dilate(spread)` with no blur, so the blur is cut at a hard rectangle until the group closes.

- Observed: a toast's 24px-blur shadow cut to a square for the whole 0.3s spring, unclipping when the animation ended.
- From source: `zed` `scene.rs:571-604`, `window.rs:7781`. `effects.rs:285,983-995` adds a margin only for filters.
- Expected: blur radius counts towards the group's bounds.

### 2. Children of a `<nativeview>` inside an effect group draw beneath the native view

A placeholder inside a group is ordered after the group closes, so the group's contents, including the nativeview's own children, sit below the AppKit view.

- Observed: toast text refracted and blurred by its own glass for the whole opacity animation (dark), and text and icon hidden for about 5 frames (light), both sharp once the animation ended. Sidebar text did the same under a panel collapse's opacity. The light-mode vanish was not traced to a specific cause.
- From source: `zed` `scene.rs:474-483,737-743`; a group is created even at opacity 1 while animating, `native/src/style.rs:1259-1262`, `renderer.rs:13041-13042`.
- Contradicts: `docs/fork/nativeview.md` says children paint above the view, and doesn't mention this case.
- Workaround here: no opacity on any ancestor of a nativeview. This rules out a fade on any glass surface.
- Wanted: children stay above their nativeview inside a group, or a documented limit.

### 3. A freshly added native view can show frames before the content above it

- Observed: `onAttach` arrives 1.3 to 3.5 frames after mount (75 Hz display), so on a page of about 10 glass views the views appear across about 60ms. The GPUI children then draw about a frame after the glass, so a glass popup can't appear whole on one frame: Apple's does.
- Also observed: before we hid children until attach, a new `NSGlassEffectView` gave 1 to 2 frames with a frosted sheet and blurred children. That part may be the system view's own behaviour.
- Wanted: attach during the mount's own frame, or a way to hold presentation until native views are in place.

### 4. `opacity` on a `display: contents` element is silently ignored

- Observed: `opacity: 0` on a `display: contents` wrapper hid nothing; `visibility: hidden` on it works. We didn't check whether this is listed in `docs/fork/deviations.md`.

### 5. `boxShadow` on a `<nativeview>` isn't painted

- Observed: set directly on the element, no shadow appears. Docs call it a `div` with a native layer. Either paint it or list it as a deviation.

### 6. `dragBy` doesn't drive a drag in the live renderer

- Observed: `dragBy` in the in-process live renderer did nothing on a resize handle. Possibly no buttons are reported as held, so `buttons === 0` ends the drag at once. Not isolated.

## Needs a decision

### 7. An inactive window gets no focus events

- Observed: in a window launched with `GPUIX_BACKGROUND=1`, a click focuses an input and typed text arrives, but `onFocus`, `:focus-visible` and the caret never fire. `focusElement(id)` behaves the same. They fire once the window is activated.
- Typed text arriving without `onFocus` looks inconsistent even if the rest is intended. It also means focus behaviour can't be tested without taking the user's keyboard focus.

### 8. No way to be key without activating

- Observed: `GPUIWindow` can't be made key while the app is inactive: `makeKeyWindow`, overriding `isKeyWindow`, and `_setPreventsActivation:` had no effect, and swapping its class to `NSPanel` crashed Bun.
- Why it matters: glass tints and accent colours render differently in an inactive window, so automated captures can't check them.
- Wanted: a non-activating panel option in the window options, for test runs.

## Unconfirmed, may be ours

### 9. `motion.div` seems to rebuild children when `animate` changes

- Observed: an input created inside a `motion.div`'s prop expression was recreated when its `animate` changed, losing focus: focus and blur logs alternated each frame. Building children once with Solid's `children()` stopped it. This may be normal Solid prop access rather than a ghia bug.

### 10. Anchored popup's first frame is laid out at full content height

- Observed: with `maxHeight` from `onPlacement`, the popup is clamped a frame later because of the JS round trip. `constrainToAvailable` avoids it, so this may only need a docs note.
