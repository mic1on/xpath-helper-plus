import process from 'node:process'
import fs from 'fs-extra'
import { getManifest } from '../src/manifest'
import { log, r } from './utils'

export async function writeManifest(): Promise<void> {
  await fs.writeJSON(r('extension/manifest.json'), await getManifest(), { spaces: 2 })
  log('PRE', 'write extension/manifest.json')
}

writeManifest().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
