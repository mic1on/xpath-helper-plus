import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test('manifest lets the action click toggle the in-page bar', async () => {
  const manifestPath = path.resolve(__dirname, '../../src/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  expect(manifest.action.default_popup).toBeUndefined()
  expect(manifest.background.service_worker).toBe('background.js')
  expect(manifest.background.type).toBe('module')
})

test('manifest exposes the iframe entrypoint to content pages', async () => {
  const manifestPath = path.resolve(__dirname, '../../src/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  expect(manifest.web_accessible_resources).toContainEqual({
    matches: ['<all_urls>'],
    resources: ['index.html'],
  })
})

test('content script does not import shared chunks', async () => {
  const contentScriptPath = path.resolve(__dirname, '../../src/contentScript.ts')
  const contentScript = fs.readFileSync(contentScriptPath, 'utf8')

  expect(contentScript).not.toContain("from './utils'")
  expect(contentScript).not.toContain("from '@/utils'")
})
