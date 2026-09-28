import { BrowserWindow, app, session, webFrameMain, type WebContents, type WebFrameMain } from 'electron'
import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { PlayerQuality } from '../shared/schemas/settings'

/**
 * Parent-frame setPlaybackQuality is a no-op. We inject into the youtube.com embed
 * frame and lock setPlaybackQualityRange(min, max) to the preferred rung so ABR
 * cannot step down to medium after a few seconds.
 */

let preferredQuality: PlayerQuality = 'auto'
let lastInjectSummary = 'not-run'

const QUALITY_TO_HEIGHT: Record<Exclude<PlayerQuality, 'auto'>, number> = {
  small: 240,
  medium: 360,
  large: 480,
  hd720: 720,
  hd1080: 1080,
  highres: 1440
}

const QUALITY_TO_LABEL: Record<Exclude<PlayerQuality, 'auto'>, string> = {
  small: 'small',
  medium: 'medium',
  large: 'large',
  hd720: 'hd720',
  hd1080: 'hd1080',
  highres: 'highres'
}

export function setPreferredEmbedQuality(quality: PlayerQuality): void {
  preferredQuality = quality
  void applyPrefCookie(quality)
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      void injectIntoAllYoutubeFrames(win.webContents)
    }
  }
}

export function getPreferredEmbedQuality(): PlayerQuality {
  return preferredQuality
}

export function getEmbedQualityInjectStatus(): { preferred: PlayerQuality; lastInject: string } {
  return { preferred: preferredQuality, lastInject: lastInjectSummary }
}

/** Re-run injection for all open youtube embed frames (call from player onReady). */
export async function reapplyEmbedQuality(): Promise<{ preferred: PlayerQuality; lastInject: string }> {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      await injectIntoAllYoutubeFrames(win.webContents)
    }
  }
  return getEmbedQualityInjectStatus()
}

export function installYoutubeEmbedQualityHooks(contents: WebContents): void {
  const schedule = (processId: number, routingId: number, url: string): void => {
    if (!isYoutubePlayerFrameUrl(url)) return
    const delays = [0, 250, 750, 1500, 3000]
    for (const ms of delays) {
      setTimeout(() => {
        const frame = webFrameMain.fromId(processId, routingId)
        if (frame) void injectQualityScript(frame)
      }, ms)
    }
  }

  contents.on(
    'did-frame-navigate',
    (_event, url, _httpResponseCode, _httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
      if (isMainFrame) return
      schedule(frameProcessId, frameRoutingId, url)
    }
  )

  contents.on('did-frame-finish-load', (_event, isMainFrame, frameProcessId, frameRoutingId) => {
    if (isMainFrame) return
    const frame = webFrameMain.fromId(frameProcessId, frameRoutingId)
    if (!frame) return
    try {
      schedule(frameProcessId, frameRoutingId, frame.url)
    } catch {
      // Frame may already be gone.
    }
  })
}

async function injectIntoAllYoutubeFrames(contents: WebContents): Promise<void> {
  try {
    const frames = contents.mainFrame.framesInSubtree
    await Promise.all(
      frames.map(async (frame) => {
        try {
          if (isYoutubePlayerFrameUrl(frame.url)) await injectQualityScript(frame)
        } catch {
          // ignore detached frames
        }
      })
    )
  } catch (err) {
    log(`injectIntoAll failed: ${String(err)}`)
  }
}

function isYoutubePlayerFrameUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname
    if (
      host !== 'www.youtube.com' &&
      host !== 'youtube.com' &&
      host !== 'www.youtube-nocookie.com' &&
      host !== 'youtube-nocookie.com'
    ) {
      return false
    }
    return u.pathname.startsWith('/embed/')
  } catch {
    return false
  }
}

async function applyPrefCookie(quality: PlayerQuality): Promise<void> {
  // Best-effort hint via legacy PREF cookie — ignored by many embeds, harmless if so.
  try {
    const height = quality === 'auto' ? 720 : QUALITY_TO_HEIGHT[quality]
    await session.defaultSession.cookies.set({
      url: 'https://www.youtube.com',
      name: 'PREF',
      value: `f1=${height * 1000}&f6=8`,
      path: '/',
      secure: true,
      expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365
    })
  } catch (err) {
    log(`PREF cookie failed: ${String(err)}`)
  }
}

async function injectQualityScript(frame: WebFrameMain): Promise<void> {
  const quality = preferredQuality
  const height = quality === 'auto' ? null : QUALITY_TO_HEIGHT[quality]
  const label = quality === 'auto' ? null : QUALITY_TO_LABEL[quality]

  const script = `
(() => {
  const preferredHeight = ${height === null ? 'null' : String(height)};
  const preferredLabel = ${label === null ? 'null' : JSON.stringify(label)};
  const ORDER = ['tiny','small','medium','large','hd720','hd1080','highres'];
  const STORAGE_KEY = 'yt-player-quality';

  function buildValue(h, label) {
    const now = Date.now();
    // Modern players expect numeric quality inside data JSON.
    return JSON.stringify({
      data: JSON.stringify({ quality: h, previousQuality: h }),
      creation: now,
      expiration: now + 31536000000,
      // Some builds still read a plain label string — keep as mirror.
      label: label || undefined
    });
  }

  function writeStorage() {
    try {
      if (preferredHeight == null) {
        localStorage.removeItem(STORAGE_KEY);
        return 'cleared';
      }
      // Clear stale bandwidth hints that keep embeds soft.
      try { localStorage.removeItem('yt-player-bandwidth'); } catch (_) {}
      localStorage.setItem(STORAGE_KEY, buildValue(preferredHeight, preferredLabel));
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return 'storage-error:' + String(e);
    }
  }

  const stored = writeStorage();

  try {
    const proto = Storage.prototype;
    if (!proto.__myyoutubeQualityHooked) {
      proto.__myyoutubeQualityHooked = true;
      const original = proto.setItem;
      proto.setItem = function (key, value) {
        if (key === STORAGE_KEY && window.__myyoutubePreferredHeight != null) {
          value = buildValue(window.__myyoutubePreferredHeight, window.__myyoutubePreferredLabel);
        }
        return original.call(this, key, value);
      };
    }
  } catch (_) {}

  window.__myyoutubePreferredHeight = preferredHeight;
  window.__myyoutubePreferredLabel = preferredLabel;

  function pickTarget(levels) {
    if (!levels || !levels.length) return preferredLabel;
    if (!preferredLabel) return levels[0];
    const wantIdx = ORDER.indexOf(preferredLabel);
    // Lowest rung that still meets the preference (exact match preferred).
    let best = null;
    let bestIdx = Infinity;
    for (const level of levels) {
      const idx = ORDER.indexOf(level);
      if (idx >= wantIdx && idx < bestIdx) {
        best = level;
        bestIdx = idx;
      }
    }
    return best || levels[0];
  }

  function enforcePlayer() {
    if (preferredLabel == null && preferredHeight == null) return { skipped: true };
    const nodes = document.querySelectorAll('.html5-video-player');
    let last = null;
    for (const node of nodes) {
      try {
        const player = node;
        if (typeof player.getAvailableQualityLevels !== 'function') continue;
        const levels = player.getAvailableQualityLevels() || [];
        const target = pickTarget(levels);
        if (!target) continue;
        const current =
          typeof player.getPlaybackQuality === 'function' ? player.getPlaybackQuality() : null;
        // Lock min=max so ABR cannot walk down to medium.
        if (typeof player.setPlaybackQualityRange === 'function') {
          try { player.setPlaybackQualityRange(target, target); } catch (_) {}
        }
        if (typeof player.setPlaybackQuality === 'function') {
          try { player.setPlaybackQuality(target); } catch (_) {}
        }
        last = { current: current, target: target, levels: levels.slice(0, 8) };
      } catch (_) {}
    }
    return last;
  }

  const first = enforcePlayer();
  if (window.__myyoutubeQualityTimer) clearInterval(window.__myyoutubeQualityTimer);
  window.__myyoutubeQualityTimer = setInterval(enforcePlayer, 1000);

  return {
    ok: true,
    preferredLabel: preferredLabel,
    preferredHeight: preferredHeight,
    stored: typeof stored === 'string' ? stored.slice(0, 120) : stored,
    first: first,
    href: location.href
  };
})();
`

  try {
    const result = (await frame.executeJavaScript(script, true)) as {
      ok?: boolean
      preferredLabel?: string | null
      first?: { current?: string; target?: string; levels?: string[] } | null
      href?: string
    }
    lastInjectSummary = `ok label=${result?.preferredLabel ?? 'auto'} current=${result?.first?.current ?? '?'} target=${result?.first?.target ?? '?'} levels=${(result?.first?.levels ?? []).join(',') || 'n/a'}`
    log(`inject ${lastInjectSummary} url=${result?.href ?? frame.url}`)
  } catch (err) {
    lastInjectSummary = `failed: ${String(err)}`
    log(`inject failed url=${frame.url} err=${String(err)}`)
  }
}

function log(message: string): void {
  try {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'youtube-quality.log'), `${new Date().toISOString()} ${message}\n`)
  } catch {
    // ignore logging failures
  }
}
