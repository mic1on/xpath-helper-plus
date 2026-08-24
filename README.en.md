# xpath-helper-plus

![xpath-helper-plus screenshot](https://miclon-job.oss-cn-hangzhou.aliyuncs.com/img/20220622143923.png)

A Chrome MV3 developer extension (Vue 3 + Vite) that generates a minimal, unique XPath for a selected element and lets you evaluate XPath queries directly against the page.

English | [简体中文](./README.md)

---

## Features

- **Element picker**: Hold `Shift` and hover over any element to generate its XPath.
- **Shortest unique XPath**: Walks up the DOM until it finds a concise locator that uniquely identifies the target.
- **Robust class matching**: Emits token-based class predicates and ignores volatile state classes such as `active`, `hover`, and `is-open`.
- **Correct position indexes**: Counts siblings over the same predicate-selected set used by the generated XPath.
- **Live query editor**: Edit XPath expressions and see the match count and values immediately.
- **Short, contains-ID, and list modes**: Control uniqueness shortening, partial ID matching, and batch locators.
- **Attribute and text extraction**: Append `text()`, common attributes, or attributes discovered on matched elements.
- **Relative XPath context**: Pin a hovered container and generate expressions relative to it.
- **Query history**: Reuse, pin, or clear recent explicitly-run XPath expressions.
- **Iframe support**: Pick and evaluate elements inside same-origin and cross-origin frames; evaluation is routed back to the frame that produced the query.
- **XPath and CSS copy actions**: Copy the current XPath or convert it to a CSS selector.
- **English and Chinese UI**: Defaults to the Chrome UI language and provides a persistent `中 / EN` switch.
- **Keyboard shortcut**: Press `Alt+Shift+X` to show or hide the floating bar. Customize it at `chrome://extensions/shortcuts`.

---

## Usage

1. Click the extension toolbar icon or press `Alt+Shift+X` to show the floating bar on the current page.
2. Type an XPath in the left editor to evaluate it immediately.
3. To pick an element, hold `Shift` and hover over the target in the page. The generated XPath appears in the editor.
4. Enable **Short XPath**, **Contains ID**, or **List mode** as needed.
5. Use **Copy** for XPath or **Copy CSS** for the converted CSS selector.
6. Use the `中 / EN` control in the result panel to change the interface language.

---

## Installation

The extension is currently distributed as source rather than through the Chrome Web Store.

### Requirements

- Node.js 20+

### Load From Source

```bash
git clone https://github.com/mic1on/xpath-helper-plus.git
cd xpath-helper-plus
npm install
npm run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist` directory.

---

## Development / Build

| Command | Purpose |
|---|---|
| `npm run dev` | Rebuild in watch mode |
| `npm run build` | Create a production extension in `dist/` |
| `npm run typecheck` | Run Vue and TypeScript type checking |
| `npm run test:unit` | Run Vitest unit tests |

The version in `package.json` is the release source of truth. After a PR is merged into `main`, the **Build Release** workflow compares the version before and after the merge. A higher numeric `x.y.z` version runs the quality checks, packages `dist/`, and creates the matching `v<version>` tag and GitHub Release. An unchanged version skips the release, while a downgrade fails the workflow.

---

## License

Licensed under the [Apache License 2.0](./LICENSE).
