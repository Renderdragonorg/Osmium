import { useState, useEffect } from 'react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import HomePage from './components/HomePage'
import CheckView from './components/CheckView'
import type { PipelineEvent, CheckSession } from './types'

export default function App() {
  const [view, setView] = useState<'home' | 'check'>('home')
  const [sessions, setSessions] = useState<CheckSession[]>([])
  const [activeSession, setActiveSession] = useState<CheckSession | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string
    latestVersion: string
    releaseUrl: string
  } | null>(null)

  useEffect(() => {
    window.osmium.store.getChecks().then((checks) => {
      const existing: CheckSession[] = checks.map((v, i) => ({
        id: `history-${i}`,
        status: 'completed',
        verdict: v
      }))
      setSessions(existing)
    })
  }, [])

  useEffect(() => {
    window.osmium.updates.check().then((result) => {
      if (result.success && result.updateAvailable && result.latestVersion && result.releaseUrl && result.currentVersion) {
        setUpdateInfo({
          currentVersion: result.currentVersion,
          latestVersion: result.latestVersion,
          releaseUrl: result.releaseUrl
        })
      }
    }).catch(() => undefined)
  }, [])

  const startCheck = async (input: string) => {
    const session: CheckSession = {
      id: `check-${Date.now()}`,
      status: 'running',
      input,
      progress: [],
      startedAt: new Date().toISOString()
    }
    
    setSessions(prev => [session, ...prev])
    setActiveSession(session)
    setView('check')
    setIsChecking(true)

    const unsubscribe = window.osmium.check.onProgress((event: PipelineEvent) => {
      setSessions(prev => prev.map(s => 
        s.id === session.id 
          ? { ...s, progress: [...(s.progress || []), event] }
          : s
      ))
      setActiveSession(prev => prev ? { ...prev, progress: [...(prev.progress || []), event] } : prev)
    })

    const result = await window.osmium.check.run(input)
    
    unsubscribe()
    setIsChecking(false)

    if (result.success && result.verdict) {
      setSessions(prev => prev.map(s => 
        s.id === session.id 
          ? { ...s, status: 'completed', verdict: result.verdict }
          : s
      ))
      setActiveSession(prev => prev ? { ...prev, status: 'completed', verdict: result.verdict } : prev)
    } else {
      setSessions(prev => prev.map(s => 
        s.id === session.id 
          ? { ...s, status: 'failed', error: result.error }
          : s
      ))
      setActiveSession(prev => prev ? { ...prev, status: 'failed', error: result.error } : prev)
    }
  }

  const selectSession = (session: CheckSession) => {
    setActiveSession(session)
    setView('check')
  }

  const goHome = () => {
    setView('home')
    setActiveSession(null)
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {updateInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-bg-secondary border border-white/10 rounded-lg p-6 w-full max-w-md text-center">
            <div className="text-osmium text-lg font-semibold mb-2">Update Required</div>
            <div className="text-white/60 text-sm mb-4">
              A new version is available. Please update to continue using Osmium.
            </div>
            <div className="text-xs text-white/40 mb-4">
              Current: {updateInfo.currentVersion} • Latest: {updateInfo.latestVersion}
            </div>
            <button
              onClick={() => window.osmium.shell.openExternal(updateInfo.releaseUrl)}
              className="w-full px-4 py-2 bg-osmium text-black rounded text-sm font-medium hover:bg-osmium/90"
            >
              Download Latest Release
            </button>
          </div>
        </div>
      )}
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          sessions={sessions} 
          activeId={activeSession?.id} 
          onSelect={selectSession}
          onHome={goHome}
        />
        <main className="flex-1 overflow-auto">
          {view === 'home' ? (
            <HomePage onStartCheck={startCheck} isChecking={isChecking} />
          ) : (
            <CheckView session={activeSession} onNewCheck={() => setView('home')} />
          )}
        </main>
      </div>
    </div>
  )
}
