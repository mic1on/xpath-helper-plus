<script setup lang="ts">
import Home from '@/components/home.vue'
</script>

<template>
  <main class="xh-app-shell">
    <Home />
  </main>
</template>

<style>
:root {
  color: #e8eceb;
  background: #101413;
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
  color: #e8eceb;
  background: #101413;
}

button:focus-visible,
textarea:focus-visible,
input:focus-visible {
  outline: 2px solid #56c8b7;
  outline-offset: 2px;
}
</style>

<style scoped>
.xh-app-shell {
  min-height: 100vh;
  background:
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    #101413;
  background-size: 100% 32px;
}
</style>
