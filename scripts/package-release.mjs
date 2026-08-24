import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const root = join(currentDir, '..')
const extensionDir = join(root, 'extension')
const { version, name } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const releaseDir = join(root, 'release')
const archivePath = join(releaseDir, `${name}-v${version}.zip`)

mkdirSync(releaseDir, { recursive: true })
if (existsSync(archivePath)) rmSync(archivePath)

execFileSync('zip', ['-r', archivePath, '.'], {
  cwd: extensionDir,
  stdio: 'inherit',
})

console.log(`Created ${archivePath}`)
