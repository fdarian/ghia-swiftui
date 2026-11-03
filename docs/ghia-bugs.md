# ghia issues found while building ghia-swiftui

For the ghia maintainer. Versions: `@ghia/solid` and `@ghia/native` 0.11.1, macOS 26+.

Items 1 to 10 of the earlier list are resolved. They were checked in ghia-swiftui against ghia `main` a6de8505, which 0.11.1 includes: the fixed ones no longer reproduce, and the rest are documented. Item 8 (`kind: 'panel'`) was only checked in the types, not opened live.

### 11. Focus set from code loses `:focus-visible` on an element with a `transition`

- Observed, in the offscreen `createTestRoot` and in a live window, both with `GPUIX_BACKGROUND=1`: before any key is pressed, `focusElement` on an element with no `transition` shows its `focusVisible` style. On an element with any `transition*` it doesn't, even 2.5s later, while `getFocusedElementId` reports it focused.
- Any transition does it, including `background-color 100ms`, which animates neither `box-shadow` nor `outline`. The shorthand and the longhands behave the same.
- A `Tab` keystroke always shows the style. After one `Tab`, `focusElement` shows it too, with or without a transition.
- Expected: whether `:focus-visible` matches doesn't depend on `transition`.
- Impact: autofocus, or a dialog's initial focus, on a control with a transition shows no focus ring. ghia-swiftui's `Button` drops syne's 100ms transition because of this.
- Repro:

```tsx
// GPUIX_BACKGROUND=1, createTestRoot or a live window
const ring = { boxShadow: '0 0 0 3px #f00' };
<>
  <div testId="a" tabIndex={0} style={{ width: 100, height: 40, focusVisible: ring }} />
  <div testId="b" tabIndex={0} style={{ width: 100, height: 40, focusVisible: ring, transition: 'background-color 100ms' }} />
</>
// focusElement(a)                                 -> red ring
// focusElement(b)                                 -> no ring; pixels equal the unfocused background
// simulateKeystrokes('Tab'), then focusElement(b) -> ring
```
