import { app, BrowserWindow, ipcMain, shell, nativeImage } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import Store from 'electron-store'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
declare const __ENV_GROQ_API_KEY__: string
declare const __ENV_GROQ_MODEL__: string

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
    GROQ_API_KEY: __ENV_GROQ_API_KEY__,
    GROQ_MODEL: __ENV_GROQ_MODEL__,
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

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

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
