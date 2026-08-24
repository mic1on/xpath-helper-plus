import { execFileSync } from 'node:child_process'
import process from 'node:process'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import { isDev, log, port, r } from './utils'

async function writeSidePanelStub(): Promise<void> {
  await fs.ensureDir(r('extension/dist/sidepanel'))
  const source = await fs.readFile(r('src/sidepanel/index.html'), 'utf8')
  const stub = source
    .replace('"./main.ts"', `"http://localhost:${port}/sidepanel/main.ts"`)
    .replace('<div id="app"></div>', '<div id="app">Vite server did not start</div>')
  await fs.writeFile(r('extension/dist/sidepanel/index.html'), stub, 'utf8')
  log('PRE', 'stub side panel entry')
}

function writeManifest(): void {
  execFileSync('pnpm', ['exec', 'esno', 'scripts/manifest.ts'], { stdio: 'inherit' })
}

async function main(): Promise<void> {
  writeManifest()

  if (!isDev) return

  await writeSidePanelStub()
  chokidar.watch(r('src/sidepanel/index.html')).on('change', writeSidePanelStub)
  chokidar.watch([r('src/manifest.ts'), r('package.json')]).on('change', writeManifest)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
