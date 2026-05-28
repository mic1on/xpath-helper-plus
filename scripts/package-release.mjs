import { readFileSync, cpSync, mkdirSync, existsSync } from "fs"
import { execSync } from "child_process"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const { version, name } = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"))
const releaseDir = join(root, "release")
const archiveName = `${name}-v${version}.zip`

if (!existsSync(releaseDir)) mkdirSync(releaseDir, { recursive: true })

execSync(
  `cd dist && zip -r "${join(releaseDir, archiveName)}" .`,
  { cwd: root, stdio: "inherit" },
)

console.log(`Created ${join(releaseDir, archiveName)}`)