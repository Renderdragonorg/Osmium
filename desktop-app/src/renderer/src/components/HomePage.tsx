import { useState } from 'react'

interface Props {
  onStartCheck: (input: string) => void
  isChecking: boolean
}

export default function HomePage({ onStartCheck, isChecking }: Props) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isChecking) {
      onStartCheck(input.trim())
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-osmium mb-2">◆ OSMIUM</h1>
        <p className="text-white/50 text-sm">AI-powered music copyright checker</p>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste Spotify track URL or ID..."
            disabled={isChecking}
            className="w-full bg-bg-tertiary border border-white/10 rounded px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-osmium/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isChecking}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-osmium text-black px-4 py-1.5 rounded text-sm font-medium hover:bg-osmium/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Checking...' : 'Check'}
          </button>
        </div>
      </form>
      
      <div className="mt-8 text-xs text-white/30 text-center">
        <p>Supports: Spotify track URLs, URIs, and IDs</p>
        <p className="mt-1">Example: https://open.spotify.com/track/...</p>
      </div>
    </div>
  )
}
