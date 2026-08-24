<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import type { XPathResultItem } from '@/types/messages'

const { locale, setLocale, t } = useI18n()

const props = defineProps<{
  modelValue: string
  resultCount: number | null
  items: XPathResultItem[]
  attributes: string[]
  // URL of the frame the current query resolves against (issue #25).
  frameUrl?: string
  frameId: number
  pageConnected: boolean
}>()

const emit = defineEmits(['update:modelValue', 'focus-result', 'append-extraction'])

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

// Show a compact iframe badge only when the active query belongs to a child
// frame (issue #25). When a frame URL is present, surface a compact label so
// the user can see which iframe owns the current query without consuming the
// one. A short label (origin + trailing path segment) keeps it readable.
const frameBadge = computed(() => {
  const url = props.frameUrl
  if (!url || props.frameId === 0) return ''
  try {
    const parsed = new URL(url)
    const lastSeg = parsed.pathname.split('/').filter(Boolean).pop() ?? ''
    return lastSeg ? `${parsed.host}/${lastSeg}` : parsed.host
  } catch {
    return url
  }
})

// Common extraction steps offered first (issue #24). `text()` grabs the node
// text; the rest are frequently-wanted attributes. Real attributes discovered
// on the matched elements are appended after these, de-duplicated, so users get
// one-click access to element-specific attributes like `data-id` or `srcset`.
const BASE_SUGGESTIONS = ['text()', '@href', '@src', '@value']

const suggestions = computed(() => {
  const dynamic = props.attributes.map((name) => `@${name}`)
  return Array.from(new Set([...BASE_SUGGESTIONS, ...dynamic]))
})
</script>

<template>
  <section class="xh-panel xh-panel--result" :aria-label="t('xpathResult')">
    <header class="xh-panel__header">
      <div class="xh-panel__title-group">
        <span class="xh-panel__eyebrow">{{ t('matchedResults') }}</span>
        <span v-show="resultCount" class="xh-count">{{ resultCount }}</span>
      </div>
      <div class="xh-panel__actions">
        <div class="xh-language" role="group" :aria-label="t('language')">
          <button
            class="xh-language__option"
            :class="{ 'xh-language__option--active': locale === 'zh' }"
            type="button"
            :aria-pressed="locale === 'zh'"
            :title="t('chinese')"
            @click="setLocale('zh')"
          >中</button>
          <button
            class="xh-language__option"
            :class="{ 'xh-language__option--active': locale === 'en' }"
            type="button"
            :aria-pressed="locale === 'en'"
            :title="t('english')"
            @click="setLocale('en')"
          >EN</button>
        </div>
        <span
          v-if="frameBadge"
          class="xh-frame-badge"
          :title="t('frameContext', { url: frameUrl ?? '' })"
        >
          iframe: {{ frameBadge }}
        </span>
      </div>
    </header>
    <div v-if="pageConnected" class="xh-extract" role="group" :aria-label="t('appendExtraction')">
      <span class="xh-extract__label">{{ t('appendExtraction') }}</span>
      <button
        v-for="suffix in suggestions"
        :key="suffix"
        class="xh-extract__chip"
        type="button"
        :title="t('appendExtractionTitle', { suffix })"
        @click="emit('append-extraction', suffix)"
      >
        {{ suffix }}
      </button>
    </div>
    <ol v-if="items.length" class="xh-result-list" aria-label="XPath results">
      <li v-for="item in items" :key="item.index">
        <button
          class="xh-result-item"
          type="button"
          :disabled="!pageConnected || item.nodeType === 'other'"
          :title="item.preview"
          @click="emit('focus-result', item.index)"
        >
          <span class="xh-result-item__index">{{ item.index + 1 }}</span>
          <span v-if="item.tagName" class="xh-result-item__tag">&lt;{{ item.tagName }}&gt;</span>
          <span class="xh-result-item__preview">{{ item.preview }}</span>
        </button>
      </li>
    </ol>
    <textarea
      v-else
      class="xh-textarea"
      :aria-label="t('xpathResult')"
      spellcheck="false"
      readonly
      :placeholder="pageConnected ? t('noMatches') : t('pageUnavailableResult')"
      :value="modelValue"
      @input="handleInput"
    ></textarea>
  </section>
</template>

<style src="./panel.css"></style>
