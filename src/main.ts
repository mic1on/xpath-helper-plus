import { createApp } from 'vue'
import App from './App.vue'
import 'virtual:uno.css'
import { crxReloadClient } from 'vite-plugin-crx-reload'

createApp(App).mount('#app')


if (import.meta.env.DEV) {
  crxReloadClient()
}
