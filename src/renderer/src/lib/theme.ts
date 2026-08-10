import type { Appearance, ThemeMode } from '@shared/schemas/settings'
import {
  hexToRgba,
  tokensForCustom,
  tokensForMode,
  type ResolvedThemeMode
} from '@shared/theme/presets'

export function resolveThemeMode(theme: ThemeMode): ResolvedThemeMode {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  if (theme === 'custom') {
    return 'light'
  }
  return theme
}

export function applyAppearance(theme: ThemeMode, appearance: Appearance): void {
  const root = document.documentElement
  const resolvedMode: ResolvedThemeMode =
    theme === 'custom'
      ? luminance(appearance.background) < 0.45
        ? 'dark'
        : 'light'
      : resolveThemeMode(theme)

  const tokens =
    theme === 'custom' ? tokensForCustom(appearance) : tokensForMode(resolvedMode, appearance)

  root.setAttribute('data-theme', resolvedMode)
  root.style.setProperty('--bg', tokens.bg)
  root.style.setProperty('--bg-elevated', tokens.bgElevated)
  root.style.setProperty('--bg-sidebar', tokens.bgSidebar)
  root.style.setProperty('--ink', tokens.ink)
  root.style.setProperty('--ink-muted', tokens.inkMuted)
  root.style.setProperty('--accent', tokens.accent)
  root.style.setProperty('--accent-soft', hexToRgba(tokens.accent, resolvedMode === 'dark' ? 0.18 : 0.12))
  root.style.setProperty('--border', tokens.border)
  root.style.setProperty('--danger', tokens.danger)
  root.style.setProperty('--watched', tokens.watched)
  root.style.setProperty('--font-sans', appearance.fontFamily)
  root.style.setProperty('--font-display', appearance.fontDisplay)
  root.style.setProperty('--font-size', `${appearance.fontSizePx}px`)
  root.style.setProperty('--accent-glow', hexToRgba(tokens.accent, 0.1))
}

function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const r = Number.parseInt(n.slice(0, 2), 16) / 255
  const g = Number.parseInt(n.slice(2, 4), 16) / 255
  const b = Number.parseInt(n.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
