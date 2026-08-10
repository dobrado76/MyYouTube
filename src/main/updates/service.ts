import { app, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import type { UpdateCheckResult } from '@shared/schemas/updates'
import { getSettings } from '../db/repositories/settings'
import { compareSemVer, extractInstallerVersion, parseSemVer, type SemVer } from './version'

type Candidate = {
  version: string
  semver: SemVer
  path: string
  name: string
  mtimeMs: number
}

function listInstallerCandidates(folder: string): Candidate[] {
  const entries = readdirSync(folder)
  const candidates: Candidate[] = []

  for (const name of entries) {
    const fullPath = join(folder, name)
    let stats
    try {
      stats = statSync(fullPath)
    } catch {
      continue
    }
    if (!stats.isFile()) continue

    const version = extractInstallerVersion(name)
    if (!version) continue
    const semver = parseSemVer(version)
    if (!semver) continue

    candidates.push({
      version,
      semver,
      path: fullPath,
      name,
      mtimeMs: stats.mtimeMs
    })
  }

  return candidates.sort((a, b) => {
    const byVersion = compareSemVer(b.semver, a.semver)
    if (byVersion !== 0) return byVersion
    return b.mtimeMs - a.mtimeMs
  })
}

function assertInsideFolder(filePath: string, folder: string): void {
  const resolvedInstaller = resolve(filePath)
  const resolvedFolder = resolve(folder)
  const prefix = resolvedFolder.endsWith('\\') || resolvedFolder.endsWith('/')
    ? resolvedFolder
    : `${resolvedFolder}\\`
  const normalizedFile = resolvedInstaller.toLowerCase()
  const normalizedPrefix = prefix.toLowerCase().replace(/\//g, '\\')
  const normalizedFileWin = normalizedFile.replace(/\//g, '\\')

  if (!normalizedFileWin.startsWith(normalizedPrefix)) {
    throw Object.assign(new Error('Installer must be inside the configured updates folder.'), {
      code: 'updates.pathDenied'
    })
  }
}

export function getCurrentAppVersion(): string {
  return app.getVersion()
}

export async function pickUpdatesFolder(): Promise<string | null> {
  const settings = getSettings()
  const result = await dialog.showOpenDialog({
    title: 'Choose updates folder',
    defaultPath: settings.updatesFolder || undefined,
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0] ?? null
}

export function checkForUpdates(folderOverride?: string): UpdateCheckResult {
  const settings = getSettings()
  const folder = (folderOverride ?? settings.updatesFolder).trim()
  const currentVersion = getCurrentAppVersion()
  const checkedAt = new Date().toISOString()

  if (!folder) {
    throw Object.assign(new Error('Set an updates folder first.'), { code: 'updates.noFolder' })
  }

  const resolved = resolve(folder)
  if (!existsSync(resolved)) {
    throw Object.assign(new Error(`Updates folder not found: ${resolved}`), {
      code: 'updates.folderMissing'
    })
  }

  const current = parseSemVer(currentVersion)
  if (!current) {
    throw Object.assign(new Error(`Invalid current app version: ${currentVersion}`), {
      code: 'updates.badVersion'
    })
  }

  const latest = listInstallerCandidates(resolved)[0]
  if (!latest) {
    return {
      currentVersion,
      updateAvailable: false,
      latestVersion: null,
      installerPath: null,
      installerName: null,
      checkedAt,
      folder: resolved
    }
  }

  const updateAvailable = compareSemVer(latest.semver, current) > 0
  return {
    currentVersion,
    updateAvailable,
    latestVersion: latest.version,
    installerPath: updateAvailable ? latest.path : null,
    installerName: latest.name,
    checkedAt,
    folder: resolved
  }
}

export async function installUpdate(installerPath: string): Promise<{ launched: true }> {
  const settings = getSettings()
  const folder = settings.updatesFolder.trim()
  if (!folder) {
    throw Object.assign(new Error('Set an updates folder first.'), { code: 'updates.noFolder' })
  }

  assertInsideFolder(installerPath, folder)

  const resolvedInstaller = resolve(installerPath)
  if (!existsSync(resolvedInstaller)) {
    throw Object.assign(new Error('Installer file no longer exists.'), {
      code: 'updates.missingInstaller'
    })
  }

  const name = basename(resolvedInstaller)
  if (!extractInstallerVersion(name)) {
    throw Object.assign(new Error('File is not a recognized MyYouTube installer.'), {
      code: 'updates.badInstaller'
    })
  }

  try {
    const child = spawn(resolvedInstaller, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    child.unref()
  } catch {
    const openError = await shell.openPath(resolvedInstaller)
    if (openError) {
      throw Object.assign(new Error(openError), { code: 'updates.launchFailed' })
    }
  }

  setTimeout(() => {
    app.quit()
  }, 400)

  return { launched: true }
}
