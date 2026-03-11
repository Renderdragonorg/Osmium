import { defineConfig } from 'electron-vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    },
    define: {
      '__ENV_SPOTIFY_CLIENT_ID__': JSON.stringify(process.env.SPOTIFY_CLIENT_ID || ''),
      '__ENV_SPOTIFY_CLIENT_SECRET__': JSON.stringify(process.env.SPOTIFY_CLIENT_SECRET || ''),
      '__ENV_OPENROUTER_API_KEY__': JSON.stringify(process.env.OPENROUTER_API_KEY || ''),
      '__ENV_OPENROUTER_MODEL__': JSON.stringify(process.env.OPENROUTER_MODEL || ''),
      '__ENV_NOCODE_SPOTIFY_CLOUD_NAME__': JSON.stringify(process.env.NOCODE_SPOTIFY_CLOUD_NAME || ''),
      '__ENV_NOCODE_SPOTIFY_TOKEN__': JSON.stringify(process.env.NOCODE_SPOTIFY_TOKEN || ''),
      '__ENV_TAVILY_API_KEY__': JSON.stringify(process.env.TAVILY_API_KEY || ''),
      '__ENV_ACOUSTID_API_KEY__': JSON.stringify(process.env.ACOUSTID_API_KEY || ''),
      '__ENV_DISCOGS_TOKEN__': JSON.stringify(process.env.DISCOGS_TOKEN || ''),
      '__ENV_CEREBRAS_API_KEY__': JSON.stringify(process.env.CEREBRAS_API_KEY || ''),
      '__ENV_CEREBRAS_MODEL__': JSON.stringify(process.env.CEREBRAS_MODEL || ''),
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    base: './',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      },
      outDir: 'out/renderer'
    },
    plugins: [react()],
    publicDir: resolve(__dirname, 'public')
  }
})
