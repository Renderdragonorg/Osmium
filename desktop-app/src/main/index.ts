import { app, BrowserWindow, ipcMain, shell, nativeImage, session } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { request as httpRequest } from 'http'
import { request as httpsRequest } from 'https'
import Store from 'electron-store'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
app.disableHardwareAcceleration()

/* ──────────────────────────────────────────────
 * Compile-time env injection (populated by electron-vite define)
 * In dev mode these will be empty strings and dotenv handles it.
 * In packaged builds these contain the real values from CI secrets.
 * ────────────────────────────────────────────── */
declare const __ENV_SPOTIFY_CLIENT_ID__: string
declare const __ENV_SPOTIFY_CLIENT_SECRET__: string
declare const __ENV_OPENROUTER_API_KEY__: string
declare const __ENV_OPENROUTER_MODEL__: string
declare const __ENV_NOCODE_SPOTIFY_CLOUD_NAME__: string
declare const __ENV_NOCODE_SPOTIFY_TOKEN__: string
declare const __ENV_TAVILY_API_KEY__: string
declare const __ENV_ACOUSTID_API_KEY__: string
declare const __ENV_DISCOGS_TOKEN__: string
declare const __ENV_CEREBRAS_API_KEY__: string
declare const __ENV_CEREBRAS_MODEL__: string

function injectEnv() {
  const vars: Record<string, string> = {
    SPOTIFY_CLIENT_ID: __ENV_SPOTIFY_CLIENT_ID__,
    SPOTIFY_CLIENT_SECRET: __ENV_SPOTIFY_CLIENT_SECRET__,
    OPENROUTER_API_KEY: __ENV_OPENROUTER_API_KEY__,
    OPENROUTER_MODEL: __ENV_OPENROUTER_MODEL__,
    NOCODE_SPOTIFY_CLOUD_NAME: __ENV_NOCODE_SPOTIFY_CLOUD_NAME__,
    NOCODE_SPOTIFY_TOKEN: __ENV_NOCODE_SPOTIFY_TOKEN__,
    TAVILY_API_KEY: __ENV_TAVILY_API_KEY__,
    ACOUSTID_API_KEY: __ENV_ACOUSTID_API_KEY__,
    DISCOGS_TOKEN: __ENV_DISCOGS_TOKEN__,
    CEREBRAS_API_KEY: __ENV_CEREBRAS_API_KEY__,
    CEREBRAS_MODEL: __ENV_CEREBRAS_MODEL__,
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value && !process.env[key]) {
      process.env[key] = value
    }
  }
}

injectEnv()

/* ──────────────────────────────────────────────
 * Path resolution: in dev mode resolve CLI from parent dir,
 * in packaged mode resolve from extraResources/cli-dist
 * ────────────────────────────────────────────── */
function getCliDistPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'cli-dist')
  }
  return join(__dirname, '../../..')
}

const OSMIUM_ICON = 'data:image/png;base64,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'

function getIcon(): Electron.NativeImage {
  const paths = [
    join(__dirname, '../../public/icon.png'),
    join(__dirname, '../../../public/icon.png'),
    join(process.resourcesPath, 'public/icon.png')
  ]

  for (const iconPath of paths) {
    if (existsSync(iconPath)) {
      try {
        const img = nativeImage.createFromPath(iconPath)
        if (!img.isEmpty()) {
          return img
        }
      } catch {
        continue
      }
    }
  }

  return nativeImage.createFromDataURL(OSMIUM_ICON)
}

interface PipelineEvent {
  step: number
  name: string
  status: string
  message?: string
  data?: unknown
  error?: string
}

interface CopyrightVerdict {
  track: { name: string; artists: string[]; isrc: string; spotifyId: string; releaseDate: string; duration: number }
  masterRights: { holder: string; label: string; confirmed: boolean; sources: string[] }
  compositionRights: { writers: Array<{ name: string; role: string; source: string }>; publishers: string[]; proRegistrations: Array<{ pro: string; workId?: string; status: string }> }
  samples: { detected: boolean; details: unknown[]; riskLevel: string }
  copyrightType: string
  riskLevel: string
  confidence: number
  licensingPath: string
  discrepancies: string[]
  dataSources: string[]
  aiSummary?: { isCopyrighted: string; requiresLicense: string; licensingUrl?: string; explanation: string; actionableSteps: string[] }
  generatedAt: string
}

const store = new Store<{ checks: CopyrightVerdict[] }>({
  defaults: { checks: [] }
})

let mainWindow: BrowserWindow | null = null
let loadTimeout: NodeJS.Timeout | null = null

const UPDATE_REPO = {
  owner: 'Renderdragonorg',
  repo: 'Osmium'
}

function parseVersion(value: string): number[] | null {
  const cleaned = value.trim().replace(/^v/i, '').split('-')[0]
  const parts = cleaned.split('.')
  if (parts.length === 0) return null
  const numbers = parts.map((part) => Number(part))
  if (numbers.some((num) => Number.isNaN(num))) return null
  return numbers
}

function compareVersions(current: string, latest: string): number {
  const currentParts = parseVersion(current) ?? []
  const latestParts = parseVersion(latest) ?? []
  const maxLen = Math.max(currentParts.length, latestParts.length)
  for (let i = 0; i < maxLen; i += 1) {
    const a = currentParts[i] ?? 0
    const b = latestParts[i] ?? 0
    if (a > b) return 1
    if (a < b) return -1
  }
  return 0
}

async function fetchJson(url: string, headers: Record<string, string> = {}, timeoutMs = 10000) {
  return await new Promise<unknown>((resolve, reject) => {
    const target = new URL(url)
    const requester = target.protocol === 'https:' ? httpsRequest : httpRequest
    const req = requester(
      {
        method: 'GET',
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        headers
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Request failed with status ${res.statusCode}`))
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(error)
          }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`))
    })
    req.end()
  })
}

async function fetchLatestRelease() {
  const url = `https://api.github.com/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.repo}/releases/latest`
  const headers = {
    'User-Agent': 'Osmium-Desktop',
    Accept: 'application/vnd.github+json'
  }
  return await fetchJson(url, headers)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function checkUrlReady(url: string, timeoutMs = 2000): Promise<boolean> {
  return await new Promise((resolve) => {
    const target = new URL(url)
    const requester = target.protocol === 'https:' ? httpsRequest : httpRequest
    const req = requester(
      {
        method: 'HEAD',
        hostname: target.hostname,
        port: target.port,
        path: target.pathname
      },
      (res) => {
        res.resume()
        resolve(res.statusCode ? res.statusCode < 500 : false)
      }
    )
    req.on('error', () => resolve(false))
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      resolve(false)
    })
    req.end()
  })
}

async function waitForRenderer(url: string, timeoutMs = 30000, intervalMs = 500): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await checkUrlReady(url)) return true
    await delay(intervalMs)
  }
  return false
}

function showLoadError(errorTitle: string, details: string) {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Osmium</title>
      <style>
        body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; }
        .wrap { padding: 32px; }
        h1 { font-size: 20px; margin: 0 0 12px; }
        p { color: #b3b3b3; }
        pre { white-space: pre-wrap; background: #111; padding: 12px; border-radius: 8px; color: #e8ff47; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <h1>${errorTitle}</h1>
        <p>The renderer failed to load. Check the details below.</p>
        <pre>${details}</pre>
      </div>
    </body>
  </html>`
  const dataUrl = `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`
  mainWindow?.loadURL(dataUrl)
}

async function createWindow() {
  const icon = getIcon()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0a',
    icon: icon,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      loadTimeout = null
    }
    showLoadError('Failed to load renderer', `Code: ${errorCode}\nDescription: ${errorDescription}\nURL: ${validatedURL}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      loadTimeout = null
    }
    showLoadError('Renderer process crashed', `Reason: ${details.reason}\nExit code: ${details.exitCode}`)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      loadTimeout = null
    }
  })

  const loadTimeoutMs = app.isPackaged ? 10000 : 30000
  loadTimeout = setTimeout(() => {
    const url = mainWindow?.webContents.getURL() || 'unknown'
    showLoadError('Renderer did not finish loading', `URL: ${url}`)
  }, loadTimeoutMs)

  const startURL = !app.isPackaged
    ? (process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173')
    : pathToFileURL(join(__dirname, '../renderer/index.html')).href

  if (!app.isPackaged) {
    const ready = await waitForRenderer(startURL)
    if (!ready) {
      showLoadError(
        'Renderer dev server not reachable',
        `URL: ${startURL}\nMake sure the renderer dev server is running (npm run dev in desktop-app).`
      )
      return
    }
  }

  mainWindow.loadURL(startURL)

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }
}

function setContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://api.spotify.com https://accounts.spotify.com https://open.spotify.com https://api.openrouter.ai https://api.cerebras.ai https://api.tavily.com https://coverartarchive.org https://musicbrainz.org https://api.acoustid.org https://api.discogs.com https://api.github.com wss: ws:; " +
          "frame-src 'none';"
        ]
      }
    })
  })
}

app.whenReady().then(() => {
  setContentSecurityPolicy()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())

ipcMain.handle('shell:open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle('store:get-checks', () => store.get('checks'))
ipcMain.handle('store:clear-checks', () => store.set('checks', []))
ipcMain.handle('store:get-path', () => store.path)

ipcMain.handle('updates:check', async () => {
  try {
    const currentVersion = app.getVersion()
    const release = (await fetchLatestRelease()) as { tag_name?: string; html_url?: string }
    const latestVersion = release.tag_name ? release.tag_name.replace(/^v/i, '') : undefined
    if (!latestVersion || !release.html_url) {
      return { success: false, error: 'Unable to determine latest release.' }
    }
    const updateAvailable = compareVersions(currentVersion, latestVersion) < 0
    return {
      success: true,
      updateAvailable,
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

ipcMain.handle('check:run', async (_event, trackInput: string) => {
  try {
    const cliDist = getCliDistPath()
    const runnerUrl = pathToFileURL(join(cliDist, 'dist/pipeline/runner.js')).href
    const configUrl = pathToFileURL(join(cliDist, 'dist/config/index.js')).href

    const { PipelineRunner } = await import(runnerUrl)
    const { getConfig } = await import(configUrl)

    const config = getConfig()
    const pipeline = new PipelineRunner(config)

    const sendProgress = (event: PipelineEvent) => {
      mainWindow?.webContents.send('check:progress', event)
    }

    pipeline.on('progress', sendProgress)

    const verdict = await pipeline.run(trackInput, { verbose: false })
    const checks = store.get('checks') || []
    store.set('checks', [verdict, ...checks].slice(0, 50))
    return { success: true, verdict }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

ipcMain.handle('spotify:search', async (_event, query: string) => {
  try {
    const cliDist = getCliDistPath()
    const configUrl = pathToFileURL(join(cliDist, 'dist/config/index.js')).href
    const spotifyUrl = pathToFileURL(join(cliDist, 'dist/services/spotify.js')).href

    const { getConfig } = await import(configUrl)
    const { getSpotifyToken, searchTracks } = await import(spotifyUrl)

    const config = getConfig()
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret)
    const results = await searchTracks(query, token)

    return { success: true, results }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})
