/// <reference types="vite/client" />

import type { MyYouTubeApi } from '@shared/ipc/api'

declare global {
  interface Window {
    myyoutube: MyYouTubeApi
  }
}

export {}
