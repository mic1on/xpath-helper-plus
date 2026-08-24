import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Dedicated Vitest config kept separate from vite.config.ts:
// the app build uses Vite plugins (crx reload, unocss, etc.) that are not
// needed - and not necessarily compatible with - the Vite that Vitest bundles.
// Here we only need the DOM environment and the "@" -> "src" path alias so that
// the pure logic in src/xpath.ts resolves and can run against a synthetic DOM.
//
// Environment note: we use jsdom rather than happy-dom because jsdom provides a
// working document.evaluate (XPath) implementation. happy-dom (as of v12) has
// no document.evaluate, which the toShort uniqueness checks in xpath.ts rely on
// via countXPathMatches(). See tests/unit/xpath.spec.ts for details.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
  },
})
