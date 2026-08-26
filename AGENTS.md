# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.

## Vitesse WebExt build layout

Chrome loads the `extension/` directory. `src/manifest.ts` generates `extension/manifest.json`; static icons/locales live directly under `extension/`; Vite emits the Side Panel, background service worker, and content script through `vite.config.mts`, `vite.config.background.mts`, and `vite.config.content.mts`. Use pnpm. `pnpm build` is the authoritative production build, and release packaging archives the complete `extension/` directory.

## Content-script bundle isolation

`src/contentScripts/index.ts` is registered as a classic MV3 content script, so `extension/dist/contentScripts/index.global.js` MUST be a self-contained IIFE with no ESM imports. Shared runtime code used by the Side Panel and content script belongs in dependency-light modules such as `src/lib/messaging.ts`; the content script must not import `src/utils.ts`. `scripts/e2e-ego.sh` asserts both the source-level rule (the content-script source must not import `@/utils`) and built-bundle isolation (no surviving `import`/`from` in the emitted background and content bundles).

## Side Panel and iframe routing (issue #25)

The native Side Panel owns all Vue UI; never reintroduce an iframe app into the inspected page. The all-frames content script owns DOM picking, highlighting, XPath evaluation, and context nodes. `useXPathWorkbench.ts` tracks both the active `tabId` and the content-script `frameId`; evaluation/context/focus commands must target that exact pair. Mode and enabled-state updates omit `frameId` to broadcast across existing frames. Newly inserted frames hydrate from frame 0 through `background/main.ts`. State messages carry explicit boolean values, never per-frame toggle inversion. Cross-origin frames remain isolated, so XPath never spans frame boundaries.

## Browser verification

Browser E2E uses Ego Lite, not Playwright. Run `pnpm test:e2e`; `scripts/e2e-ego.sh` builds and serves `extension/`, verifies the Side Panel workflow and narrow layout, then executes the production content bundle in a real Ego Chromium page. Use the `ego-browser` skill for additional inspection.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
