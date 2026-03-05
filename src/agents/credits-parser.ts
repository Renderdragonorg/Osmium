import OpenAI from "openai";
import type { AppConfig, ParsedCredits } from "../types/index.js";

/**
 * Credits Parser Agent — AI-powered extraction of structured credits
 * from raw Spotify credits data.
 *
 * Takes raw HTML/JSON from the Spotify credits page scrape and uses AI
 * to extract writers, producers, publishers, and PRO affiliations into
 * structured, normalized data.
 */
export async function parseCreditsWithAI(
    config: AppConfig,
    rawCredits: unknown,
    trackName: string,
    artistNames: string[]
): Promise<ParsedCredits> {
    // If credits are null or empty, return empty structure
    if (!rawCredits) {
        return {
            writers: [],
            producers: [],
            publishers: [],
            proAffiliations: [],
            rawCredits: null,
        };
    }

    const client = new OpenAI({
        baseURL: config.openrouter.baseURL,
        apiKey: config.openrouter.apiKey,
        defaultHeaders: config.openrouter.defaultHeaders,
    });

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
        const result = await client.chat.completions.create({
            model: config.openrouter.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
        });

        const content = result.choices?.[0]?.message?.content;
        if (!content) {
            return {
                writers: [],
                producers: [],
                publishers: [],
                proAffiliations: [],
                rawCredits,
            };
        }

        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [
            null,
            content,
        ];
        const parsed = JSON.parse(jsonMatch[1]!.trim()) as ParsedCredits;

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
