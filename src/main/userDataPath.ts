import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/** Matches package.json `name` — folder Electron uses for `npm run dev`. */
export const USER_DATA_DIR_NAME = 'myyoutube'

/** Matches package.json / electron-builder `productName` (install builds). */
export const LEGACY_PRODUCT_USER_DATA_DIR_NAME = 'MyYouTube'

function hasLibraryDb(dir: string): boolean {
  return existsSync(join(dir, 'myyoutube.sqlite'))
}

/**
 * Single shared userData for unpackaged (`npm run dev`) and the installed app.
 *
 * Prefer the package-name folder (`myyoutube`) when it already has a library DB so the
 * current unpackaged/dev state is preserved. Fall back to the productName folder only
 * when the package-name path has no DB yet. On Windows these often resolve to the same
 * directory (case-insensitive).
 *
 * Override anytime with `MYYOUTUBE_USER_DATA` (or legacy `MYTUBE_USER_DATA`).
 */
export function resolveUserDataPath(): string {
  const override = process.env.MYYOUTUBE_USER_DATA || process.env.MYTUBE_USER_DATA
  if (override) {
    if (!existsSync(override)) mkdirSync(override, { recursive: true })
    return override
  }

  // Keep Chromium's app name aligned with the package id so default paths stay consistent.
  app.setName(USER_DATA_DIR_NAME)

  const appData = app.getPath('appData')
  const packageNamePath = join(appData, USER_DATA_DIR_NAME)
  const productNamePath = join(appData, LEGACY_PRODUCT_USER_DATA_DIR_NAME)

  if (hasLibraryDb(packageNamePath)) {
    return packageNamePath
  }
  if (hasLibraryDb(productNamePath)) {
    return productNamePath
  }

  if (!existsSync(packageNamePath)) {
    mkdirSync(packageNamePath, { recursive: true })
  }
  return packageNamePath
}
