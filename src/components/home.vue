<script setup lang="ts">
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'
import QueryEditorCard from '@/components/panel/QueryEditorCard.vue'
import ResultPreviewCard from '@/components/panel/ResultPreviewCard.vue'

const {
  xpathRule,
  xpathShort,
  xpathBatch,
  xpathContainsId,
  xpathResult,
  xpathResultCount,
  isSupported,
  handleShort,
  handleBatch,
  handleContainsId,
  handlePosition,
  handleCopy,
  handleToCss,
  queryHistory,
  clearQueryHistory,
  toggleQueryPin,
} = useXPathWorkbench()
</script>

<template>
  <div class="xh-workbench">
    <QueryEditorCard
      v-model="xpathRule"
      :xpath-short="xpathShort"
      :xpath-batch="xpathBatch"
      :xpath-contains-id="xpathContainsId"
      :is-supported="isSupported"
      :query-history="queryHistory"
      @update:xpath-short="handleShort"
      @update:xpath-batch="handleBatch"
      @update:xpath-contains-id="handleContainsId"
      @copy="handleCopy"
      @to-css="handleToCss"
      @select-history="(q: string) => (xpathRule = q)"
      @clear-history="clearQueryHistory"
      @toggle-pin="toggleQueryPin"
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

@media (max-width: 600px) {
  .xh-workbench {
    grid-template-columns: 1fr;
  }
}
</style>