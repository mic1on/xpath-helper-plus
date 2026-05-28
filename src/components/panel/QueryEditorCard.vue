<script setup lang="ts">
defineProps<{
  modelValue: string
  xpathShort: boolean
  xpathBatch: boolean
  isSupported: boolean
}>()

const emit = defineEmits(['update:modelValue', 'update:xpathShort', 'update:xpathBatch', 'copy', 'toCss'])
</script>

<template>
  <div>
    <el-row justify="space-between">
      <el-col :span="12" class="text-left h-5">
        <el-space wrap>
          <span class="text-size-2">XPATH</span>
          <el-checkbox :model-value="xpathShort" @change="emit('update:xpathShort', $event)"
            >精简xpath</el-checkbox
          >
          <el-checkbox :model-value="xpathBatch" @change="emit('update:xpathBatch', $event)"
            >列表模式</el-checkbox
          >
        </el-space>
      </el-col>
      <el-col :span="12" class="text-right">
        <el-space wrap alignment="flex-start">
          <el-button type="primary" link @click="emit('copy')" v-if="isSupported">复制</el-button>
          <el-tooltip effect="light" content="将xpath语句转为css选择器" placement="bottom">
            <el-button type="primary" link @click="emit('toCss')" v-if="isSupported">复制css</el-button>
          </el-tooltip>
        </el-space>
      </el-col>
    </el-row>
    <el-input
      type="textarea"
      :model-value="modelValue"
      @input="emit('update:modelValue', $event)"
      rows="4"
    />
  </div>
</template>