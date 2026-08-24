# xpath-helper-plus

A Chrome MV3 developer extension built with Vue 3, Vite, and the [Vitesse WebExt](https://github.com/antfu-collective/vitesse-webext) architecture. It generates concise XPath locators and evaluates them from a native browser side panel.

English | [简体中文](./README.md)

---

## Features

- **Native Side Panel workspace**: Keep the editor and results visible beside the page without injecting application UI into the document.
- **Element picker**: Hold `Shift` and hover over any page element to generate its XPath.
- **Shortest unique XPath**: Walks up the DOM until it finds a concise locator that uniquely identifies the target.
- **Robust class matching**: Emits token-based class predicates and ignores volatile state classes such as `active`, `hover`, and `is-open`.
- **Correct position indexes**: Counts siblings over the predicate-selected set used by the generated XPath.
- **Live query editor**: Edit XPath expressions and immediately inspect matching nodes and values.
- **Short, contains-ID, and list modes**: Control uniqueness shortening, partial ID matching, and batch locators.
- **Attribute and text extraction**: Append `text()`, common attributes, or attributes discovered on matched elements.
- **Relative XPath context**: Pin a hovered container and generate expressions relative to it.
- **Query history**: Reuse, pin, or clear recent explicitly-run XPath expressions.
- **Iframe support**: Pick and evaluate elements inside same-origin and cross-origin frames. Evaluation is routed back to the tab and frame that produced the query.
- **XPath and CSS copy actions**: Copy the current XPath or convert it to a CSS selector.
- **English and Chinese UI**: Defaults to the Chrome UI language and provides a persistent `中 / EN` switch.
- **Keyboard shortcut**: Press `Alt+Shift+X` to open the Side Panel. Customize it at `chrome://extensions/shortcuts`.

---

## Usage

1. Open a regular web page, then click the extension toolbar icon or press `Alt+Shift+X` to open the Side Panel.
2. Type an XPath in the editor to evaluate it against the active page.
3. To pick an element, hold `Shift` and hover over the target. The generated XPath appears in the Side Panel.
4. Enable **Short XPath**, **Contains ID**, or **List mode** as needed.
5. Use **Copy** for XPath or **Copy CSS** for the converted CSS selector.
6. Use the `中 / EN` control to change the interface language.

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
