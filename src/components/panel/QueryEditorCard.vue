<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface HistoryItem {
  query: string
  timestamp: number
  pinned?: boolean
}

defineProps<{
  modelValue: string
  xpathShort: boolean
  xpathBatch: boolean
  xpathContainsId: boolean
  isSupported: boolean
  queryHistory: HistoryItem[]
}>()

const emit = defineEmits([
  'update:modelValue',
  'update:xpathShort',
  'update:xpathBatch',
  'update:xpathContainsId',
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

const handleShortChange = (event: Event) => {
  emit('update:xpathShort', (event.target as HTMLInputElement).checked)
}

const handleBatchChange = (event: Event) => {
  emit('update:xpathBatch', (event.target as HTMLInputElement).checked)
}

const handleContainsIdChange = (event: Event) => {
  emit('update:xpathContainsId', (event.target as HTMLInputElement).checked)
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

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString()
}
</script>

<template>
  <section class="xh-panel xh-panel--editor" aria-label="XPath editor">
    <header class="xh-panel__header">
      <div class="xh-panel__title-group">
        <span class="xh-panel__eyebrow">XPATH</span>
        <label class="xh-toggle">
          <input
            type="checkbox"
            :checked="xpathShort"
            @change="handleShortChange"
          />
          <span class="xh-toggle__track" aria-hidden="true"></span>
          <span>精简xpath</span>
        </label>
        <label class="xh-toggle xh-toggle--sub" :class="{ 'xh-toggle--disabled': !xpathShort }">
          <input
            type="checkbox"
            :checked="xpathContainsId"
            :disabled="!xpathShort"
            @change="handleContainsIdChange"
          />
          <span class="xh-toggle__track" aria-hidden="true"></span>
          <span>contains id</span>
        </label>
        <label class="xh-toggle">
          <input
            type="checkbox"
            :checked="xpathBatch"
            @change="handleBatchChange"
          />
          <span class="xh-toggle__track" aria-hidden="true"></span>
          <span>列表模式</span>
        </label>
      </div>
      <div v-if="isSupported" class="xh-panel__actions">
        <button class="xh-action" type="button" @click="emit('copy')">复制</button>
        <button
          class="xh-action xh-action--accent"
          type="button"
          title="将xpath语句转为css选择器"
          @click="emit('toCss')"
        >
          复制css
        </button>
        <div class="xh-history-trigger">
          <button
            class="xh-action xh-action--ghost"
            type="button"
            @click="showHistory = !showHistory"
            :aria-expanded="showHistory"
            aria-haspopup="listbox"
            title="查询历史 (最多 20 条)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="xh-history-count" v-if="queryHistory.length">{{ queryHistory.length }}</span>
          </button>
          <transition name="xh-history-fade">
            <div v-show="showHistory" ref="dropdownRef" class="xh-history-dropdown">
              <div class="xh-history-dropdown__header">
                <span>查询历史</span>
                <button
                  v-if="queryHistory.length"
                  class="xh-history-clear"
                  type="button"
                  @click="handleClearHistory"
                  title="清空历史"
                >
                  清空
                </button>
              </div>
              <ul class="xh-history-list" role="listbox" aria-label="历史查询列表">
                <li v-for="item in queryHistory" :key="item.query" class="xh-history-item" :class="{ 'xh-history-item--pinned': item.pinned }" role="option" @click="selectHistoryItem(item.query)">
                  <span class="xh-history-item__pin" @click="handleTogglePin(item.query, $event)" :title="item.pinned ? '取消置顶' : '置顶'">
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
                <li v-if="!queryHistory.length" class="xh-history-empty">暂无历史记录</li>
              </ul>
            </div>
          </transition>
        </div>
      </div>
    </header>
    <textarea
      class="xh-textarea"
      aria-label="XPath rule"
      spellcheck="false"
      :value="modelValue"
      @input="handleInput"
      @keydown="handleKeyDown"
    ></textarea>
  </section>
</template>

<style src="./panel.css"></style>