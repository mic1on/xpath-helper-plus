# Vitesse WebExt Side Panel Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move XPath Helper Plus onto the Vitesse WebExt project architecture and replace the injected floating toolbar with a native Chrome Side Panel without regressing page selection, XPath evaluation, or iframe routing.

**Architecture:** Build extension pages, background code, and the classic content script as separate Vite targets under an `extension/` package root. Generate a typed MV3 manifest from `src/manifest.ts`. Keep all DOM work in the all-frames content script; the side panel owns UI state and addresses messages with both the active tab ID and frame ID.

**Tech Stack:** Vue 3, TypeScript, Vite, UnoCSS, Chrome MV3 Side Panel API, Vitest, Ego Lite, pnpm.

---

### Task 1: Establish the Vitesse WebExt build layout

**Files:**
- Create: `scripts/utils.ts`
- Create: `scripts/manifest.ts`
- Create: `scripts/prepare.ts`
- Create: `src/manifest.ts`
- Create: `vite.config.mts`
- Create: `vite.config.background.mts`
- Create: `vite.config.content.mts`
- Create: `unocss.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Delete: `vite.config.ts`
- Move static assets and locales to `extension/`

**Steps:**
1. Add manifest tests for the generated side panel manifest and split bundle paths.
2. Add the template-style extension root, prepare scripts, and three Vite build targets.
3. Switch package management and scripts to pnpm.
4. Run `pnpm typecheck`, manifest tests, and `pnpm build`.
5. Verify the content script is a self-contained IIFE with no ESM imports.

### Task 2: Replace floating-bar lifecycle with Side Panel lifecycle

**Files:**
- Move: `src/background.ts` to `src/background/main.ts`
- Move: `src/contentScript.ts` to `src/contentScripts/index.ts`
- Delete: `src/bar.ts`
- Delete: `src/custom.css`
- Modify: `src/types/messages.ts`
- Modify: `src/lib/contentState.ts`
- Modify: `src/lib/messaging.ts`
- Modify: `src/utils.ts`

**Steps:**
1. Make the action click and keyboard command open the native side panel and enable element selection in the target tab.
2. Keep content scripts active in every frame and remove all injected iframe UI behavior.
3. Route side-panel commands by explicit `tabId` and optional `frameId`.
4. Forward content-script events only to extension contexts and retain sender tab/frame metadata.
5. Add focused tests for explicit target routing and stale target handling.

### Task 3: Move and adapt the Vue workbench

**Files:**
- Create: `src/sidepanel/index.html`
- Move: `src/main.ts` to `src/sidepanel/main.ts`
- Move: `src/App.vue` to `src/sidepanel/SidePanel.vue`
- Modify: `src/components/home.vue`
- Modify: `src/components/panel/QueryEditorCard.vue`
- Modify: `src/components/panel/ResultPreviewCard.vue`
- Modify: `src/components/panel/panel.css`
- Modify: `src/composables/useXPathWorkbench.ts`
- Modify: `src/i18n.ts`

**Steps:**
1. Track active `tabId`, `frameId`, URL, and connection state in the workbench.
2. Reset frame-specific state on active-tab changes and navigation.
3. Remove the obsolete bar-position action.
4. Reflow the workbench into a stable, narrow, vertically scrolling side-panel layout.
5. Add empty/unavailable page states and preserve query history, copy, context, and result navigation workflows.
6. Run component/composable tests and typecheck.

### Task 4: Update tests, docs, packaging, and project memory

**Files:**
- Create: `scripts/e2e-ego.sh`
- Modify: `tests/unit/xpathWorkbench.spec.ts`
- Delete: `tests/e2e/manifest.spec.ts`
- Delete: `playwright.config.ts`
- Modify: `scripts/package-release.mjs`
- Modify: `.github/workflows/build-release.yml`
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `AGENTS.md`

**Steps:**
1. Point release packaging at `extension/` and move browser E2E to Ego Lite.
2. Document Side Panel usage and pnpm commands.
3. Update durable build and iframe-routing notes.
4. Run the full unit suite, typecheck, production build, manifest checks, and packaging smoke test.
5. Use Ego Lite to verify Side Panel interactions, narrow widths, explicit tab/frame routing, and the production content-script picker.
