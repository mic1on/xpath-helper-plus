<script setup lang="ts">
import Home from '@/components/home.vue'
</script>

<template>
  <div class="xh-app-shell">
    <div class="xh-grid-glow" aria-hidden="true"></div>
    <div class="xh-workspace">
      <Home />
    </div>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
}

* {
  box-sizing: border-box;
}

button,
textarea,
input {
  font: inherit;
}

body {
  color: #d8fff7;
  background: transparent;
}
</style>

<style scoped>
.xh-app-shell {
  position: relative;
  min-height: max(120px, 100vh);
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 0%, rgba(56, 189, 248, 0.28), transparent 28%),
    radial-gradient(circle at 82% 100%, rgba(45, 212, 191, 0.2), transparent 30%),
    linear-gradient(135deg, #071016 0%, #0a1720 48%, #081118 100%);
  isolation: isolate;
}

.xh-grid-glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(125, 249, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 249, 255, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.xh-grid-glow::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(125, 249, 255, 0.14), transparent);
  transform: translateX(-60%);
  animation: xh-scan 5s ease-in-out infinite;
}

.xh-workspace {
  position: relative;
  z-index: 1;
  min-height: max(120px, 100vh);
  padding: 10px 12px;
}

@keyframes xh-scan {
  0%,
  45% {
    transform: translateX(-60%);
    opacity: 0;
  }

  60% {
    opacity: 1;
  }

  100% {
    transform: translateX(60%);
    opacity: 0;
  }
}
</style>
