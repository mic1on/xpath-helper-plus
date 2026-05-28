<script setup lang="ts">
defineProps<{
  modelValue: string
  resultCount: number | null
}>()

const emit = defineEmits(['update:modelValue', 'position'])
</script>

<template>
  <div>
    <el-row justify="space-between">
      <el-col :span="12" class="text-left h-5">
        <el-space wrap>
          <span class="text-size-2">匹配结果</span>
          <span v-show="resultCount">{{ resultCount }}</span>
        </el-space>
      </el-col>
      <el-col :span="12" class="text-right">
        <el-button link @click="emit('position')">换个位置</el-button>
      </el-col>
    </el-row>
    <el-input
      type="textarea"
      :model-value="modelValue"
      @input="emit('update:modelValue', $event)"
      rows="4"
      class="!resize-none"
    />
  </div>
</template>