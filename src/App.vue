<script setup lang="ts">
  const size = 'small'
  const zIndex = 100
</script>

<template>
  <el-config-provider :size="size" :z-index="zIndex">
    <Home />
  </el-config-provider>
</template>