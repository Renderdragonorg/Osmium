# Osmium CLI 💿

**Osmium** is a music copyright checker By Renderdragon. It orchestrates a sophisticated multi-agent AI pipeline to resolve track ownership by consulting Spotify, PRO registries (ASCAP, BMI, SESAC, Copyright Office), audio fingerprinting (AcoustID), metadata databases (MusicBrainz, Discogs), and sample databases. 

Finally, it synthesizes all this data using an LLM (via OpenRouter) to provide a definitive, human-readable answer on whether a specific track requires a license and the steps to obtain it.

---

## Features

- **Spotify Data Extraction**: Resolves ISCRs, labels, and album copyrights.
- **AI-Powered Credits Parsing**: Scrapes and parses raw artist, writer, and producer credits from Spotify.
- **PRO Registry Lookups**: Searches ASCAP, BMI, SESAC, and the US Copyright Office for registrations.
- **MusicBrainz & Discogs Queries**: Cross-references label and release information.
- **Audio Fingerprinting**: Checks AcoustID for alternate registrations.
- **Sample Detection**: Checks for known samples, interpolations, and covers.
- **Multi-Agent Orchestration**: Synthesizes conflicting data using AI to provide a confidence score and risk assessment.
- **AI Licensing Summary**: Searches the web in real-time for label licensing policies and explains exactly what kind of license you need.

---

## Installation

1. Clone this repository (or download the source).
2. Install dependencies via `npm` or `pnpm`:
   ```bash
   pnpm install
   # or
   npm install
   ```
3. Build the CLI:
   ```bash
   npm run build
   ```
4. You can optionally link the CLI globally to run the `osmium` command anywhere:
   ```bash
   npm link
   ```

---

## Configuration

Osmium relies on several APIs. Copy the `.env.example` file to `.env` (or create a new `.env` file in the root) and provide the following variables:

```env
# Required: Spotify Application Credentials
SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"

# Required: OpenRouter API for LLM reasoning (AI Synthesis & Summary)
OPENROUTER_API_KEY="your_openrouter_api_key"
OPENROUTER_MODEL="openai/gpt-4o" # or "anthropic/claude-3.5-sonnet", etc.

# Optional but recommended: Web Search for AI Licensing Summary
TAVILY_API_KEY="your_tavily_api_key"

# Optional: Extra metadata APIs
ACOUSTID_API_KEY="your_acoustid_key"
DISCOGS_TOKEN="your_discogs_pat"
```

---

## Usage

You can use Osmium by passing a Spotify track URL, URI, or ID to the `check` command.

### Check a Single Track
```bash
npx osmium check <spotify-track-url>
```

**Options:**
- `-v, --verbose`: Enable detailed progress logs of every pipeline step and web search result.
- `-o, --output <file.json>`: Save the raw, structured multi-agent verdict as a JSON file.

*Example:*
```bash
npx osmium check https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT --verbose
```

### Check an Entire Playlist
```bash
npx osmium check-playlist <spotify-playlist-url>
```

**Options:**
- `--limit <n>`: Limit the number of tracks analyzed in the playlist.
- `-o, --output <file.json>`: Save the full array of verdicts.
- `-v, --verbose`: Enable detailed output.

---

## The Pipeline (How it works)

When you check a track, Osmium runs a 9-step orchestrated pipeline:

1. **Track Resolution**: Fetches base metadata and ISRC from Spotify.
2. **Credits Parsing**: Scrapes the web view of the Spotify track credits and uses AI to assign roles (writers, producers).
3. **Registry Lookup**: Queries ASCAP, BMI, SESAC, and US Copyright public repertoires.
4. **MusicBrainz**: Resolves label data via ISRC.
5. **Fingerprint Check**: Looks up audio duplicates via AcoustID.
6. **Sample Detection**: Queries for samples and cover metadata.
7. **AI Synthesis**: Passes all compiled (and potentially conflicting) data to the Orchestrator AI to find the consensus.
8. **Risk Assessment**: Classifies the usage risk (LOW, MEDIUM, HIGH, CRITICAL) and calculates data confidence.
9. **AI Summary**: Searches the web for the confirmed master rights holder and generates a finalized, readable licensing verdict.
