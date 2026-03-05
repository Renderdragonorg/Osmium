### Final Implementation Plan

**Configuration:** CLI Tool with progress events + Full PRO scraping

---

#### CLI Usage

```bash
# Check a track
npx tsx src/index.ts check "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b"

# Output verdict JSON to file
npx tsx src/index.ts check "spotify:track:0VjIjW4GlUZAMYd2vXMi3b" --output verdict.json

# Verbose mode with progress
npx tsx src/index.ts check "0VjIjW4GlUZAMYd2vXMi3b" --verbose
```

---

#### Progress Events

```typescript
// Event emitter pattern
pipeline.on('progress', (event) => {
  // { step: 1, name: 'track-resolution', status: 'in_progress' }
  // { step: 1, name: 'track-resolution', status: 'completed', data: {...} }
});
```

---

#### Files to Create

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry, parse args, run pipeline |
| `src/config/index.ts` | Load env vars, validate |
| `src/types/*.ts` | All TypeScript interfaces |
| `src/services/spotify.ts` | Auth + track/album fetch |
| `src/services/credits-scraper.ts` | Scrape `__NEXT_DATA__` from Spotify page |
| `src/services/registries/ascap.ts` | ASCAP ACE web scrape |
| `src/services/registries/bmi.ts` | BMI Repertoire scrape |
| `src/services/registries/sesac.ts` | SESAC lookup |
| `src/services/registries/copyright-office.ts` | US Copyright Office |
| `src/services/musicbrainz.ts` | ISRC → MBID lookup |
| `src/services/acoustid.ts` | Audio fingerprint |
| `src/services/audD.ts` | Cross-platform ID |
| `src/services/discogs.ts` | Indie verification |
| `src/agents/orchestrator.ts` | OpenRouter main agent |
| `src/agents/credits-parser.ts` | AI entity extraction |
| `src/agents/registry-lookup.ts` | Parallel PRO agent |
| `src/agents/discrepancy.ts` | Conflict resolution |
| `src/agents/sample-detector.ts` | WhoSampled check |
| `src/agents/risk-assessor.ts` | Final verdict |
| `src/pipeline/runner.ts` | Event-emitting pipeline |
| `src/utils/*.ts` | HTTP, logging, validation |

---

#### OpenRouter Integration

```typescript
import { OpenRouter } from "@openrouter/sdk";

const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

// Orchestrator with tool use
const result = await client.chat.send({
  model: "openai/gpt-oss-120b:free",
  messages: [...],
  tools: [
    { name: "search_ascap", ... },
    { name: "search_bmi", ... },
    { name: "web_search", ... }
  ]
});
```

---

Ready to implement when you give the go-ahead.