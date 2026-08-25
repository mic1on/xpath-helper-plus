# xpath-helper-plus

基于 Vue 3、Vite 和 [Vitesse WebExt](https://github.com/antfu-collective/vitesse-webext) 架构构建的 Chrome MV3 开发者扩展。它通过浏览器原生 Side Panel 生成精简 XPath，并直接在当前页面求值。

[English](./README.en.md) | 简体中文

---

## 功能清单

- **原生侧边栏工作台**：编辑器和结果区常驻网页旁边，不再向网页注入应用界面。
- **元素拾取**：按住 `Shift` 并悬停网页元素，自动生成 XPath 并回填到侧边栏。
- **自动最短唯一 XPath**：始终优先生成最短、可用且唯一定位目标元素的 XPath，自动利用 ID、稳定属性和 class 等锚点。
- **健壮的 class 匹配**：按 class token 生成谓词，并剔除 `active`、`hover`、`is-open` 等运行时状态 class。
- **正确的位置索引**：`tag[predicate][n]` 的索引只统计满足同一 predicate 的同标签兄弟节点。
- **实时查询编辑器**：编辑 XPath 后立即查看匹配节点数量和结果。
- **列表模式**：可切换为匹配同类元素集合的 XPath，适合批量提取。
- **属性与文本提取**：一键追加 `text()`、常用属性或匹配元素上实际存在的属性。
- **相对 XPath 上下文**：固定悬停过的容器节点，并生成相对该节点的表达式。
- **查询历史**：复用、置顶或清除显式执行过的 XPath。
- **iframe 支持**：支持在同源和跨源 iframe 内拾取与求值；后续操作会路由回产生查询的同一标签页和 frame。
- **复制 XPath 与 CSS**：复制当前 XPath，或转换为 CSS 选择器后复制。
- **中英文界面**：首次使用跟随 Chrome UI 语言，也可通过右上角语言图标持久切换。
- **深浅色主题**：右上角主题图标可在深色 / 浅色模式间切换，选择会被记住。
- **键盘快捷键**：按 `Alt+Shift+X` 打开侧边栏，可在 `chrome://extensions/shortcuts` 自定义。

---

## 使用方式

1. 打开普通网页，点击浏览器工具栏中的扩展图标，或按 `Alt+Shift+X` 打开 Side Panel。
2. 在编辑器中输入 XPath，即可针对当前活动页面实时求值。
3. 需要拾取元素时，按住 `Shift` 并将鼠标悬停到目标元素，生成的 XPath 会显示在侧边栏。
4. 默认自动生成最短 XPath；如需匹配同类元素集合，再开启“列表模式”。
5. 使用“复制”获取 XPath，或使用“复制 CSS”获取转换后的 CSS 选择器。
6. 点击右上角图标切换界面语言或深浅色主题。

Chrome 内部页面、Chrome 应用商店等受限页面不允许注入内容脚本，侧边栏会在这些页面显示不可用状态。

---

## 安装

> 当前仅提供源码加载方式，尚未发布到 Chrome 应用商店。

### 环境要求

- Node.js 20+
- pnpm 10+
- Chrome 116+，用于 `sidePanel.open()` API

### 本地加载

```bash
git clone https://github.com/mic1on/xpath-helper-plus.git
cd xpath-helper-plus
pnpm install
pnpm build
```

打开 `chrome://extensions`，启用“开发者模式”，点击“加载已解压的扩展程序”，选择项目中的 `extension/` 目录。

---

## 开发与构建

项目采用 Vitesse WebExt 目录结构：

- `src/sidepanel/`：Vue Side Panel 入口
- `src/background/`：MV3 Service Worker 入口
- `src/contentScripts/`：自包含、注入所有 frame 的内容脚本
- `src/manifest.ts`：带类型的 Manifest 源文件
- `extension/`：Chrome 加载的扩展根目录和生产构建输出
- `scripts/`：Manifest 准备与发布打包脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动 Vite 并监听 background/content script；Chrome 中加载 `extension/` |
| `pnpm build` | 生产构建，输出到 `extension/` |
| `pnpm lint` | 运行 ESLint |
| `pnpm typecheck` | 运行 Vue 和 TypeScript 类型检查 |
| `pnpm test:unit` | 运行 Vitest 单元测试 |
| `pnpm test:e2e` | 构建扩展，并使用 Ego Lite 验证侧边栏与内容脚本 |
| `pnpm release:pack` | 构建并在 `release/` 下生成发布压缩包 |

### 发布流程

`package.json` 中的版本号是发布版本的唯一来源。PR 合并到 `main` 后，GitHub Actions 的 **Build Release** 工作流会比较合并前后的版本：

- 版本升级时执行 lint、类型检查、单元测试和构建，打包完整 `extension/` 目录，并创建对应的 `v<version>` 标签与 GitHub Release。
- 版本未变化时跳过发布。
- 版本降级时工作流失败。

---

## 许可证

本项目基于 [Apache License 2.0](./LICENSE) 授权。
