export type SemVer = [number, number, number]

const INSTALLER_NAME_RE = /myyoutube.*?(?:setup[\s_-]*)?(\d+\.\d+\.\d+)\.exe$/i
const VERSION_IN_NAME_RE = /(\d+\.\d+\.\d+)/

export function parseSemVer(version: string): SemVer | null {
  const match = version.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return null
  return [
    Number.parseInt(match[1]!, 10),
    Number.parseInt(match[2]!, 10),
    Number.parseInt(match[3]!, 10)
  ]
}

export function compareSemVer(a: SemVer, b: SemVer): number {
  for (let i = 0; i < 3; i += 1) {
    const diff = a[i]! - b[i]!
    if (diff !== 0) return diff
  }
  return 0
}

export function extractInstallerVersion(fileName: string): string | null {
  const named = fileName.match(INSTALLER_NAME_RE)
  if (named?.[1]) return named[1]
  if (!/\.exe$/i.test(fileName)) return null
  if (!/myyoutube/i.test(fileName)) return null
  return fileName.match(VERSION_IN_NAME_RE)?.[1] ?? null
}
