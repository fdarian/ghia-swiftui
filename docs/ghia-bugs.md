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
	<div
		testId="a"
		tabIndex={0}
		style={{ width: 100, height: 40, focusVisible: ring }}
	/>
	<div
		testId="b"
		tabIndex={0}
		style={{
			width: 100,
			height: 40,
			focusVisible: ring,
			transition: 'background-color 100ms',
		}}
	/>
</>;
// focusElement(a)                                 -> red ring
// focusElement(b)                                 -> no ring; pixels equal the unfocused background
// simulateKeystrokes('Tab'), then focusElement(b) -> ring
```

- **Status: fixed** (ghia `main` 521b773c, Round 47; not on npm until the next release after 0.11.1). On an element with a transition, the style code decided `:focus-visible` from the last input device (keyboard or not) instead of from the focus state the plain path uses. Before any key press that said no, so the ring was dropped. A text field focused by a click lost its ring the same way. Both paths now read the focus state. Pinned by 28 pixel tests, with and without a transition, before and after a `Tab`. They also check that a transition on the focus style still runs. `:hover`, `:active`, `focusWithin`, `hasFocus` and `hasFocusVisible` didn't share the flaw. Syne's 100ms transition on `Button` can come back.
  - **Also changed** (ghia `main` b59ebf3e, Round 48): which script focus shows `:focus-visible` now follows Chrome. A key press turns it on for the window, a mouse press that moves focus turns it off, a script focus leaves it as it is, and a text field always shows it. Three cases changed. A script focus after a press on blank body now shows the ring. So does one after Tab and then a click on blank body. A script focus after a click and then a text field no longer inherits the text field's ring. Checked against headless Chrome in 41 sequences, by pixel. One gap: CapsLock alone doesn't turn it on, because gpui reports CapsLock as a modifier.
