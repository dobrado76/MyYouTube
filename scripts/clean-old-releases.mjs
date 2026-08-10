/**
 * After `electron-builder`, keep only artifacts for the current package.json
 * version so `release/` does not accumulate older installers.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const releaseDir = join(root, 'release')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = String(pkg.version ?? '')
const productName = String(pkg.productName ?? 'MyYouTube')

if (!version) {
  throw new Error('package.json has no version')
}

if (!existsSync(releaseDir)) {
  console.log('No release/ folder — nothing to clean')
  process.exit(0)
}

const setupPrefix = `${productName} Setup `
const keepExact = new Set([
  `${setupPrefix}${version}.exe`,
  `${setupPrefix}${version}.exe.blockmap`,
  'win-unpacked',
  'builder-effective-config.yaml',
  'builder-debug.yml',
  'latest.yml',
  'latest.yml.blockmap'
])

let removed = 0
for (const name of readdirSync(releaseDir)) {
  if (keepExact.has(name)) continue

  const full = join(releaseDir, name)
  try {
    rmSync(full, { recursive: statSync(full).isDirectory(), force: true })
    console.log(`Removed old release artifact: ${name}`)
    removed += 1
  } catch (error) {
    console.warn(`Could not remove ${name}:`, error instanceof Error ? error.message : error)
  }
}

console.log(
  removed === 0
    ? `release/ already clean for ${productName} ${version}`
    : `Kept ${productName} ${version}; removed ${removed} older artifact(s)`
)
