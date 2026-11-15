---
"ghia-swiftui": patch
---

`Input` and `NumberInput` `onChange` now fires when the edit is committed, as the DOM change event does; read the text on every edit with `onValueChange` or `onInput`.
