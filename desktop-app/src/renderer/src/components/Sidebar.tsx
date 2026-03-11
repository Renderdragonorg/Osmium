import type { CheckSession } from '../types'
import ShinyText from '../../../../shiny-text/shinytext'

interface Props {
  sessions: CheckSession[]
  activeId?: string
  onSelect: (session: CheckSession) => void
  onHome: () => void
}

export default function Sidebar({ sessions, activeId, onSelect, onHome }: Props) {
  return (
    <aside className="w-56 bg-bg-secondary border-r border-white/5 flex flex-col">
      <button 
        onClick={onHome}
        className="p-2 text-left hover:bg-white/5 transition-colors border-b border-white/5"
      >
        <span className="text-osmium">+ New Check</span>
      </button>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 text-xs text-white/40 uppercase tracking-wider">History</div>
        {sessions.length === 0 ? (
          <div className="p-2 text-sm text-white/30">No checks yet</div>
        ) : (
          sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSelect(session)}
              className={`w-full p-2 text-left hover:bg-white/5 transition-colors ${
                activeId === session.id ? 'bg-white/10' : ''
              }`}
            >
              <div className="text-sm truncate">
                {session.verdict?.track.name || session.input || 'Checking...'}
              </div>
              <div className="text-xs text-white/40 truncate">
                {session.verdict?.track.artists?.join(', ') || 'Processing'}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {session.status === 'running' && (
                  <ShinyText text="Running..." speed={1.5} color="#b5b5b5" shineColor="#ffffff" className="text-xs" />
                )}
                {session.status === 'completed' && session.verdict && (
                  <RiskBadge level={session.verdict.riskLevel} />
                )}
                {session.status === 'failed' && (
                  <span className="text-xs text-red-400">Failed</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
    critical: 'text-red-500 bg-red-500/20 px-1 rounded'
  }
  return <span className={`text-xs ${colors[level] || 'text-white/40'}`}>{level.toUpperCase()}</span>
}
