---
'ghia-swiftui': patch
---

The gallery (`npx ghia-swiftui`) no longer reads `bunfig.toml` or `.env` from the directory it is run in, so it starts inside a project whose bunfig preloads `@ghia/solid/preload`.
