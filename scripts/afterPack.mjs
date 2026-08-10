/**
 * Set exe icon / version strings with the JS `resedit` package so we never
 * need electron-builder's winCodeSign + 7-Zip symlink unpack on Windows.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as resedit from 'resedit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const productName = context.packager.appInfo.productFilename
  const exePath = path.join(context.appOutDir, `${productName}.exe`)
  const iconPath = path.join(root, 'build', 'icon.ico')
  const version = context.packager.appInfo.version

  const exeBuf = await readFile(exePath)
  const exe = resedit.NtExecutable.from(exeBuf)
  const res = resedit.NtExecutableResource.from(exe)

  try {
    const iconFile = resedit.Data.IconFile.from(await readFile(iconPath))
    resedit.Resource.IconGroupEntry.replaceIconsForResource(
      res.entries,
      1,
      1033,
      iconFile.icons.map((item) => item.data)
    )
  } catch (error) {
    console.warn('[afterPack] could not set icon:', error instanceof Error ? error.message : error)
  }

  const versionEntries = resedit.Resource.VersionInfo.fromEntries(res.entries)
  if (versionEntries.length === 1) {
    const vi = versionEntries[0]
    const { lang, codepage } = vi.getAllLanguagesForStringValues()[0] ?? {
      lang: 1033,
      codepage: 1200
    }
    vi.setStringValues({ lang, codepage }, {
      FileDescription: 'MyYouTube',
      ProductName: 'MyYouTube',
      CompanyName: 'MyYouTube',
      LegalCopyright: `Copyright © MyYouTube`,
      OriginalFilename: `${productName}.exe`,
      InternalName: productName
    })
    const parts = version.split('.').map((p) => Number(p) || 0)
    while (parts.length < 4) parts.push(0)
    vi.setFileVersion(parts[0], parts[1], parts[2], parts[3])
    vi.setProductVersion(parts[0], parts[1], parts[2], parts[3])
    vi.outputToResourceEntries(res.entries)
  }

  res.outputResource(exe)
  await writeFile(exePath, Buffer.from(exe.generate()))
}
