import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const FILE_NAME = 'hardware-acceleration.json'

let sessionEnabled = true
let preferencePath: string | null = null

export type HardwareAccelerationStatus = {
  /** User preference (persisted). */
  enabled: boolean
  /** Whether this process started with hardware acceleration allowed. */
  active: boolean
  /** Preference differs from the running session — restart needed. */
  restartRequired: boolean
}

export function initHardwareAccelerationStore(userDataPath: string): void {
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  preferencePath = join(userDataPath, FILE_NAME)
}

/** Read preference from the boot file (defaults to enabled). */
export function readHardwareAccelerationPreference(): boolean {
  if (!preferencePath || !existsSync(preferencePath)) return true
  try {
    const parsed = JSON.parse(readFileSync(preferencePath, 'utf8')) as {
      hardwareAcceleration?: unknown
    }
    return parsed.hardwareAcceleration !== false
  } catch {
    return true
  }
}

export function writeHardwareAccelerationPreference(enabled: boolean): void {
  if (!preferencePath) {
    throw new Error('Hardware acceleration store not initialized')
  }
  writeFileSync(
    preferencePath,
    JSON.stringify({ hardwareAcceleration: enabled }, null, 2),
    'utf8'
  )
}

/**
 * Must run before app.ready. Disables Chromium GPU / video decode when preferred off.
 * That covers Electron chrome and YouTube IFrame playback in this process.
 */
export function applyHardwareAccelerationAtBoot(): void {
  const enabled = readHardwareAccelerationPreference()
  sessionEnabled = enabled
  if (enabled) return

  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-accelerated-2d-canvas')
  app.commandLine.appendSwitch('disable-accelerated-video-decode')
  app.commandLine.appendSwitch('disable-accelerated-video-encode')
  app.commandLine.appendSwitch('disable-gpu-vsync')
}

export function getHardwareAccelerationStatus(enabled: boolean): HardwareAccelerationStatus {
  return {
    enabled,
    active: sessionEnabled,
    restartRequired: enabled !== sessionEnabled
  }
}

export function relaunchApp(): void {
  app.relaunch()
  app.exit(0)
}
