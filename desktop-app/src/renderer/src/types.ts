export interface PipelineEvent {
  step: number
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  message?: string
  data?: unknown
  error?: string
}

export interface CopyrightVerdict {
  track: {
    name: string
    artists: string[]
    isrc: string
    spotifyId: string
    releaseDate: string
    duration: number
  }
  masterRights: {
    holder: string
    label: string
    confirmed: boolean
    sources: string[]
  }
  compositionRights: {
    writers: Array<{ name: string; role: string; source: string }>
    publishers: string[]
    proRegistrations: Array<{ pro: string; workId?: string; status: string }>
  }
  samples: {
    detected: boolean
    details: unknown[]
    riskLevel: string
  }
  copyrightType: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  licensingPath: string
  discrepancies: string[]
  dataSources: string[]
  aiSummary?: {
    isCopyrighted: string
    requiresLicense: string
    masterRightsHolder: string
    labelType: string
    licensingUrl?: string
    explanation: string
    actionableSteps: string[]
    webSearchSources: Array<{ title: string; url: string }>
  }
  generatedAt: string
}

export interface CheckSession {
  id: string
  status: 'running' | 'completed' | 'failed'
  input?: string
  progress?: PipelineEvent[]
  verdict?: CopyrightVerdict
  error?: string
  startedAt?: string
}
