<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  resultCount: number | null
  attributes: string[]
}>()

const emit = defineEmits(['update:modelValue', 'position', 'append-extraction'])

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

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
    <textarea
      class="xh-textarea"
      aria-label="XPath result"
      spellcheck="false"
      :value="modelValue"
      @input="handleInput"
    ></textarea>
  </section>
</template>

<style src="./panel.css"></style>
