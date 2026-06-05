<script setup lang="ts">
defineProps<{
  modelValue: string
  xpathShort: boolean
  xpathBatch: boolean
  xpathContainsId: boolean
  isSupported: boolean
}>()

const emit = defineEmits([
  'update:modelValue',
  'update:xpathShort',
  'update:xpathBatch',
  'update:xpathContainsId',
  'copy',
  'toCss',
])

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
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
      </div>
    </header>
    <textarea
      class="xh-textarea"
      aria-label="XPath rule"
      spellcheck="false"
      :value="modelValue"
      @input="handleInput"
    ></textarea>
  </section>
</template>

<style src="./panel.css"></style>
