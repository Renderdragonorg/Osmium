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
      check: {
        run: (trackInput: string) => Promise<{ success: boolean; verdict?: CopyrightVerdict; error?: string }>
        onProgress: (callback: (event: PipelineEvent) => void) => () => void
      }
    }
  }
}

export {}
