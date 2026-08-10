import { describe, expect, it } from 'vitest'
import { compareSemVer, extractInstallerVersion, parseSemVer } from './version'

describe('update version helpers', () => {
  it('parses and compares semver', () => {
    expect(parseSemVer('0.1.0')).toEqual([0, 1, 0])
    expect(compareSemVer([0, 1, 2], [0, 1, 1])).toBeGreaterThan(0)
    expect(compareSemVer([0, 1, 0], [0, 1, 0])).toBe(0)
    expect(compareSemVer([0, 1, 0], [0, 2, 0])).toBeLessThan(0)
  })

  it('extracts versions from electron-builder installer names', () => {
    expect(extractInstallerVersion('MyYouTube Setup 0.1.3.exe')).toBe('0.1.3')
    expect(extractInstallerVersion('MyYouTube-Setup-0.2.0.exe')).toBe('0.2.0')
    expect(extractInstallerVersion('myyoutube_0.1.10.exe')).toBe('0.1.10')
    expect(extractInstallerVersion('Other App Setup 1.0.0.exe')).toBeNull()
  })
})
