import { defineConfig } from 'vite'
import { sharedConfig } from './vite.config.mts'
import { isDev, r } from './scripts/utils'
import packageJson from './package.json'

export default defineConfig({
  ...sharedConfig,
  define: {
    __DEV__: isDev,
    __NAME__: JSON.stringify(packageJson.name),
    'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
  },
  build: {
    watch: isDev ? {} : undefined,
    outDir: r('extension/dist/contentScripts'),
    cssCodeSplit: false,
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    lib: {
      entry: r('src/contentScripts/index.ts'),
      name: packageJson.name,
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.global.js',
        assetFileNames: assetInfo => assetInfo.name?.endsWith('.css') ? 'style.css' : '[name][extname]',
        extend: true,
      },
    },
  },
})
