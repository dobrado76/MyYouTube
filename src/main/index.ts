import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { initDatabase, closeDatabase } from './db'
import { initCredentialsStore } from './auth/credentials'
import { initTokenStore } from './auth/tokens'
import { getAccessToken } from './auth/service'
import { setAccessTokenProvider } from './youtube/provider'
import { registerIpcHandlers } from './ipc/register'
import { initWindowStateStore, loadWindowState, trackWindowState } from './windowState'
import {
  applyHardwareAccelerationAtBoot,
  initHardwareAccelerationStore,
  writeHardwareAccelerationPreference
} from './hardwareAcceleration'
import { getSettings } from './db/repositories/settings'
import { RendererServer } from './rendererServer'
import { IpcChannels } from '../shared/ipc/channels'
import { resolveUserDataPath } from './userDataPath'

function loadEnvFile(): void {
  const candidates = [join(process.cwd(), '.env.local'), join(process.cwd(), '.env')]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  }
}

// GPU policy must be applied before ready; boot file lives under shared userData
// (same folder for npm run dev and the installed build — see userDataPath.ts).
loadEnvFile()
const bootUserDataPath = resolveUserDataPath()
app.setPath('userData', bootUserDataPath)
initHardwareAccelerationStore(bootUserDataPath)
applyHardwareAccelerationAtBoot()

function resolveAppIcon(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'icon.png')
  }
  // out/main → ../../resources
  return join(__dirname, '../../resources/icon.png')
}

let mainWindow: BrowserWindow | null = null
let rendererServer: RendererServer | null = null
let allowClose = false
let flushTimeout: ReturnType<typeof setTimeout> | null = null

function finishClose(): void {
  allowClose = true
  if (flushTimeout) {
    clearTimeout(flushTimeout)
    flushTimeout = null
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
}

function createWindow(): void {
  const saved = loadWindowState()
  allowClose = false

  mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'MyYouTube',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  trackWindowState(mainWindow)

  mainWindow.on('ready-to-show', () => {
    if (saved.isMaximized) {
      mainWindow?.maximize()
    }
    mainWindow?.show()
  })

  // Ask renderer to flush playback position / queue before the window dies.
  mainWindow.on('close', (event) => {
    if (allowClose || !mainWindow || mainWindow.isDestroyed()) return
    event.preventDefault()
    mainWindow.webContents.send(IpcChannels.appFlushBeforeQuit)
    if (flushTimeout) clearTimeout(flushTimeout)
    flushTimeout = setTimeout(() => finishClose(), 2500)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  void loadRenderer(mainWindow)
}

async function loadRenderer(win: BrowserWindow): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL)
    return
  }

  // Packaged (and plain `electron .`) builds must not use file:// — YouTube's
  // IFrame Player rejects non-http(s) parents with Error 153.
  const rendererRoot = join(__dirname, '../renderer')
  if (!rendererServer) {
    rendererServer = new RendererServer(rendererRoot)
  }
  const url = await rendererServer.start()
  await win.loadURL(url)
}

app.whenReady().then(() => {
  const userDataPath = resolveUserDataPath()
  app.setPath('userData', userDataPath)

  initDatabase(userDataPath)
  // Keep boot preference file aligned with settings (applied on next launch).
  writeHardwareAccelerationPreference(getSettings().hardwareAcceleration)
  initTokenStore(userDataPath)
  initCredentialsStore(userDataPath)
  initWindowStateStore(userDataPath)
  setAccessTokenProvider(getAccessToken)
  registerIpcHandlers()

  ipcMain.handle(IpcChannels.appFlushDone, async () => {
    finishClose()
    return { ok: true as const }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    rendererServer?.stop()
    rendererServer = null
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  rendererServer?.stop()
  rendererServer = null
  closeDatabase()
})
