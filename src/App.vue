<script setup lang="ts">
  const size = 'small'
  const zIndex = 100
</script>

<template>
  <div class="bg-gray-50">
    <el-config-provider :size="size" :z-index="zIndex">
      <Home />
    </el-config-provider>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
}
</style>
