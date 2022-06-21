<script setup lang="ts">
import { sendMessageToContentScript } from "@/utils"
import { useLocalStorage } from "@vueuse/core"

const xpathRule = useLocalStorage("xpathRule", "")
const xpathShort = useLocalStorage("xpathShort", false)
const xpathResult = ref("");
const xpathResultCount = ref(null);

watch(() => xpathRule.value, () => {
  console.log("xpathRule.value", xpathRule.value);
  sendMessageToContentScript(
      {cmd: "xpath", value: xpathRule.value},
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
handleShort(xpathShort.value)
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
        <div style="height: 24px">
          <span style="padding-right: 10px">XPATH</span>
          <el-checkbox v-model="xpathShort" @change="handleShort">精简xpath</el-checkbox>
        </div>
        <el-input type="textarea" v-model="xpathRule" rows="4"/>
      </el-col>
      <el-col :span="12">
        <div style="height: 24px">
          <span>匹配结果</span>
          <span v-show="xpathResultCount">{{ xpathResultCount }}</span>
        </div>
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
