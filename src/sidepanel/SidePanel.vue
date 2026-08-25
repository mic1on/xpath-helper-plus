<script setup lang="ts">
import Home from '@/components/home.vue'
</script>

<template>
  <main class="xh-app-shell">
    <Home />
  </main>
</template>

<style>
:root,
:root[data-theme="dark"] {
  --xh-page: #101413;
  --xh-surface: #171c1b;
  --xh-raised: #1a201e;
  --xh-inset: #0f1312;
  --xh-control: #222826;
  --xh-control-hover: #29312f;
  --xh-border: #303a38;
  --xh-border-strong: #4e5968;
  --xh-text: #e8eceb;
  --xh-text-body: #c7cecc;
  --xh-text-muted: #91a09c;
  --xh-text-faint: #77837f;
  --xh-accent: #72cdbd;
  --xh-accent-border: #37776c;
  --xh-accent-bg: #1e3934;
  --xh-accent-glow: rgba(86, 200, 183, 0.12);
  --xh-on-accent: #101413;
  --xh-amber: #d9aa62;
  --xh-amber-border: #9a6b2d;
  --xh-amber-bg: #392c1d;
  --xh-danger: #d87661;
  --xh-danger-border: #654942;
  --xh-grid-line: rgba(255, 255, 255, 0.018);
  --xh-scanline: #101413;
}

:root[data-theme="light"] {
  --xh-page: #f4f6f5;
  --xh-surface: #ffffff;
  --xh-raised: #eef1f0;
  --xh-inset: #f8faf9;
  --xh-control: #eef1f0;
  --xh-control-hover: #e2e7e5;
  --xh-border: #d3dad7;
  --xh-border-strong: #b4bfbb;
  --xh-text: #1b2321;
  --xh-text-body: #3a4340;
  --xh-text-muted: #5f6b67;
  --xh-text-faint: #8a938f;
  --xh-accent: #1c8574;
  --xh-accent-border: #58b3a4;
  --xh-accent-bg: #d9f0eb;
  --xh-accent-glow: rgba(28, 133, 116, 0.16);
  --xh-on-accent: #ffffff;
  --xh-amber: #a9701f;
  --xh-amber-border: #d3a35a;
  --xh-amber-bg: #f7ecd7;
  --xh-danger: #c0492f;
  --xh-danger-border: #e0a99b;
  --xh-grid-line: rgba(0, 0, 0, 0.02);
  --xh-scanline: #f4f6f5;
}

:root {
  color: var(--xh-text);
  background: var(--xh-page);
  font-family: Avenir, "Avenir Next", "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

html,
body,
#app {
  min-width: 280px;
  min-height: 100%;
  margin: 0;
}

* {
  box-sizing: border-box;
}

button,
textarea,
input {
  font: inherit;
}

button,
label,
input {
  -webkit-tap-highlight-color: transparent;
}

body {
  min-height: 100vh;
  overflow-x: hidden;
  color: var(--xh-text);
  background: var(--xh-page);
}

button:focus-visible,
textarea:focus-visible,
input:focus-visible {
  outline: 2px solid var(--xh-accent);
  outline-offset: 2px;
}
</style>

<style scoped>
.xh-app-shell {
  min-height: 100vh;
  background:
    linear-gradient(var(--xh-grid-line) 1px, transparent 1px),
    var(--xh-scanline);
  background-size: 100% 32px;
}
</style>
