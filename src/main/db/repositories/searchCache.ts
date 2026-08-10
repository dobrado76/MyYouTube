import { getDb } from '../index'

const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000

export type CachedSearchPage = {
  videoIds: string[]
  nextPageToken: string | null
  fetchedAt: string
}

function cacheKey(query: string, pageToken: string | null | undefined, limit: number): string {
  return `${query.trim().toLowerCase()}|${pageToken ?? ''}|${limit}`
}

export function getCachedSearch(
  query: string,
  pageToken: string | null | undefined,
  limit: number
): CachedSearchPage | null {
  const row = getDb()
    .prepare(
      `
    SELECT result_ids_json, next_page_token, fetched_at
    FROM search_cache
    WHERE cache_key = ?
  `
    )
    .get(cacheKey(query, pageToken, limit)) as
    | { result_ids_json: string; next_page_token: string | null; fetched_at: string }
    | undefined

  if (!row) return null
  const age = Date.now() - Date.parse(row.fetched_at)
  if (!Number.isFinite(age) || age > SEARCH_CACHE_TTL_MS) return null

  try {
    const videoIds = JSON.parse(row.result_ids_json) as unknown
    if (!Array.isArray(videoIds) || !videoIds.every((id) => typeof id === 'string')) {
      return null
    }
    return {
      videoIds,
      nextPageToken: row.next_page_token,
      fetchedAt: row.fetched_at
    }
  } catch {
    return null
  }
}

export function putCachedSearch(
  query: string,
  pageToken: string | null | undefined,
  limit: number,
  videoIds: string[],
  nextPageToken: string | null
): void {
  getDb()
    .prepare(
      `
    INSERT INTO search_cache (cache_key, query, result_ids_json, next_page_token, fetched_at)
    VALUES (@cacheKey, @query, @resultIdsJson, @nextPageToken, @fetchedAt)
    ON CONFLICT(cache_key) DO UPDATE SET
      query = excluded.query,
      result_ids_json = excluded.result_ids_json,
      next_page_token = excluded.next_page_token,
      fetched_at = excluded.fetched_at
  `
    )
    .run({
      cacheKey: cacheKey(query, pageToken, limit),
      query: query.trim(),
      resultIdsJson: JSON.stringify(videoIds),
      nextPageToken,
      fetchedAt: new Date().toISOString()
    })
}
