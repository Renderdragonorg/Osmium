import { chatCompletionJSON } from "../utils/ai-client.js";
import type { AppConfig, CopyrightVerdict, ParsedCredits, RegistryResult } from "../types/index.js";

export async function runOrchestrator(
    config: AppConfig,
    context: {
        trackName: string;
        artists: string[];
        isrc: string;
        label: string;
        copyrights: Array<{ type: string; text: string }>;
        credits: ParsedCredits | null;
        registryResults: RegistryResult[];
        musicBrainzLabel?: string;
        fingerprintMatch?: number;
        sampleInfo?: unknown;
        discrepancies?: string[];
    }
): Promise<Partial<CopyrightVerdict>> {

    const systemPrompt = `You are a music copyright analysis agent. You receive structured data about a track from multiple sources (Spotify, PRO registries, MusicBrainz, audio fingerprinting) and must synthesize a comprehensive copyright verdict.

Your task:
1. Analyze all provided data for consistency
2. Identify the master rights holder (typically the label)
3. Identify composition rights holders (writers, publishers)
4. Classify the copyright type (original, cover, sample, interpolation, remix, public_domain)
5. Assess risk level for use (low, medium, high, critical)
6. Calculate a confidence score (0-100) based on data completeness and consistency
7. Recommend a licensing path

You MUST respond with ONLY valid JSON matching this schema:
{
  "masterRights": { "holder": "string", "label": "string", "confirmed": boolean, "sources": ["string"] },
  "compositionRights": {
    "writers": [{ "name": "string", "role": "string", "source": "string" }],
    "publishers": ["string"],
    "proRegistrations": [{ "pro": "string", "workId": "string|null", "status": "string" }]
  },
  "samples": { "detected": boolean, "details": [], "riskLevel": "none|low|medium|high" },
  "copyrightType": "original|cover|sample|interpolation|remix|public_domain|unknown",
  "riskLevel": "low|medium|high|critical",
  "confidence": 0-100,
  "licensingPath": "string describing how to license this track",
  "discrepancies": ["string array of any conflicts found between sources"]
}`;

    const userMessage = `Analyze copyright for the following track:

**Track:** ${context.trackName}
**Artists:** ${context.artists.join(", ")}
**ISRC:** ${context.isrc}
**Label (Spotify):** ${context.label}
**Album Copyrights:** ${JSON.stringify(context.copyrights)}

**Credits from Spotify page:**
${context.credits ? JSON.stringify(context.credits, null, 2) : "Not available"}

**PRO Registry Results:**
${context.registryResults.length > 0 ? JSON.stringify(context.registryResults, null, 2) : "No results found"}

**MusicBrainz Label:** ${context.musicBrainzLabel ?? "Not found"}
**Fingerprint Match Confidence:** ${context.fingerprintMatch ?? "Not checked"}
**Sample Detection:** ${context.sampleInfo ? JSON.stringify(context.sampleInfo) : "Not checked"}
**Known Discrepancies:** ${context.discrepancies?.join("; ") ?? "None identified yet"}`;

    try {
        const parsed = await chatCompletionJSON<Partial<CopyrightVerdict>>(
            config,
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            { model: config.openrouter.model }
        );

        return parsed;
    } catch (error) {
        throw new Error(
            `Orchestrator agent failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
