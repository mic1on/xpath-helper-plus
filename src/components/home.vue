<script setup lang="ts">
import { sendMessageToContentScript } from "@/utils"
import { useLocalStorage, useClipboard } from "@vueuse/core"
import xPathToCss from "xpath-to-css"

const { isSupported, copy } = useClipboard()
const mode = ref("xpath")
const xpathRule = ref("")
const xpathShort = useLocalStorage("xpathShort", false)
const xpathResult = ref("");
const xpathResultCount = ref(null);

watch(() => xpathRule.value, () => {
  console.log("xpathRule.value", xpathRule.value);
  sendMessageToContentScript(
      {cmd: mode.value, value: xpathRule.value},
      function (response: any) {
        xpathResult.value = response[0];
        xpathResultCount.value = response[1];
  });
}, {immediate: true});

const handleShort = (v: boolean) => {
  xpathShort.value = v
  sendMessageToContentScript(
      {cmd: "short", value: xpathShort.value}
  )
}
const handlePosition = (v: string) => {
  sendMessageToContentScript(
      {cmd: "position"}
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
chrome.runtime.onMessage.addListener(function (request: any, sender: any, sendResponse: any) {
  if (request.query) {
    xpathRule.value = request.query
  }
});
</script>

<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-row>
          <el-col :span="12">
            <span style="padding-right: 10px">XPATH</span>
            <el-checkbox v-model="xpathShort" @change="handleShort">精简xpath</el-checkbox>
          </el-col>
          <el-col :span="6"></el-col>
          <el-col :span="6">
            <el-button @click="handleCopy" v-if="isSupported">复制</el-button>
            <el-tooltip
                effect="light"
                content="将xpath语句转为css选择器"
                placement="bottom"
            >
              <el-button @click="handleToCss" v-if="isSupported">复制css</el-button>
            </el-tooltip>
          </el-col>
        </el-row>
        <el-input type="textarea" v-model="xpathRule" rows="4"/>
      </el-col>
      <el-col :span="12">
        <el-row>
          <el-col :span="12">
            <span>匹配结果</span>
            <span v-show="xpathResultCount">{{ xpathResultCount }}</span>
          </el-col>
          <el-col :span="8"></el-col>
          <el-col :span="4">
            <el-button @click="handlePosition">换个位置</el-button>
          </el-col>
        </el-row>
        <el-input type="textarea" v-model="xpathResult" rows="4"/>
      </el-col>
    </el-row>
  </div>
</template>

<style>
body {
  background: rgba(246, 245, 245, 0.8);
  color: #606266;
}
</style>
