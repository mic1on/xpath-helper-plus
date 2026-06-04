<script setup lang="ts">
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'
import QueryEditorCard from '@/components/panel/QueryEditorCard.vue'
import ResultPreviewCard from '@/components/panel/ResultPreviewCard.vue'

const {
  xpathRule,
  xpathShort,
  xpathBatch,
  xpathResult,
  xpathResultCount,
  isSupported,
  handleShort,
  handleBatch,
  handlePosition,
  handleCopy,
  handleToCss,
} = useXPathWorkbench()
</script>

<template>
  <div class="xh-workbench">
    <QueryEditorCard
      v-model="xpathRule"
      :xpath-short="xpathShort"
      :xpath-batch="xpathBatch"
      :is-supported="isSupported"
      @update:xpath-short="handleShort"
      @update:xpath-batch="handleBatch"
      @copy="handleCopy"
      @to-css="handleToCss"
    />
    <ResultPreviewCard
      v-model="xpathResult"
      :result-count="xpathResultCount"
      @position="handlePosition"
    />
  </div>
</template>

<style scoped>
.xh-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  width: 100%;
}

@media (max-width: 760px) {
  .xh-workbench {
    grid-template-columns: 1fr;
  }
}
</style>
