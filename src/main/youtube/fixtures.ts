import type { ProviderChannel, ProviderVideo } from './types'

export const mockChannels: ProviderChannel[] = [
  {
    id: 'ch_tech_depth',
    title: 'Tech Depth',
    description: 'Long-form engineering explainers',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
    uploadsPlaylistId: 'UU_tech_depth'
  },
  {
    id: 'ch_science_desk',
    title: 'Science Desk',
    description: 'Clear science reporting',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
    uploadsPlaylistId: 'UU_science_desk'
  },
  {
    id: 'ch_quiet_music',
    title: 'Quiet Music',
    description: 'Ambient and focus music',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
    uploadsPlaylistId: 'UU_quiet_music'
  },
  {
    id: 'ch_shorts_factory',
    title: 'Shorts Factory',
    description: 'Mostly short clips',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
    uploadsPlaylistId: 'UU_shorts_factory'
  }
]

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export const mockVideos: ProviderVideo[] = [
  {
    id: 'vid_rust_async',
    channelId: 'ch_tech_depth',
    channelTitle: 'Tech Depth',
    title: 'Async Rust without the panic',
    description: 'Practical patterns for async Rust services.',
    publishedAt: daysAgo(0),
    durationSeconds: 1842,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 42000,
    likeCount: 3100,
    isShort: false
  },
  {
    id: 'vid_sqlite_wal',
    channelId: 'ch_tech_depth',
    channelTitle: 'Tech Depth',
    title: 'SQLite WAL mode explained',
    description: 'Why WAL helps desktop apps.',
    publishedAt: daysAgo(1),
    durationSeconds: 961,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 18000,
    likeCount: 1400,
    isShort: false
  },
  {
    id: 'vid_quantum_noise',
    channelId: 'ch_science_desk',
    channelTitle: 'Science Desk',
    title: 'What quantum noise actually means',
    description: 'A careful walkthrough of measurement noise.',
    publishedAt: daysAgo(2),
    durationSeconds: 1320,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 55000,
    likeCount: 4200,
    isShort: false
  },
  {
    id: 'vid_climate_models',
    channelId: 'ch_science_desk',
    channelTitle: 'Science Desk',
    title: 'How climate models are tested',
    description: 'Validation, ensembles, and uncertainty.',
    publishedAt: daysAgo(4),
    durationSeconds: 2105,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 91000,
    likeCount: 6700,
    isShort: false
  },
  {
    id: 'vid_rain_window',
    channelId: 'ch_quiet_music',
    channelTitle: 'Quiet Music',
    title: 'Rain on a window — 45 minutes',
    description: 'Soft rain ambience for focus.',
    publishedAt: daysAgo(3),
    durationSeconds: 2700,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 120000,
    likeCount: 8900,
    isShort: false
  },
  {
    id: 'vid_coffee_lofi',
    channelId: 'ch_quiet_music',
    channelTitle: 'Quiet Music',
    title: 'Late night coffee loft',
    description: 'Lo-fi beats for reading.',
    publishedAt: daysAgo(6),
    durationSeconds: 3600,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 240000,
    likeCount: 15000,
    isShort: false
  },
  {
    id: 'vid_short_tip_1',
    channelId: 'ch_shorts_factory',
    channelTitle: 'Shorts Factory',
    title: 'One keyboard tip',
    description: 'Quick tip short',
    publishedAt: daysAgo(0),
    durationSeconds: 42,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 8000,
    likeCount: 200,
    isShort: true
  },
  {
    id: 'vid_short_tip_2',
    channelId: 'ch_shorts_factory',
    channelTitle: 'Shorts Factory',
    title: 'Desk cable hack',
    description: 'Another short',
    publishedAt: daysAgo(1),
    durationSeconds: 55,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 12000,
    likeCount: 350,
    isShort: true
  },
  {
    id: 'vid_electron_ipc',
    channelId: 'ch_tech_depth',
    channelTitle: 'Tech Depth',
    title: 'Typed IPC in Electron apps',
    description: 'Zod-validated preload bridges.',
    publishedAt: daysAgo(8),
    durationSeconds: 1488,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 27000,
    likeCount: 2100,
    isShort: false
  },
  {
    id: 'vid_attention_ux',
    channelId: 'ch_science_desk',
    channelTitle: 'Science Desk',
    title: 'Why infinite scroll captures attention',
    description: 'Behavioural design without the hype.',
    publishedAt: daysAgo(5),
    durationSeconds: 1175,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    viewCount: 64000,
    likeCount: 5100,
    isShort: false
  }
]

/** Real public video ids usable in the official IFrame player for mock watch tests. */
export const iframeDemoVideoIds: Record<string, string> = {
  vid_rust_async: 'rfscVS0vtbw',
  vid_sqlite_wal: 'ZSN9ddDjVSE',
  vid_quantum_noise: 'Q1YqgPAtzho',
  vid_climate_models: 'oHhDmgNwRQk',
  vid_rain_window: 'mPZkdNFkNko',
  vid_coffee_lofi: 'jfKfPfyJRdk',
  vid_short_tip_1: 'aqz-KE-bpKQ',
  vid_short_tip_2: 'LXb3EKWsInQ',
  vid_electron_ipc: 'FWwqr2l9vA0',
  vid_attention_ux: '3X72jnbBuNY'
}

export function resolvePlayableId(videoId: string): string {
  return iframeDemoVideoIds[videoId] ?? videoId
}
