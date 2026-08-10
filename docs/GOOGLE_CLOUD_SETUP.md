# Google Cloud setup — MyYouTube

Step-by-step guide to enable **YouTube Data API v3** and create OAuth credentials for MyYouTube.

The same walkthrough is available in the app: **Settings → Account → Help**.

## Links

| Purpose | URL |
| ------- | --- |
| YouTube Data API v3 (enable) | https://console.cloud.google.com/apis/library/youtube.googleapis.com |
| Credentials | https://console.cloud.google.com/apis/credentials |
| OAuth consent screen | https://console.cloud.google.com/apis/credentials/consent |
| Cloud Console home | https://console.cloud.google.com/ |

## Steps

1. Create or select a Google Cloud project.
2. Enable **YouTube Data API v3** via the library URL above.
3. Configure the **OAuth consent screen** (External is fine for personal use; add yourself as a test user while in Testing).
4. Create an OAuth client of type **Desktop app** (recommended).
5. Paste **Client ID** and **Client secret** into **Settings → Account** → Save → Sign in with Google.
6. **Subscriptions → Sync**, then **Home → Refresh**.

### Web client redirect (only if not using Desktop)

Authorized redirect URI (exact):

```text
http://127.0.0.1:17355/callback
```

## Notes

- Secrets stay in Electron `userData`; never commit them.
- OAuth scope is `youtube.readonly` — in-app subscribe/unsubscribe only affect MyYouTube’s local feed.
- Search has a tight Google daily quota; the personal feed does not use `search.list`.
