import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packagePath = resolve(process.cwd(), 'package.json')
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))

const current = String(pkg.version ?? '0.0.0')
const parts = current.split('.').map((part) => Number.parseInt(part, 10))

if (parts.length !== 3 || parts.some((n) => Number.isNaN(n) || n < 0)) {
  throw new Error(`Invalid package version "${current}". Expected vX.Y.Z semver.`)
}

const [major, minor, patch] = parts
const next = `${major}.${minor}.${patch + 1}`
pkg.version = next

writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
console.log(`Version bumped: ${current} → ${next}`)
