# xpath-helper-plus

![xpath-helper-plus screenshot](https://miclon-job.oss-cn-hangzhou.aliyuncs.com/img/20220622143923.png)

A Chrome MV3 developer extension (Vue 3 + Vite) that generates a minimal, unique XPath for a selected element and lets you evaluate XPath queries against the page.

---

## 功能清单

| 功能 | 说明 |
|------|------|
| **元素拾取** | 按住 `Shift` + 鼠标悬停/点击页面任意元素，自动生成该元素的唯一 XPath 并回填到编辑器。 |
| **自动精简为最短唯一 XPath** | 从目标元素向上遍历 DOM，寻找最短且在当前页面唯一的 XPath；若当前路径不唯一则继续向上。 |
| **健壮的 class 匹配** | 采用按 token 的 `contains(concat(' ', normalize-space(@class), ' '), ' <token> ')` 断言，与 class 顺序、空白无关；并自动剔除 `active`/`hover`/`is-open` 等运行时状态 class，只保留结构性 class，避免框架动态增删状态类导致定位失效（#12）。 |
| **位置索引正确性** | `tag[predicate][n]` 的位置索引 `n` 统计的是**满足 predicate 的同标签兄弟节点**，而非所有同标签兄弟节点（修复 #13）。 |
| **查询编辑器** | 左侧面板：可手写/编辑 XPath；三个开关——**精简xpath**（自动精简）、**contains id**（允许在谓词中使用 id）、**列表模式**（批量/不加位置索引）。 |
| **结果预览** | 右侧面板：实时显示当前 XPath 匹配的节点数与序列化结果；提供“换个位置”切换面板上下位置。 |
| **一键复制 XPath** | 编辑器顶部“复制”按钮，复制当前 XPath 到剪贴板。 |
| **一键转 CSS** | 编辑器顶部“复制css”按钮，将当前 XPath 通过 `xpath-to-css` 转为 CSS 选择器并复制。 |
| **配置持久化** | 三个开关状态通过 `localStorage` 持久化，重启浏览器后保持。 |
| **键盘快捷键** | `Alt+Shift+X` 切换浮动栏显示/隐藏（可在 `chrome://extensions/shortcuts` 自定义）。 |

---

## 使用姿势

1. **安装扩展后**，点击浏览器右上角工具栏图标，即可在当前页面切换显示/隐藏浮动栏（面板以 iframe 注入页面，而非独立弹窗）。
2. **姿势 1（手写/微调）**：在左侧编辑器直接输入或修改 XPath，右侧实时预览匹配结果。
3. **姿势 2（拾取元素）**：按住 `Shift` 键，在网页上悬停或点击目标元素，XPath 自动生成并回填编辑器。
4. **键盘快捷键**：按 `Alt+Shift+X` 快速切换浮动栏显示/隐藏（与点击工具栏图标等效）。
5. 根据需要切换“精简xpath”“contains id”“列表模式”三个开关。
6. 点击“复制”获取 XPath，或点击“复制css”获取等价 CSS 选择器。

---

## 安装

> **目前仅提供源码加载方式**，暂无 Chrome 应用商店上架链接。

### 环境要求
- Node.js **20+**（以 `package.json` 的 `engines` 字段为准，Vite 6 要求 Node 20 及以上）

### 本地加载步骤
```bash
# 1. 克隆项目
git clone https://github.com/mic1on/xpath-helper-plus.git
cd xpath-helper-plus

# 2. 安装依赖
npm install

# 3. 构建扩展（产物在 dist/）
npm run build

# 4. Chrome 扩展管理页 → 开发者模式 → 加载已解压的扩展程序 → 选择 dist 目录
```

---

## 开发 / 构建

| 命令 | 说明 |
|------|------|
| `npm run dev` | 监听模式构建（开发时用，修改代码自动重建） |
| `npm run build` | 生产构建，输出到 `dist/`（可直接加载为扩展） |
| `npm run typecheck` | TypeScript 类型检查（`vue-tsc --noEmit`） |
| `npm run test:unit` | 单元测试（`vitest run`） |
| `npm run test:e2e` | 端到端测试 |

### 发布流程
- 版本号单一来源：`package.json` 的 `version` 字段。
- 推送 `v*` 标签（如 `git tag v1.0.8 && git push origin v1.0.8`）触发 GitHub Actions **Build Release** 工作流：
  1. `npm ci` → `typecheck` → `test:unit` → `build`
  2. `scripts/package-release.mjs` 将 `dist/` 打包为 `xpath-helper-plus-v<version>.zip`
  3. 上传为 GitHub Release 附件

---

## 许可证

本项目基于 [Apache License 2.0](./LICENSE) 授权。
