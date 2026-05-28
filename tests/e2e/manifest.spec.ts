import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test('manifest declares the popup entrypoint', async () => {
  const manifestPath = path.resolve(__dirname, '../../src/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  expect(manifest.action.default_popup).toBe('index.html')
})
