import { chatCompletionJSON } from "../utils/ai-client.js";
import type { AppConfig, ParsedCredits } from "../types/index.js";

export async function parseCreditsWithAI(
    config: AppConfig,
    rawCredits: unknown,
    trackName: string,
    artistNames: string[]
): Promise<ParsedCredits> {
    if (!rawCredits) {
        return {
            writers: [],
            producers: [],
            publishers: [],
            proAffiliations: [],
            rawCredits: null,
        };
    }

    const systemPrompt = `You are a music credits parsing agent. You receive raw credit data from Spotify (either JSON or HTML fragments) and must extract structured entities.

Rules:
- Normalize names to "First Last" format (not "LAST, FIRST")
- Deduplicate entries (same person may appear with different formatting)
- Identify roles: songwriter, composer, lyricist, producer, executive producer, mixer, engineer
- Separate publishers from individual writers
- Identify PRO affiliations if mentioned (ASCAP, BMI, SESAC, SOCAN, PRS, etc.)

Respond with ONLY valid JSON:
{
  "writers": [{ "name": "string", "role": "songwriter|composer|lyricist", "subroles": ["string"] }],
  "producers": [{ "name": "string", "role": "producer|executive_producer|co-producer", "subroles": [] }],
  "publishers": ["string"],
  "proAffiliations": ["string"]
}`;

    const userMessage = `Extract structured credit information from this raw data for the track "${trackName}" by ${artistNames.join(", ")}:

${typeof rawCredits === "string" ? rawCredits : JSON.stringify(rawCredits, null, 2)}`;

    try {
        const parsed = await chatCompletionJSON<ParsedCredits>(
            config,
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            { model: config.openrouter.model }
        );

        return {
            ...parsed,
            rawCredits,
        };
    } catch (error) {
        console.warn(
            `Credits parser agent failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
            writers: [],
            producers: [],
            publishers: [],
            proAffiliations: [],
            rawCredits,
        };
    }
}
