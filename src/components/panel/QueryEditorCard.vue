<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/i18n'

interface HistoryItem {
  query: string
  timestamp: number
  pinned?: boolean
}

defineProps<{
  modelValue: string
  xpathBatch: boolean
  isSupported: boolean
  queryHistory: HistoryItem[]
  pageConnected: boolean
}>()

const { locale, t } = useI18n()

const emit = defineEmits([
  'update:modelValue',
  'update:xpathBatch',
  'copy',
  'toCss',
  'select-history',
  'clear-history',
  'toggle-pin',
  'run-query',
])

const showHistory = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

const handleKeyDown = (event: KeyboardEvent) => {
  // Enter key (without Shift) runs the query
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('run-query')
  }
}

const handleBatchChange = (event: Event) => {
  emit('update:xpathBatch', (event.target as HTMLInputElement).checked)
}

const selectHistoryItem = (query: string) => {
  emit('select-history', query)
  showHistory.value = false
}

const handleClearHistory = () => {
  emit('clear-history')
  showHistory.value = false
}

const handleTogglePin = (query: string, event: Event) => {
  event.stopPropagation()
  emit('toggle-pin', query)
}

// Click outside to close dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showHistory.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('justNow')
  if (diffMins < 60) return t('minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('hoursAgo', { count: diffHours })
  if (diffDays < 7) return t('daysAgo', { count: diffDays })
  return date.toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US')
}
</script>

<template>
  <section class="xh-panel xh-panel--editor" :aria-label="t('xpathEditor')">
    <header class="xh-panel__header">
      <div class="xh-panel__title-group">
        <span class="xh-panel__eyebrow">XPATH</span>
        <label class="xh-toggle">
          <input
            type="checkbox"
            :checked="xpathBatch"
            @change="handleBatchChange"
          />
          <span class="xh-toggle__track" aria-hidden="true"></span>
          <span>{{ t('listMode') }}</span>
        </label>
      </div>
      <div v-if="isSupported" class="xh-panel__actions">
        <button class="xh-action" type="button" @click="emit('copy')">{{ t('copy') }}</button>
        <button
          class="xh-action xh-action--accent"
          type="button"
          :title="t('copyCssTitle')"
          @click="emit('toCss')"
        >
          {{ t('copyCss') }}
        </button>
        <div ref="dropdownRef" class="xh-history-trigger">
          <button
            class="xh-action xh-action--ghost"
            type="button"
            @click="showHistory = !showHistory"
            :aria-expanded="showHistory"
            aria-haspopup="listbox"
            :title="t('historyTitle')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="xh-history-count" v-if="queryHistory.length">{{ queryHistory.length }}</span>
          </button>
          <transition name="xh-history-fade">
            <div v-show="showHistory" class="xh-history-dropdown">
              <div class="xh-history-dropdown__header">
                <span>{{ t('queryHistory') }}</span>
                <button
                  v-if="queryHistory.length"
                  class="xh-history-clear"
                  type="button"
                  @click="handleClearHistory"
                  :title="t('clearHistoryTitle')"
                >
                  {{ t('clear') }}
                </button>
              </div>
              <ul class="xh-history-list" role="listbox" :aria-label="t('historyList')">
                <li v-for="item in queryHistory" :key="item.query" class="xh-history-item" :class="{ 'xh-history-item--pinned': item.pinned }" role="option" @click="selectHistoryItem(item.query)">
                  <span class="xh-history-item__pin" @click="handleTogglePin(item.query, $event)" :title="item.pinned ? t('unpin') : t('pin')">
                    <svg v-if="item.pinned" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 17l-5-3v-7l5-3 5 3v7-5 3z" />
                    </svg>
                    <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M12 17v-5" />
                      <path d="M9 12l3-3 3 3" />
                      <path d="M9 6l3-3 3 3" />
                      <path d="M15 6v12" />
                    </svg>
                  </span>
                  <span class="xh-history-item__query" :title="item.query">{{ item.query }}</span>
                  <span class="xh-history-item__time">{{ formatTime(item.timestamp) }}</span>
                </li>
                <li v-if="!queryHistory.length" class="xh-history-empty">{{ t('noHistory') }}</li>
              </ul>
            </div>
          </transition>
        </div>
      </div>
    </header>
    <textarea
      class="xh-textarea"
      :aria-label="t('xpathRule')"
      spellcheck="false"
      :disabled="!pageConnected"
      :value="modelValue"
      @input="handleInput"
      @keydown="handleKeyDown"
    ></textarea>
  </section>
</template>

<style src="./panel.css"></style>