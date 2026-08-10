import { createReadStream, existsSync, statSync } from 'fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { extname, join, normalize, sep } from 'path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
}

/**
 * Serve the packaged renderer over http://127.0.0.1 so YouTube's IFrame Player
 * sees a real http origin. `file://` parents trigger Error 153 ("Video player
 * configuration error") in release builds.
 */
export class RendererServer {
  private server: Server | null = null
  private url: string | null = null
  private expectedHost: string | null = null

  constructor(private readonly root: string) {}

  start(): Promise<string> {
    if (this.url) return Promise.resolve(this.url)

    const server = createServer((req, res) => this.handle(req, res))

    return new Promise((resolve, reject) => {
      const onError = (err: Error): void => {
        server.removeListener('listening', onListening)
        reject(err)
      }
      const onListening = (): void => {
        server.removeListener('error', onError)
        const addr = server.address()
        if (!addr || typeof addr === 'string') {
          reject(new Error('Renderer server failed to bind'))
          return
        }
        this.server = server
        this.url = `http://127.0.0.1:${addr.port}`
        this.expectedHost = `127.0.0.1:${addr.port}`
        resolve(this.url)
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(0, '127.0.0.1')
    })
  }

  stop(): void {
    if (!this.server) return
    this.server.close()
    this.server = null
    this.url = null
    this.expectedHost = null
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    if (req.headers.host !== this.expectedHost) {
      res.statusCode = 421
      res.end()
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end()
      return
    }

    const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
    const decoded = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
    let filePath = normalize(join(this.root, decoded || 'index.html'))

    const rootWithSep = this.root.endsWith(sep) ? this.root : this.root + sep
    if (filePath !== this.root && !filePath.startsWith(rootWithSep)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      filePath = join(this.root, 'index.html')
    }

    res.setHeader(
      'Content-Type',
      MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    )
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // Allow the YouTube iframe to be the only framed content we care about;
    // do not set X-Frame-Options DENY on the app shell itself unnecessarily —
    // the shell is not framed. Keep CSP-friendly defaults via nosniff only.

    if (req.method === 'HEAD') {
      res.statusCode = 200
      res.end()
      return
    }

    createReadStream(filePath)
      .on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500
          res.end('Internal Server Error')
        } else {
          res.end()
        }
      })
      .pipe(res)
  }
}
