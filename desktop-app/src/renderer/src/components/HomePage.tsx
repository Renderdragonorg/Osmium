import { useState } from 'react'
import type { SpotifySearchResult } from '../types'

interface Props {
  onStartCheck: (input: string) => void
  isChecking: boolean
}

export default function HomePage({ onStartCheck, isChecking }: Props) {
  const [mode, setMode] = useState<'url' | 'search'>('url')
  const [input, setInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SpotifySearchResult[]>([])

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isChecking) {
      onStartCheck(input.trim())
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || isSearching || isChecking) return

    setIsSearching(true)
    try {
      const response = await window.osmium.spotify.search(searchQuery.trim())
      if (response.success && response.results) {
        setSearchResults(response.results)
      } else {
        console.error('Search failed:', response.error)
        setSearchResults([])
      }
    } catch (err) {
      console.error(err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-osmium mb-2">◆ OSMIUM</h1>
        <p className="text-white/50 text-sm">music copyright checker By Renderdragon</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode('url')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${mode === 'url' ? 'bg-osmium text-black' : 'bg-transparent text-white/50 hover:text-white'
            }`}
        >
          URL / ID
        </button>
        <button
          onClick={() => setMode('search')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${mode === 'search' ? 'bg-osmium text-black' : 'bg-transparent text-white/50 hover:text-white'
            }`}
        >
          Search
        </button>
      </div>

      {mode === 'url' ? (
        <form onSubmit={handleSubmitUrl} className="w-full max-w-lg">
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
          <div className="mt-8 text-xs text-white/30 text-center">
            <p>Supports: Spotify track URLs, URIs, and IDs</p>
            <p className="mt-1">Example: https://open.spotify.com/track/...</p>
          </div>
        </form>
      ) : (
        <div className="w-full max-w-lg flex flex-col h-[400px]">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by track name or artist..."
                disabled={isChecking || isSearching}
                className="w-full bg-bg-tertiary border border-white/10 rounded px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-osmium/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim() || isChecking || isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-osmium text-black px-4 py-1.5 rounded text-sm font-medium hover:bg-osmium/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-auto bg-bg-tertiary border border-white/10 rounded">
            {searchResults.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/30 text-sm">
                No results. Search for a track to begin.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {searchResults.map((track) => (
                  <li key={track.id}>
                    <button
                      onClick={() => onStartCheck(track.id)}
                      disabled={isChecking}
                      className="w-full text-left p-4 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center group"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="text-white font-medium truncate">{track.name}</div>
                        <div className="text-white/50 text-sm truncate">{track.artists.join(', ')} — {track.album}</div>
                      </div>
                      <div className="text-osmium opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium whitespace-nowrap">
                        Check
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
