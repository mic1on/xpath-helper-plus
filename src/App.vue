<script setup lang="ts">
import Home from '@/components/home.vue'

const size = 'small'
const zIndex = 100
</script>

<template>
  <div class="bg-gray-50 min-h-screen">
    <el-config-provider :size="size" :z-index="zIndex">
      <div class="p-4">
        <Home />
      </div>
    </el-config-provider>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
}
</style>