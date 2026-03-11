import type { PipelineEvent, CopyrightVerdict } from '../types'

declare global {
  interface Window {
    osmium: {
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
      }
      store: {
        getChecks: () => Promise<CopyrightVerdict[]>
        clearChecks: () => Promise<void>
      }
      updates: {
        check: () => Promise<{
          success: boolean
          updateAvailable?: boolean
          currentVersion?: string
          latestVersion?: string
          releaseUrl?: string
          error?: string
        }>
      }
      check: {
        run: (trackInput: string) => Promise<{ success: boolean; verdict?: CopyrightVerdict; error?: string }>
        onProgress: (callback: (event: PipelineEvent) => void) => () => void
      }
    }
  }
}

export {}
