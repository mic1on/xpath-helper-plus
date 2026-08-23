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
        { src: "src/custom.css", dest: "dist" },
      ],
      hook: "writeBundle",
    }),
    AutoImport({
      imports: ["vue"],
      dts: "auto-imports.d.ts",
    }),
    Components(),
    vitePluginCrxReload()
  ],
  build: {
    rollupOptions: {
      input: ["index.html", "src/background.ts", "src/contentScript.ts"],
      output: {
        chunkFileNames: "[name].[hash].js",
        assetFileNames: "[name].[hash].[ext]",
        entryFileNames: "[name].js",
        dir: "dist",
      }
    },
  },
})
