/**
 * Append AND clauses so title/description must not contain any blocked keyword
 * (case-insensitive substring match).
 */
export function appendBlockedKeywordClauses(
  where: string[],
  params: Record<string, string | number>,
  keywords: string[]
): void {
  const cleaned = keywords.map((k) => k.trim()).filter((k) => k.length > 0)
  cleaned.forEach((keyword, index) => {
    const key = `bkw${index}`
    where.push(
      `(INSTR(LOWER(v.title), @${key}) = 0 AND INSTR(LOWER(COALESCE(v.description, '')), @${key}) = 0)`
    )
    params[key] = keyword.toLowerCase()
  })
}

/** In-memory filter for hydrated search results. */
export function videoMatchesBlockedKeyword(
  video: { title: string; description: string | null },
  keywords: string[]
): boolean {
  if (!keywords.length) return false
  const haystack = `${video.title}\n${video.description ?? ''}`.toLowerCase()
  return keywords.some((k) => {
    const needle = k.trim().toLowerCase()
    return needle.length > 0 && haystack.includes(needle)
  })
}
