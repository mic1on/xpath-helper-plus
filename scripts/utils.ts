import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { bgCyan, black } from 'kolorist'

const scriptsDir = dirname(fileURLToPath(import.meta.url))

export const port = Number(process.env.PORT || '') || 3303
export const isDev = process.env.NODE_ENV !== 'production'
export const r = (...paths: string[]) => resolve(scriptsDir, '..', ...paths)

export function log(scope: string, message: string): void {
  console.log(black(bgCyan(` ${scope} `)), message)
}
