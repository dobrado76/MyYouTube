import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type JSX
} from 'react'
import { createPortal } from 'react-dom'
import type { Collection } from '@shared/schemas/collection'
import { callApi } from '../lib/api'
import { useAppStore } from '../store/appStore'
import { BookmarkIcon } from './icons'

type Props = {
  videoId: string
  onChanged?: () => void
}

type PanelPos = { top: number; left: number }

export function SaveMenu({ videoId, onChanged }: Props): JSX.Element {
  const notifyCollectionsChanged = useAppStore((s) => s.notifyCollectionsChanged)
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [membership, setMembership] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const saved = membership.size > 0

  // Light hydrate so the bookmark fills if already saved (local IPC / SQLite).
  useEffect(() => {
    let cancelled = false
    void callApi(() => window.myyoutube.collections.listForVideo(videoId))
      .then((mem) => {
        if (!cancelled) setMembership(new Set(mem.collectionIds))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [videoId])

  function placePanel(): void {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const width = 240
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 8
    )
    const below = rect.bottom + 8
    const estimatedHeight = 280
    const top =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below
    setPos({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    placePanel()
  }, [open, collections.length, creating, loading])

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent): void {
      const t = event.target as Node
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false)
    }
    function onReposition(): void {
      placePanel()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  async function openMenu(): Promise<void> {
    setOpen(true)
    setError(null)
    setCreating(false)
    setNewName('')
    setLoading(true)
    try {
      const [list, mem] = await Promise.all([
        callApi(() => window.myyoutube.collections.list()),
        callApi(() => window.myyoutube.collections.listForVideo(videoId))
      ])
      setCollections(list)
      setMembership(new Set(mem.collectionIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  async function toggle(collectionId: string, checked: boolean): Promise<void> {
    setBusyId(collectionId)
    setError(null)
    try {
      if (checked) {
        await callApi(() => window.myyoutube.collections.addVideo(collectionId, videoId))
        setMembership((prev) => new Set([...prev, collectionId]))
      } else {
        await callApi(() => window.myyoutube.collections.removeVideo(collectionId, videoId))
        setMembership((prev) => {
          const next = new Set(prev)
          next.delete(collectionId)
          return next
        })
      }
      const list = await callApi(() => window.myyoutube.collections.list())
      setCollections(list)
      notifyCollectionsChanged()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update save')
    } finally {
      setBusyId(null)
    }
  }

  async function createAndSave(event: FormEvent): Promise<void> {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusyId('__create__')
    setError(null)
    try {
      const created = await callApi(() => window.myyoutube.collections.create({ name }))
      await callApi(() => window.myyoutube.collections.addVideo(created.id, videoId))
      setCollections((prev) =>
        [...prev.filter((c) => c.id !== created.id), { ...created, videoCount: 1 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      )
      setMembership((prev) => new Set([...prev, created.id]))
      setCreating(false)
      setNewName('')
      notifyCollectionsChanged()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create collection')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="save-menu">
      <button
        ref={buttonRef}
        type="button"
        className={`icon-btn${saved ? ' is-saved' : ''}`}
        title={saved ? 'Saved — manage collections' : 'Save to collection'}
        aria-label={saved ? 'Saved — manage collections' : 'Save to collection'}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          if (open) setOpen(false)
          else void openMenu()
        }}
      >
        <BookmarkIcon filled={saved} />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="save-menu-panel"
              id={menuId}
              role="dialog"
              aria-label="Save to collection"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="save-menu-title">Save to…</div>
              {loading ? <p className="muted save-menu-status">Loading…</p> : null}
              {error ? <p className="error save-menu-status">{error}</p> : null}
              {!loading ? (
                <ul className="save-menu-list">
                  {collections.length === 0 ? (
                    <li className="muted">No collections yet — create one below.</li>
                  ) : (
                    collections.map((c) => {
                      const checked = membership.has(c.id)
                      return (
                        <li key={c.id}>
                          <label className="save-menu-row">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={busyId === c.id}
                              onChange={(e) => void toggle(c.id, e.target.checked)}
                            />
                            <span className="save-menu-name">{c.name}</span>
                            <span className="save-menu-count">{c.videoCount}</span>
                          </label>
                        </li>
                      )
                    })
                  )}
                </ul>
              ) : null}
              {creating ? (
                <form className="save-menu-create" onSubmit={(e) => void createAndSave(e)}>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Collection name"
                    aria-label="New collection name"
                    maxLength={80}
                  />
                  <button
                    type="submit"
                    className="primary"
                    disabled={!newName.trim() || busyId != null}
                  >
                    Save
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="ghost save-menu-new"
                  onClick={() => setCreating(true)}
                >
                  + New collection
                </button>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
