import type { PipelineEvent, CopyrightVerdict, SpotifySearchResult } from './types'

declare global {
  interface Window {
    osmium: {
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
      }
      shell: {
        openExternal: (url: string) => Promise<void>
      }
      store: {
        getChecks: () => Promise<CopyrightVerdict[]>
        clearChecks: () => Promise<void>
        getPath: () => Promise<string>
      }
      check: {
        run: (trackInput: string) => Promise<{ success: boolean; verdict?: CopyrightVerdict; error?: string }>
        onProgress: (callback: (event: PipelineEvent) => void) => () => void
      }
      spotify: {
        search: (query: string) => Promise<{ success: boolean; results?: SpotifySearchResult[]; error?: string }>
      }
    }
  }
}

export { }
