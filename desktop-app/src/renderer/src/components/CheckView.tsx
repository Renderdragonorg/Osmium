import type { CheckSession, PipelineEvent } from '../types'

interface Props {
  session: CheckSession | null
  onNewCheck: () => void
}

export default function CheckView({ session, onNewCheck }: Props) {
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center text-white/30">
        No session selected
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      {session.status === 'running' && (
        <ProgressView progress={session.progress || []} />
      )}
      
      {session.status === 'failed' && (
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">Check Failed</div>
          <div className="text-white/50 text-sm">{session.error}</div>
          <button 
            onClick={onNewCheck}
            className="mt-4 px-4 py-2 bg-osmium text-black rounded text-sm font-medium hover:bg-osmium/90"
          >
            Try Again
          </button>
        </div>
      )}
      
      {session.status === 'completed' && session.verdict && (
        <VerdictView verdict={session.verdict} />
      )}
    </div>
  )
}

function ProgressView({ progress }: { progress: PipelineEvent[] }) {
  const steps = [
    { name: 'track-resolution', label: 'Track Resolution' },
    { name: 'credits-parsing', label: 'Credits Parsing' },
    { name: 'registry-lookup', label: 'Registry Lookup' },
    { name: 'musicbrainz-lookup', label: 'MusicBrainz' },
    { name: 'fingerprint-check', label: 'Fingerprint' },
    { name: 'sample-detection', label: 'Sample Detection' },
    { name: 'ai-synthesis', label: 'AI Synthesis' },
    { name: 'risk-assessment', label: 'Risk Assessment' },
    { name: 'ai-summary', label: 'AI Summary' }
  ]

  const getStepStatus = (stepName: string) => {
    const events = progress.filter(e => e.name === stepName)
    if (events.length === 0) return 'pending'
    const lastEvent = events[events.length - 1]
    return lastEvent.status
  }

  const getStepMessage = (stepName: string) => {
    const events = progress.filter(e => e.name === stepName)
    if (events.length === 0) return null
    const lastEvent = events[events.length - 1]
    return lastEvent.message
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-medium mb-4 text-osmium">Running Check...</h2>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const status = getStepStatus(step.name)
          const message = getStepMessage(step.name)
          
          return (
            <div key={step.name} className="flex items-center gap-3 p-2 rounded bg-bg-secondary">
              <div className="w-6 h-6 flex items-center justify-center text-sm text-white/40">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm">{step.label}</div>
                {message && <div className="text-xs text-white/40">{message}</div>}
              </div>
              <StatusIcon status={status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <span className="text-green-400">✓</span>
    case 'failed':
      return <span className="text-red-400">✗</span>
    case 'skipped':
      return <span className="text-white/30">−</span>
    case 'in_progress':
      return (
        <span className="relative flex items-center justify-center w-4 h-4">
          <svg className="absolute w-4 h-4 animate-spin text-osmium/30" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-osmium text-[6px]">●</span>
        </span>
      )
    default:
      return <span className="text-white/20">○</span>
  }
}

function VerdictView({ verdict }: { verdict: NonNullable<CheckSession['verdict']> }) {
  const spotifyUrl = `https://open.spotify.com/track/${verdict.track.spotifyId}`
  
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">{verdict.track.name}</h2>
          <p className="text-white/50">{verdict.track.artists.join(', ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={verdict.riskLevel} />
          <span className="text-white/40">{verdict.confidence}%</span>
        </div>
      </div>

      <button 
        onClick={() => window.osmium.shell.openExternal(spotifyUrl)}
        className="inline-flex items-center gap-2 text-osmium hover:underline text-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Open in Spotify
      </button>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Master Rights" value={verdict.masterRights.holder} sub={verdict.masterRights.label} />
        <InfoCard label="Copyright Type" value={verdict.copyrightType.replace(/_/g, ' ').toUpperCase()} />
        <InfoCard label="ISRC" value={verdict.track.isrc || 'N/A'} />
        <InfoCard label="Writers" value={verdict.compositionRights.writers.map(w => w.name).join(', ') || 'Unknown'} />
      </div>

      {verdict.compositionRights.proRegistrations.length > 0 && (
        <div className="bg-bg-secondary rounded p-3">
          <h3 className="text-sm text-white/50 mb-2">PRO Registrations</h3>
          <div className="space-y-1">
            {verdict.compositionRights.proRegistrations.map((r, i) => (
              <div key={i} className="text-sm">
                <span className="text-osmium">{r.pro}</span>
                {r.workId && <span className="text-white/40 ml-2">#{r.workId}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {verdict.samples.detected && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
          <h3 className="text-sm text-yellow-400 mb-1">Samples Detected</h3>
          <p className="text-sm text-white/70">Risk Level: {verdict.samples.riskLevel}</p>
        </div>
      )}

      {verdict.discrepancies.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
          <h3 className="text-sm text-yellow-400 mb-2">Discrepancies</h3>
          <ul className="text-sm text-white/70 space-y-1">
            {verdict.discrepancies.map((d, i) => <li key={i}>• {d}</li>)}
          </ul>
        </div>
      )}

      {verdict.aiSummary && (
        <div className="bg-bg-secondary rounded p-3">
          <div className="flex items-center gap-2 mb-3">
            <LicenseBadge requires={verdict.aiSummary.requiresLicense} />
          </div>
          <p className="text-sm text-white/70 mb-3">{verdict.aiSummary.explanation}</p>
          
          {verdict.aiSummary.licensingUrl && (
            <div className="mb-3">
              <h3 className="text-sm text-white/50 mb-1">Licensing URL</h3>
              <button 
                onClick={() => window.osmium.shell.openExternal(verdict.aiSummary!.licensingUrl!)}
                className="text-osmium hover:underline text-sm break-all text-left"
              >
                {verdict.aiSummary.licensingUrl}
              </button>
            </div>
          )}
          
          {verdict.aiSummary.actionableSteps.length > 0 && (
            <>
              <h3 className="text-sm text-white/50 mb-2">Actionable Steps</h3>
              <ul className="text-sm space-y-1">
                {verdict.aiSummary.actionableSteps.map((step, i) => (
                  <li key={i} className="text-white/70">→ {step}</li>
                ))}
              </ul>
            </>
          )}
          
          {verdict.aiSummary.webSearchSources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <h3 className="text-sm text-white/50 mb-2">Web Sources</h3>
              <div className="space-y-2">
                {verdict.aiSummary.webSearchSources.map((src, i) => (
                  <div key={i}>
                    <span className="text-sm text-white/70">{src.title}</span>
                    <button 
                      onClick={() => window.osmium.shell.openExternal(src.url)}
                      className="block text-xs text-osmium/70 hover:text-osmium hover:underline truncate text-left"
                    >
                      {src.url}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-white/30 pt-2">
        Sources: {verdict.dataSources.join(' • ')}
      </div>
    </div>
  )
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-bg-secondary rounded p-3">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className="text-sm truncate">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  )
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
    critical: 'bg-red-500 text-white'
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[level] || 'bg-white/10 text-white/50'}`}>
      {level.toUpperCase()}
    </span>
  )
}

function LicenseBadge({ requires }: { requires: string }) {
  if (requires === 'no') {
    return <span className="bg-green-500 text-black px-2 py-0.5 rounded text-xs font-medium">NO LICENSE REQUIRED</span>
  }
  if (requires === 'depends') {
    return <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-medium">LICENSE MAY BE REQUIRED</span>
  }
  return <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-medium">LICENSE REQUIRED</span>
}
