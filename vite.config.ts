import { defineConfig } from 'vite'
import { resolve } from "path"
import { readFileSync } from "fs"
import vue from '@vitejs/plugin-vue'
import copy from "rollup-plugin-copy"
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import UnoCSS from 'unocss/vite'
import { presetUno } from 'unocss'
import { vitePluginCrxReload } from 'vite-plugin-crx-reload'

// package.json is the single source of truth for the extension version.
// The manifest's committed "version" is only a placeholder; it is always
// overwritten with this value when copied into dist at build time.
const { version: pkgVersion } = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8")
)

// The content script is registered in manifest.json as a classic MV3 content
// script, so it cannot resolve ES-module `import` statements at runtime and its
// emitted bundle must be fully self-contained. src/lib/messaging.ts is the
// single source of the shared messaging helpers, imported by both the content
// script and the popup. In one combined Rollup pass, Rollup hoists that shared
// module into its own chunk that the content script would then `import`, which
// both breaks the content script at runtime and violates the isolation intent
// asserted in tests/e2e/manifest.spec.ts. To keep a single *source* of truth
// while emitting a self-contained content script, the build runs in two passes:
//   1. default pass  -> index.html + background.ts (+ manifest/asset copy)
//   2. BUILD_TARGET=content pass -> contentScript.ts as a single entry, so
//      Rollup inlines the messaging module into contentScript.js (no shared
//      chunk / no import).
// See package.json's `build` script, which chains both passes.
const isContentScriptBuild = process.env.BUILD_TARGET === "content"

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    vue(),
    UnoCSS(presetUno()),
    // The manifest/asset copy only needs to run once; attach it to the default
    // (non content-script) pass so the second pass doesn't clobber or duplicate.
    ...(isContentScriptBuild
      ? []
      : [
          copy({
            targets: [
              {
                src: "src/manifest.json",
                dest: "dist",
                // Inject package.json version so maintainers only bump one place.
                transform: (contents) =>
                  contents
                    .toString()
                    .replace(
                      /("version"\s*:\s*)"[^"]*"/,
                      `$1"${pkgVersion}"`
                    ),
              },
              { src: "src/assets", dest: "dist" },
              { src: "src/_locales", dest: "dist" },
              { src: "src/custom.css", dest: "dist" },
            ],
            hook: "writeBundle",
          }),
        ]),
    AutoImport({
      imports: ["vue"],
      dts: "auto-imports.d.ts",
    }),
    Components(),
    vitePluginCrxReload()
  ],
  build: {
    // The default pass empties dist; the content-script pass must append to it.
    emptyOutDir: !isContentScriptBuild,
    rollupOptions: {
      // A single entry for the content-script pass so Rollup inlines the shared
      // messaging module into contentScript.js instead of emitting a chunk.
      input: isContentScriptBuild
        ? { contentScript: "src/contentScript.ts" }
        : ["index.html", "src/background.ts"],
      output: {
        chunkFileNames: "[name].[hash].js",
        assetFileNames: "[name].[hash].[ext]",
        entryFileNames: "[name].js",
        dir: "dist",
      }
    },
  },
})
