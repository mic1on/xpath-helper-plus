<script setup lang="ts">
import { computed } from 'vue'
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'
import { useI18n } from '@/i18n'
import { useTheme } from '@/composables/useTheme'
import QueryEditorCard from '@/components/panel/QueryEditorCard.vue'
import ResultPreviewCard from '@/components/panel/ResultPreviewCard.vue'

const { locale, setLocale, t } = useI18n()
const { theme, toggleTheme } = useTheme()

const toggleLocale = () => setLocale(locale.value === 'zh' ? 'en' : 'zh')
const {
  xpathRule,
  xpathBatch,
  xpathResult,
  xpathResultCount,
  xpathResultItems,
  xpathAttributes,
  activeFrameId,
  activeFrameUrl,
  connectionStatus,
  isPageConnected,
  isSupported,
  handleBatch,
  handleFocusResult,
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
      <div class="xh-header-tools">
        <button
          class="xh-icon-btn"
          type="button"
          :aria-label="t('switchLanguage')"
          :title="locale === 'zh' ? t('english') : t('chinese')"
          @click="toggleLocale"
        >
          <span class="xh-icon-btn__glyph">{{ locale === 'zh' ? '中' : 'EN' }}</span>
        </button>
        <button
          class="xh-icon-btn"
          type="button"
          :aria-label="t('theme')"
          :title="theme === 'dark' ? t('switchToLight') : t('switchToDark')"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" class="xh-icon-btn__svg" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 3a1 1 0 0 1 .96 1.28A7 7 0 0 0 19.72 13a1 1 0 0 1 1.05 1.5A9 9 0 1 1 9.5 2.23 1 1 0 0 1 12 3Z"
            />
          </svg>
          <svg v-else class="xh-icon-btn__svg" viewBox="0 0 24 24" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
              <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
            </g>
          </svg>
        </button>
        <span
          class="xh-status"
          :class="`xh-status--${connectionStatus}`"
          role="status"
          :aria-label="statusLabel"
          :title="statusLabel"
        >
          <span class="xh-status__dot" aria-hidden="true"></span>
        </span>
      </div>
    </header>

    <div v-if="connectionStatus === 'unavailable'" class="xh-unavailable" role="note">
      <strong>{{ t('pageUnavailableTitle') }}</strong>
      <span>{{ t('pageUnavailableDescription') }}</span>
    </div>

    <QueryEditorCard
      v-model="xpathRule"
      :xpath-batch="xpathBatch"
      :is-supported="isSupported"
      :query-history="queryHistory"
      :page-connected="isPageConnected"
      @update:xpath-batch="handleBatch"
      @copy="handleCopy"
      @to-css="handleToCss"
      @select-history="(query: string) => (xpathRule = query)"
      @clear-history="clearQueryHistory"
      @toggle-pin="toggleQueryPin"
      @run-query="runQuery"
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
  align-content: start;
  width: 100%;
  max-width: 720px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 8px 14px 24px;
}

.xh-product-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px 2px;
}

.xh-header-tools {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
}

.xh-icon-btn {
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  border: 1px solid var(--xh-border);
  border-radius: 6px;
  color: var(--xh-text-body);
  background: var(--xh-control);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.xh-icon-btn:hover {
  border-color: var(--xh-border-strong);
  color: var(--xh-accent);
  background: var(--xh-control-hover);
}

.xh-icon-btn__glyph {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.xh-icon-btn__svg {
  width: 16px;
  height: 16px;
}

.xh-kicker {
  margin: 0 0 4px;
  color: var(--xh-accent);
  font-family: "SF Mono", "Cascadia Code", Menlo, monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0;
}

h1 {
  margin: 0;
  color: var(--xh-text);
  font-size: 18px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.2;
}

.xh-status {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 24px;
  height: 24px;
  cursor: help;
}

.xh-status__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--xh-text-muted);
  animation: xh-breathe 2s ease-in-out infinite;
}

.xh-status--connected .xh-status__dot {
  background: var(--xh-accent);
  box-shadow: 0 0 0 0 var(--xh-accent-glow);
  animation: xh-breathe-connected 2.4s ease-in-out infinite;
}

.xh-status--connecting .xh-status__dot {
  background: var(--xh-amber);
  box-shadow: 0 0 0 0 rgba(217, 170, 98, 0.35);
  animation: xh-breathe-connecting 1.1s ease-in-out infinite;
}

.xh-status--unavailable .xh-status__dot {
  background: var(--xh-danger);
  box-shadow: 0 0 0 0 rgba(216, 118, 97, 0.35);
  animation: xh-breathe-unavailable 1.6s ease-in-out infinite;
}

.xh-unavailable {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-left: 3px solid var(--xh-danger);
  color: var(--xh-text-body);
  background: var(--xh-raised);
  font-size: 11px;
  line-height: 1.45;
}

.xh-unavailable strong {
  color: var(--xh-danger);
  font-size: 12px;
}

@keyframes xh-breathe {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@keyframes xh-breathe-connected {
  0%, 100% { opacity: 0.65; box-shadow: 0 0 0 0 var(--xh-accent-glow); }
  50% { opacity: 1; box-shadow: 0 0 0 4px transparent; }
}

@keyframes xh-breathe-connecting {
  0%, 100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(217, 170, 98, 0.35); }
  50% { opacity: 1; box-shadow: 0 0 0 4px transparent; }
}

@keyframes xh-breathe-unavailable {
  0%, 100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(216, 118, 97, 0.35); }
  50% { opacity: 1; box-shadow: 0 0 0 4px transparent; }
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
