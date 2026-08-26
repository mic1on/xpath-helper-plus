# xpath-helper-plus

A Chrome MV3 developer extension built with Vue 3, Vite, and the [Vitesse WebExt](https://github.com/antfu-collective/vitesse-webext) architecture. It generates concise XPath locators and evaluates them from a native browser side panel.

English | [简体中文](./README.md)

---

## Features

- **Native Side Panel workspace**: Keep the editor and results visible beside the page without injecting application UI into the document.
- **Element picker**: Hold `Shift` and hover over any page element to generate its XPath.
- **Automatic shortest unique XPath**: Always generates the shortest usable XPath that uniquely identifies the target, automatically using IDs, stable attributes, and classes as anchors.
- **Robust class matching**: Emits token-based class predicates and ignores volatile state classes such as `active`, `hover`, and `is-open`.
- **Correct position indexes**: Counts siblings over the predicate-selected set used by the generated XPath.
- **Live query editor**: Edit XPath expressions and immediately inspect matching nodes and values.
- **List mode**: Optionally generates a locator for a matching element set, useful for batch extraction.
- **Attribute and text extraction**: Append `text()`, common attributes, or attributes discovered on matched elements.
- **Query history**: Reuse, pin, or clear recent explicitly-run XPath expressions.
- **Iframe support**: Pick and evaluate elements inside same-origin and cross-origin frames. Evaluation is routed back to the tab and frame that produced the query.
- **XPath and CSS copy actions**: Copy the current XPath or convert it to a CSS selector.
- **English and Chinese UI**: Defaults to the Chrome UI language, with a persistent language icon in the top-right corner.
- **Light and dark themes**: A theme icon in the top-right corner toggles between dark and light modes, and remembers your choice.
- **Keyboard shortcut**: Press `Alt+Shift+X` to open the Side Panel. Customize it at `chrome://extensions/shortcuts`.

---

## Usage

1. Open a regular web page, then click the extension toolbar icon or press `Alt+Shift+X` to open the Side Panel.
2. Type an XPath in the editor to evaluate it against the active page.
3. To pick an element, hold `Shift` and hover over the target. The generated XPath appears in the Side Panel.
4. The shortest XPath is generated automatically; enable **List mode** only when you need to match a group of similar elements.
5. Use **Copy** for XPath or **Copy CSS** for the converted CSS selector.
6. Use the top-right icons to switch the interface language or toggle the light/dark theme.

Chrome internal pages, the Chrome Web Store, and other restricted URLs do not allow content-script inspection. The panel displays an unavailable state on those pages.

---

## Installation

The extension is currently distributed as source rather than through the Chrome Web Store.

### Requirements

- Node.js 20+
- pnpm 10+
- Chrome 116+ for the `sidePanel.open()` API

### Load From Source

```bash
git clone https://github.com/mic1on/xpath-helper-plus.git
cd xpath-helper-plus
pnpm install
pnpm build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the `extension/` directory.

---

## Development / Build

The repository follows the Vitesse WebExt layout:

- `src/sidepanel/`: Vue Side Panel entry
- `src/background/`: MV3 service worker entry
- `src/contentScripts/`: self-contained all-frames content script
- `src/manifest.ts`: typed manifest source
- `extension/`: unpacked extension root generated and loaded by Chrome
- `scripts/`: manifest preparation and release packaging

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Vite and watch the background/content-script bundles; load `extension/` in Chrome |
| `pnpm build` | Create a production extension in `extension/` |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run Vue and TypeScript type checking |
| `pnpm test:unit` | Run Vitest unit tests |
| `pnpm test:e2e` | Build and run Side Panel/content-script E2E checks with Ego Lite |
| `pnpm release:pack` | Build and create a release archive under `release/` |

The version in `package.json` is the release source of truth. After a PR is merged into `main`, the **Build Release** workflow compares the version before and after the merge. A higher numeric `x.y.z` version runs the quality checks, builds `extension/`, packages that directory, and creates the matching `v<version>` tag and GitHub Release. An unchanged version skips the release, while a downgrade fails the workflow.

---

## License

Licensed under the [Apache License 2.0](./LICENSE).
