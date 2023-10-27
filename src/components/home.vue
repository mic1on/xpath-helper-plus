<script setup lang="ts">
import { sendMessageToContentScript } from "@/utils"
import { useLocalStorage, useClipboard } from "@vueuse/core"
import xPathToCss from "xpath-to-css"

const { isSupported, copy } = useClipboard()
const mode = ref<string>("xpath")
const xpathRule = ref<string>("string('xpath helper plus')")
const xpathShort = useLocalStorage<boolean>("xpathShort", false)
const xpathBatch = useLocalStorage<boolean>("xpathBatch", false)
const xpathResult = ref<string>("");
const xpathResultCount = ref<number | null>(null);

watch(() => xpathRule.value, () => {
  sendMessageToContentScript(
    { cmd: mode.value, value: xpathRule.value },
    function (response: any) {
      xpathResult.value = response[0];
      xpathResultCount.value = response[1];
    });
}, { immediate: true });

const handleShort = (v: boolean) => {
  xpathShort.value = v
  sendMessageToContentScript(
    { cmd: "short", value: xpathShort.value }
  )
}
const handleBatch = (v: boolean) => {
  xpathBatch.value = v
  sendMessageToContentScript(
    { cmd: "batch", value: xpathBatch.value }
  )
}
const handlePosition = (v: string) => {
  sendMessageToContentScript(
    { cmd: "position" }
  )
}
handleShort(xpathShort.value)
const handleCopy = () => {
  copy(xpathRule.value)
}
const handleToCss = () => {
  const cssRule = xPathToCss(xpathRule.value)
  copy(cssRule)
}

// 接收来自content-script的消息
chrome?.runtime && chrome.runtime.onMessage.addListener(function (request: any, sender: any, sendResponse: any) {
  if (request.query) {
    console.log(request.query)
    xpathRule.value = request.query
  }
});
</script>

<template>
  <div>
    <el-row :gutter="20" class="!m-0">
      <el-col :span="12">
        <el-row justify="space-between">
          <el-col :span="12" class="text-left h-5">
            <el-space wrap>
              <span class="text-size-2">XPATH</span>
              <el-checkbox v-model="xpathShort" @change="handleShort">精简xpath</el-checkbox>
              <el-checkbox v-model="xpathBatch" @change="handleBatch">列表模式</el-checkbox>
            </el-space>
          </el-col>
          <el-col :span="12" class="text-right">
            <el-space wrap alignment="flex-start">
              <el-button type="primary" link @click="handleCopy" v-if="isSupported">复制</el-button>
              <el-tooltip effect="light" content="将xpath语句转为css选择器" placement="bottom">
                <el-button type="primary" link @click="handleToCss" v-if="isSupported">复制css</el-button>
              </el-tooltip>
            </el-space>
          </el-col>
        </el-row>
        <el-input type="textarea" v-model="xpathRule" rows="4" />
      </el-col>
      <el-col :span="12">
        <el-row justify="space-between">
          <el-col :span="12" class="text-left h-5">
            <el-space wrap>
              <span class="text-size-2">匹配结果</span>
              <span v-show="xpathResultCount">{{ xpathResultCount }}</span>
            </el-space>
          </el-col>
          <el-col :span="12" class="text-right">
            <el-button link @click="handlePosition">换个位置</el-button>
          </el-col>
        </el-row>
        <el-input type="textarea" v-model="xpathResult" rows="4" class="!resize-none" />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
:deep(.el-textarea .el-textarea__inner) {
  resize: none;
}
</style>
