<script setup lang="ts">
defineProps<{
  modelValue: string
  resultCount: number | null
}>()

const emit = defineEmits(['update:modelValue', 'position'])

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
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
