# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.

## Content-script bundle isolation

The MV3 content script (`src/contentScript.ts`, registered classic-mode in `src/manifest.json`) cannot resolve ES-module `import`s at runtime, so its emitted bundle MUST be self-contained. `tests/e2e/manifest.spec.ts` asserts `contentScript.ts` does not import from `@/utils`. Shared code used by both the content script and the popup lives in `src/lib/messaging.ts` (types-only imports, zero runtime deps) so Rollup can inline it. The `build` script runs Vite twice (see `package.json` / `vite.config.ts` `BUILD_TARGET=content`): the default pass emits `index.html` + `background.js` + copies the manifest/assets; the second single-entry pass emits a self-contained `contentScript.js`. Verify after build: `dist/contentScript.js` has no `import ... from` and no `messaging.*.js` chunk exists.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
