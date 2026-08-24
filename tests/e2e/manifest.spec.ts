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

test('manifest registers the toggle-bar keyboard command', async () => {
  const manifestPath = path.resolve(__dirname, '../../src/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  expect(manifest.commands['toggle-bar']).toBeDefined()
  expect(manifest.commands['toggle-bar'].suggested_key.default).toBe('Alt+Shift+X')
  expect(typeof manifest.commands['toggle-bar'].description).toBe('string')
  expect(manifest.commands['toggle-bar'].description.length).toBeGreaterThan(0)
})
test('manifest exposes the iframe entrypoint to content pages', async () => {
  const manifestPath = path.resolve(__dirname, '../../src/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  expect(manifest.web_accessible_resources).toContainEqual({
    matches: ['<all_urls>'],
    resources: ['index.html'],
  })
})

test('manifest injects the content script into all frames for iframe support', async () => {
  const manifestPath = path.resolve(__dirname, '../../src/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  const [contentScript] = manifest.content_scripts
  // issue #25: elements inside iframes must be selectable/locatable, which
  // requires the content script to run in every frame, not just the top one.
  expect(contentScript.all_frames).toBe(true)
  // about:blank / srcdoc iframes are common in editors and ad slots.
  expect(contentScript.match_about_blank).toBe(true)
})

test('manifest does not request the unused scripting permission', async () => {
  const manifestPath = path.resolve(__dirname, '../../src/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  expect(manifest.permissions).toContain('activeTab')
  expect(manifest.permissions).not.toContain('scripting')
})

test('content script does not import shared chunks', async () => {
  const contentScriptPath = path.resolve(__dirname, '../../src/contentScript.ts')
  const contentScript = fs.readFileSync(contentScriptPath, 'utf8')

  expect(contentScript).not.toContain("from './utils'")
  expect(contentScript).not.toContain("from '@/utils'")
})
