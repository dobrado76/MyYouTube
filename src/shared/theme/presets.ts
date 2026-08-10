import type { Appearance } from '../schemas/settings'

export type ResolvedThemeMode = 'light' | 'dark'

export type ThemeTokens = {
  bg: string
  bgElevated: string
  bgSidebar: string
  ink: string
  inkMuted: string
  accent: string
  border: string
  danger: string
  watched: string
}

export const LIGHT_PRESET: ThemeTokens = {
  bg: '#f7f4f4',
  bgElevated: '#ffffff',
  bgSidebar: '#f0eaea',
  ink: '#1f1416',
  inkMuted: '#6b5a5e',
  accent: '#c1121f',
  border: 'rgba(31, 20, 22, 0.12)',
  danger: '#9b2c2c',
  watched: '#6b7280'
}

export const DARK_PRESET: ThemeTokens = {
  bg: '#161112',
  bgElevated: '#20181a',
  bgSidebar: '#120e0f',
  ink: '#f5ecee',
  inkMuted: '#b9a8ad',
  accent: '#e63946',
  border: 'rgba(245, 236, 238, 0.12)',
  danger: '#f07178',
  watched: '#9ca3af'
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function tokensForMode(mode: ResolvedThemeMode, appearance: Appearance): ThemeTokens {
  const preset = mode === 'dark' ? DARK_PRESET : LIGHT_PRESET
  return {
    ...preset,
    accent: appearance.accent || preset.accent
  }
}

export function tokensForCustom(appearance: Appearance): ThemeTokens {
  const isDark = luminance(appearance.background) < 0.45
  return {
    bg: appearance.background,
    bgElevated: appearance.surface,
    bgSidebar: appearance.sidebar,
    ink: appearance.text,
    inkMuted: appearance.mutedText,
    accent: appearance.accent,
    border: isDark ? 'rgba(245, 236, 238, 0.12)' : 'rgba(31, 20, 22, 0.12)',
    danger: isDark ? '#f07178' : '#9b2c2c',
    watched: isDark ? '#9ca3af' : '#6b7280'
  }
}

function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const r = Number.parseInt(n.slice(0, 2), 16) / 255
  const g = Number.parseInt(n.slice(2, 4), 16) / 255
  const b = Number.parseInt(n.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
