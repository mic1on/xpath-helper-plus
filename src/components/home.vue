<script setup lang="ts">
import { useXPathWorkbench } from '@/composables/useXPathWorkbench'
import QueryEditorCard from '@/components/panel/QueryEditorCard.vue'
import ResultPreviewCard from '@/components/panel/ResultPreviewCard.vue'

const {
  xpathRule,
  xpathShort,
  xpathBatch,
  xpathResult,
  xpathResultCount,
  isSupported,
  handleShort,
  handleBatch,
  handlePosition,
  handleCopy,
  handleToCss,
} = useXPathWorkbench()
</script>

<template>
  <div>
    <el-row :gutter="20" class="!m-0">
      <el-col :span="12">
        <QueryEditorCard
          v-model="xpathRule"
          :xpath-short="xpathShort"
          :xpath-batch="xpathBatch"
          :is-supported="isSupported"
          @update:xpath-short="handleShort"
          @update:xpath-batch="handleBatch"
          @copy="handleCopy"
          @to-css="handleToCss"
        />
      </el-col>
      <el-col :span="12">
        <ResultPreviewCard
          v-model="xpathResult"
          :result-count="xpathResultCount"
          @position="handlePosition"
        />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
:deep(.el-textarea .el-textarea__inner) {
  resize: none;
}
</style>