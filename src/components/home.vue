<script setup lang="ts">
import { computed } from 'vue'
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'
import { useI18n } from '@/i18n'
import QueryEditorCard from '@/components/panel/QueryEditorCard.vue'
import ResultPreviewCard from '@/components/panel/ResultPreviewCard.vue'

const { t } = useI18n()
const {
  xpathRule,
  xpathShort,
  xpathBatch,
  xpathContainsId,
  xpathResult,
  xpathResultCount,
  xpathResultItems,
  xpathAttributes,
  xpathContextActive,
  activeFrameId,
  activeFrameUrl,
  connectionStatus,
  isPageConnected,
  isSupported,
  handleShort,
  handleBatch,
  handleContainsId,
  handleFocusResult,
  handleSetContext,
  handleClearContext,
  handleCopy,
  handleToCss,
  handleAppendExtraction,
  queryHistory,
  clearQueryHistory,
  toggleQueryPin,
  runQuery,
} = useXPathWorkbench()

const statusLabel = computed(() => {
  if (connectionStatus.value === 'connected') return t('pageConnected')
  if (connectionStatus.value === 'connecting') return t('pageConnecting')
  return t('pageUnavailable')
})
</script>

<template>
  <div class="xh-workbench">
    <header class="xh-product-header">
      <div>
        <p class="xh-kicker">DOM INSPECTOR</p>
        <h1>XPath Helper Plus</h1>
      </div>
      <div class="xh-status" :class="`xh-status--${connectionStatus}`" role="status">
        <span class="xh-status__dot" aria-hidden="true"></span>
        {{ statusLabel }}
      </div>
    </header>

    <div v-if="connectionStatus === 'unavailable'" class="xh-unavailable" role="note">
      <strong>{{ t('pageUnavailableTitle') }}</strong>
      <span>{{ t('pageUnavailableDescription') }}</span>
    </div>

    <QueryEditorCard
      v-model="xpathRule"
      :xpath-short="xpathShort"
      :xpath-batch="xpathBatch"
      :xpath-contains-id="xpathContainsId"
      :is-supported="isSupported"
      :query-history="queryHistory"
      :context-active="xpathContextActive"
      :page-connected="isPageConnected"
      @update:xpath-short="handleShort"
      @update:xpath-batch="handleBatch"
      @update:xpath-contains-id="handleContainsId"
      @copy="handleCopy"
      @to-css="handleToCss"
      @select-history="(query: string) => (xpathRule = query)"
      @clear-history="clearQueryHistory"
      @toggle-pin="toggleQueryPin"
      @run-query="runQuery"
      @set-context="handleSetContext"
      @clear-context="handleClearContext"
    />
    <ResultPreviewCard
      v-model="xpathResult"
      :result-count="xpathResultCount"
      :items="xpathResultItems"
      :attributes="xpathAttributes"
      :frame-url="activeFrameUrl"
      :frame-id="activeFrameId"
      :page-connected="isPageConnected"
      @focus-result="handleFocusResult"
      @append-extraction="handleAppendExtraction"
    />
  </div>
</template>

<style scoped>
.xh-workbench {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 720px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 16px 14px 24px;
}

.xh-product-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 2px 4px;
}

.xh-kicker {
  margin: 0 0 4px;
  color: #73a39c;
  font-family: "SF Mono", "Cascadia Code", Menlo, monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0;
}

h1 {
  margin: 0;
  color: #f2f5f4;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.2;
}

.xh-status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 4px 8px;
  border: 1px solid #34413e;
  border-radius: 4px;
  color: #9ba8a5;
  background: #181d1c;
  font-size: 10px;
  font-weight: 600;
}

.xh-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ba8a5;
}

.xh-status--connected {
  border-color: #2f5b52;
  color: #86d7c8;
}

.xh-status--connected .xh-status__dot {
  background: #56c8b7;
  box-shadow: 0 0 0 3px rgba(86, 200, 183, 0.12);
}

.xh-status--connecting .xh-status__dot {
  background: #d9aa62;
  animation: xh-pulse 1.2s ease-in-out infinite;
}

.xh-status--unavailable {
  border-color: #654942;
  color: #e5a08f;
}

.xh-status--unavailable .xh-status__dot {
  background: #d87661;
}

.xh-unavailable {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-left: 3px solid #d87661;
  color: #c7cecc;
  background: #1c201f;
  font-size: 11px;
  line-height: 1.45;
}

.xh-unavailable strong {
  color: #f0d2cb;
  font-size: 12px;
}

@keyframes xh-pulse {
  50% { opacity: 0.35; }
}

@media (max-width: 340px) {
  .xh-workbench {
    padding-inline: 10px;
  }

  .xh-product-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
