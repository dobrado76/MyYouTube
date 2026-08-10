type Flusher = () => Promise<void>

let playerFlusher: Flusher | null = null

export function registerPlayerFlusher(fn: Flusher): () => void {
  playerFlusher = fn
  return () => {
    if (playerFlusher === fn) playerFlusher = null
  }
}

/** Flush in-memory player position + any registered savers before quit. */
export async function flushPlaybackSession(): Promise<void> {
  if (playerFlusher) {
    await playerFlusher()
  }
}
