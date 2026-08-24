<script setup lang="ts">
import { computed } from 'vue'
import type { XPathResultItem } from '@/types/messages'

const props = defineProps<{
  modelValue: string
  resultCount: number | null
  items: XPathResultItem[]
  attributes: string[]
  // URL of the frame the current query resolves against (issue #25). Empty or
  // the top document => no iframe badge is shown.
  frameUrl?: string
}>()

const emit = defineEmits(['update:modelValue', 'position', 'focus-result', 'append-extraction'])

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

// Show a compact iframe badge only when the active query belongs to a child
// frame (issue #25). We compare against the popup's own top-level location: if
// the frame URL differs, the selection came from an iframe, so surface which
// one. A short label (origin + trailing path segment) keeps it readable.
const frameBadge = computed(() => {
  const url = props.frameUrl
  if (!url) return ''
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
  <section class="xh-panel xh-panel--result" aria-label="XPath result preview">
    <header class="xh-panel__header">
      <div class="xh-panel__title-group">
        <span class="xh-panel__eyebrow">匹配结果</span>
        <span v-show="resultCount" class="xh-count">{{ resultCount }}</span>
      </div>
      <div class="xh-panel__actions">
        <span
          v-if="frameBadge"
          class="xh-frame-badge"
          :title="`当前 XPath 相对于 iframe: ${frameUrl}`"
        >
          iframe: {{ frameBadge }}
        </span>
        <button class="xh-action" type="button" @click="emit('position')">换个位置</button>
      </div>
    </header>
    <div class="xh-extract" role="group" aria-label="追加提取">
      <span class="xh-extract__label">追加提取</span>
      <button
        v-for="suffix in suggestions"
        :key="suffix"
        class="xh-extract__chip"
        type="button"
        :title="`在当前 xpath 末尾追加 /${suffix}`"
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
          :disabled="item.nodeType === 'other'"
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
      aria-label="XPath result"
      spellcheck="false"
      :value="modelValue"
      @input="handleInput"
    ></textarea>
  </section>
</template>

<style src="./panel.css"></style>
