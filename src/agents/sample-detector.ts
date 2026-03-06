import { chatCompletionJSON } from "../utils/ai-client.js";
import { fetchWithRetry } from "../utils/http.js";
import type { AppConfig, SampleInfo } from "../types/index.js";

export async function detectSamples(
    config: AppConfig,
    trackName: string,
    artistName: string
): Promise<{
    samples: SampleInfo[];
    riskLevel: "none" | "low" | "medium" | "high";
}> {
    // Try to scrape WhoSampled for sample information
    const whoSampledData = await queryWhoSampled(trackName, artistName);

    if (!whoSampledData && trackName) {
        // No WhoSampled data — use AI to assess based on track metadata
        return await assessSamplesWithAI(config, trackName, artistName);
    }

    if (whoSampledData && whoSampledData.length > 0) {
        return {
            samples: whoSampledData,
            riskLevel: whoSampledData.some((s) => !s.cleared) ? "high" : "medium",
        };
    }

    return { samples: [], riskLevel: "none" };
}

/**
 * Query WhoSampled by scraping search results.
 */
async function queryWhoSampled(
    trackName: string,
    artistName: string
): Promise<SampleInfo[] | null> {
    try {
        const query = encodeURIComponent(`${trackName} ${artistName}`);
        const url = `https://www.whosampled.com/search/?q=${query}`;

        const response = await fetchWithRetry(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html",
            },
        });

        if (!response.ok) return null;

        const html = await response.text();

        // Look for sample entries in the search results
        const samples: SampleInfo[] = [];

        // Pattern: "Contains sample of X by Y"
        const sampleRegex =
            /[Cc]ontains?\s+(?:a\s+)?sample\s+of\s+["\u201C\u201D](.+?)["\u201C\u201D]\s+by\s+(.+?)(?:<|$|\n)/g;
        let match;

        while ((match = sampleRegex.exec(html)) !== null) {
            samples.push({
                originalTrack: match[1],
                originalArtist: match[2].replace(/<[^>]*>/g, "").trim(),
                sampleType: "sample",
            });
        }

        // Pattern: "Interpolation of X by Y"
        const interpolationRegex =
            /[Ii]nterpolat(?:es?|ion\s+of)\s+["\u201C\u201D](.+?)["\u201C\u201D]\s+by\s+(.+?)(?:<|$|\n)/g;

        while ((match = interpolationRegex.exec(html)) !== null) {
            samples.push({
                originalTrack: match[1],
                originalArtist: match[2].replace(/<[^>]*>/g, "").trim(),
                sampleType: "interpolation",
            });
        }

        return samples.length > 0 ? samples : null;
    } catch {
        return null;
    }
}

async function assessSamplesWithAI(
    config: AppConfig,
    trackName: string,
    artistName: string
): Promise<{ samples: SampleInfo[]; riskLevel: "none" | "low" | "medium" | "high" }> {
    try {
        return await chatCompletionJSON<{ samples: SampleInfo[]; riskLevel: "none" | "low" | "medium" | "high" }>(
            config,
            [
                {
                    role: "system",
                    content: `You are a music sample detection specialist. Based on the track name and artist, assess the likelihood that this track contains samples, interpolations, or is a cover/remix. Consider the artist's history and genre conventions. Respond with ONLY JSON: { "samples": [{ "originalTrack": "string", "originalArtist": "string", "sampleType": "sample|interpolation|cover|remix" }], "riskLevel": "none|low|medium|high" }. If you're uncertain, return empty samples with "low" risk.`,
                },
                {
                    role: "user",
                    content: `Track: "${trackName}" by ${artistName}. Are there known samples, interpolations, or covers?`,
                },
            ],
            { model: config.openrouter.model }
        );
    } catch {
        return { samples: [], riskLevel: "none" };
    }
}
