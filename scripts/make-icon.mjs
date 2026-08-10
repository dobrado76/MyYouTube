/**
 * Build Windows .ico from resources/icon-source.png (PNG-in-ICO).
 * Also copies PNG assets used by Electron at runtime / electron-builder.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'resources', 'icon-source.png')
const buildDir = join(root, 'build')
const resourcesDir = join(root, 'resources')

mkdirSync(buildDir, { recursive: true })
mkdirSync(resourcesDir, { recursive: true })

const png = readFileSync(source)

// ICONDIR + one ICONDIRENTRY + PNG payload (Vista+ PNG-compressed ICO)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type = icon
header.writeUInt16LE(1, 4) // count

const entry = Buffer.alloc(16)
entry[0] = 0 // width 256 (0 means 256)
entry[1] = 0 // height 256
entry[2] = 0 // color palette
entry[3] = 0 // reserved
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bit count
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12) // offset of image data

const ico = Buffer.concat([header, entry, png])
writeFileSync(join(buildDir, 'icon.ico'), ico)
writeFileSync(join(resourcesDir, 'icon.ico'), ico)
copyFileSync(source, join(resourcesDir, 'icon.png'))
copyFileSync(source, join(buildDir, 'icon.png'))

console.log(`Wrote build/icon.ico (${ico.length} bytes, header ${ico.subarray(0, 6).toString('hex')})`)
