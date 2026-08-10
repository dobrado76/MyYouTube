import { BrowserWindow, screen, type Rectangle } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export type WindowState = {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 840,
  isMaximized: false
}

let statePath: string | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

export function initWindowStateStore(userDataPath: string): void {
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  statePath = join(userDataPath, 'window-state.json')
}

function pathOrThrow(): string {
  if (!statePath) throw new Error('Window state store not initialized')
  return statePath
}

export function loadWindowState(): WindowState {
  try {
    const raw = readFileSync(pathOrThrow(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<WindowState>
    const state: WindowState = {
      width: Number(parsed.width) || DEFAULT_STATE.width,
      height: Number(parsed.height) || DEFAULT_STATE.height,
      isMaximized: Boolean(parsed.isMaximized),
      x: typeof parsed.x === 'number' ? parsed.x : undefined,
      y: typeof parsed.y === 'number' ? parsed.y : undefined
    }
    return ensureOnScreen(state)
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function ensureOnScreen(state: WindowState): WindowState {
  const width = Math.max(960, state.width)
  const height = Math.max(640, state.height)

  if (typeof state.x !== 'number' || typeof state.y !== 'number') {
    return { ...state, width, height }
  }

  const bounds: Rectangle = { x: state.x, y: state.y, width, height }
  const display = screen.getDisplayMatching(bounds)
  const area = display.workArea

  const visible =
    bounds.x < area.x + area.width &&
    bounds.x + bounds.width > area.x &&
    bounds.y < area.y + area.height &&
    bounds.y + bounds.height > area.y

  if (!visible) {
    return { width, height, isMaximized: state.isMaximized }
  }

  return { ...state, width, height }
}

function writeState(state: WindowState): void {
  writeFileSync(pathOrThrow(), JSON.stringify(state, null, 2), 'utf8')
}

function scheduleSave(state: WindowState): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      writeState(state)
    } catch {
      // ignore disk errors
    }
  }, 200)
}

export function trackWindowState(win: BrowserWindow): void {
  const persist = (): void => {
    if (win.isDestroyed()) return

    const isMaximized = win.isMaximized()
    // When maximized, keep last normal bounds for restore after unmaximize / next launch.
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()

    scheduleSave({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    })
  }

  win.on('resize', persist)
  win.on('move', persist)
  win.on('maximize', persist)
  win.on('unmaximize', persist)
  win.on('close', persist)
}
