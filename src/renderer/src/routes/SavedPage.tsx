import { useCallback, useEffect, useState, type FormEvent, type JSX } from 'react'
import type { Collection } from '@shared/schemas/collection'
import type { Video } from '@shared/schemas/video'
import { VideoCard } from '../components/VideoCard'
import { callApi } from '../lib/api'
import { useAppStore } from '../store/appStore'

type Props = {
  active: boolean
}

export function SavedPage({ active }: Props): JSX.Element {
  const collectionsEpoch = useAppStore((s) => s.collectionsEpoch)
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [items, setItems] = useState<Video[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')

  const activeCollection = collections.find((c) => c.id === activeId) ?? null

  const refreshCollections = useCallback(async (preferId?: string | null) => {
    const list = await callApi(() => window.myyoutube.collections.list())
    setCollections(list)
    setActiveId((prev) => {
      const preferred = preferId ?? prev
      if (preferred && list.some((c) => c.id === preferred)) return preferred
      return list[0]?.id ?? null
    })
    return list
  }, [])

  const loadVideos = useCallback(
    async (collectionId: string, opts?: { reset?: boolean; cursor?: string | null }) => {
      setError(null)
      try {
        const page = await callApi(() =>
          window.myyoutube.collections.listVideos({
            collectionId,
            cursor: opts?.cursor ?? null,
            limit: 40
          })
        )
        setItems((prev) => (opts?.reset ? page.items : [...prev, ...page.items]))
        setCursor(page.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collection')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    []
  )

  // Keep-alive tab: reload whenever Saved is shown or collections change elsewhere.
  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void refreshCollections()
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load collections')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, collectionsEpoch, refreshCollections])

  useEffect(() => {
    if (!active) return
    if (!activeId) {
      setItems([])
      setCursor(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setItems([])
    setCursor(null)
    setRenaming(false)
    void loadVideos(activeId, { reset: true })
  }, [active, activeId, collectionsEpoch, loadVideos])

  async function createCollection(event: FormEvent): Promise<void> {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    setError(null)
    try {
      const created = await callApi(() => window.myyoutube.collections.create({ name }))
      setNewName('')
      setCreating(false)
      useAppStore.getState().notifyCollectionsChanged()
      await refreshCollections(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create collection')
    }
  }

  async function renameCollection(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!activeId) return
    const name = renameDraft.trim()
    if (!name) return
    setError(null)
    try {
      await callApi(() =>
        window.myyoutube.collections.rename({ collectionId: activeId, name })
      )
      setRenaming(false)
      useAppStore.getState().notifyCollectionsChanged()
      await refreshCollections(activeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename')
    }
  }

  async function deleteCollection(): Promise<void> {
    if (!activeId || !activeCollection) return
    const ok = window.confirm(
      `Delete collection “${activeCollection.name}”? Videos stay in your library.`
    )
    if (!ok) return
    setError(null)
    try {
      await callApi(() => window.myyoutube.collections.delete(activeId))
      useAppStore.getState().notifyCollectionsChanged()
      await refreshCollections(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  async function removeFromCollection(videoId: string): Promise<void> {
    if (!activeId) return
    await callApi(() => window.myyoutube.collections.removeVideo(activeId, videoId))
    setItems((prev) => prev.filter((v) => v.id !== videoId))
    useAppStore.getState().notifyCollectionsChanged()
    await refreshCollections(activeId)
  }

  return (
    <div className="settings-page saved-page">
      <aside className="settings-nav" aria-label="Saved collections">
        <div className="settings-nav-title">Saved</div>
        {collections.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`settings-nav-link${c.id === activeId ? ' active' : ''}`}
            onClick={() => setActiveId(c.id)}
          >
            <span className="saved-nav-name">{c.name}</span>
            <span className="saved-nav-count">{c.videoCount}</span>
          </button>
        ))}
        {creating ? (
          <form className="saved-create-form" onSubmit={(e) => void createCollection(e)}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Programming)"
              aria-label="New collection name"
              maxLength={80}
            />
            <div className="saved-create-actions">
              <button type="submit" className="primary" disabled={!newName.trim()}>
                Create
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setCreating(false)
                  setNewName('')
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="settings-nav-link saved-nav-new"
            onClick={() => setCreating(true)}
          >
            + New collection
          </button>
        )}
      </aside>

      <div className="settings-pane">
        {activeCollection ? (
          <>
            <header className="settings-pane-header saved-pane-header">
              {renaming ? (
                <form className="saved-rename-form" onSubmit={(e) => void renameCollection(e)}>
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    aria-label="Rename collection"
                    maxLength={80}
                  />
                  <button type="submit" className="primary" disabled={!renameDraft.trim()}>
                    Rename
                  </button>
                  <button type="button" className="ghost" onClick={() => setRenaming(false)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <h1>{activeCollection.name}</h1>
                  <div className="saved-pane-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setRenameDraft(activeCollection.name)
                        setRenaming(true)
                      }}
                    >
                      Rename
                    </button>
                    <button type="button" className="ghost" onClick={() => void deleteCollection()}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </header>
            <p className="muted saved-blurb">
              Local collections for rewatching — not synced to YouTube playlists.
            </p>
          </>
        ) : (
          <header className="settings-pane-header">
            <h1>Saved</h1>
          </header>
        )}

        {error ? <p className="error">{error}</p> : null}

        {!activeCollection && !loading ? (
          <p className="empty">
            Create a collection (Programming, Music, Funny clips…) then save videos from any card.
          </p>
        ) : null}

        {activeCollection && loading ? <p className="muted">Loading…</p> : null}

        {activeCollection && !loading && items.length === 0 ? (
          <p className="empty">Nothing saved here yet. Use the bookmark on a video card.</p>
        ) : null}

        {activeCollection && items.length > 0 ? (
          <div className="video-grid">
            {items.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                hideSaveButton
                onUnsave={(id) => void removeFromCollection(id)}
              />
            ))}
          </div>
        ) : null}

        {activeCollection && cursor ? (
          <div className="load-more">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => {
                setLoadingMore(true)
                void loadVideos(activeCollection.id, { cursor })
              }}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
