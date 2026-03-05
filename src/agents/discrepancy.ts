import OpenAI from "openai";
import type { AppConfig, RegistryResult, ParsedCredits } from "../types/index.js";

/**
 * Discrepancy Resolver Agent — detects and attempts to resolve conflicts
 * between data from different sources.
 *
 * Compares Spotify credits, PRO registrations, MusicBrainz data, and
 * fingerprint results for inconsistencies.
 */
export async function resolveDiscrepancies(
    config: AppConfig,
    data: {
        trackName: string;
        spotifyLabel: string;
        spotifyCopyrights: Array<{ type: string; text: string }>;
        credits: ParsedCredits | null;
        registryResults: RegistryResult[];
        musicBrainzLabel?: string;
    }
): Promise<{
    discrepancies: string[];
    resolution: string;
    confidence: number;
}> {
    const discrepancies: string[] = [];

    // Programmatic conflict detection first
    if (data.musicBrainzLabel && data.spotifyLabel) {
        const mbLabel = data.musicBrainzLabel.toLowerCase();
        const spLabel = data.spotifyLabel.toLowerCase();
        if (mbLabel !== spLabel && !mbLabel.includes(spLabel) && !spLabel.includes(mbLabel)) {
            discrepancies.push(
                `Label mismatch: Spotify says "${data.spotifyLabel}", MusicBrainz says "${data.musicBrainzLabel}"`
            );
        }
    }

    // Check for writer mismatches across registries
    const ascapWriters = data.registryResults
        .filter((r) => r.source === "ASCAP")
        .flatMap((r) => r.writers.map((w) => w.name.toLowerCase()));

    const bmiWriters = data.registryResults
        .filter((r) => r.source === "BMI")
        .flatMap((r) => r.writers.map((w) => w.name.toLowerCase()));

    if (ascapWriters.length > 0 && bmiWriters.length > 0) {
        // Writers registered in both ASCAP and BMI is unusual
        const overlap = ascapWriters.filter((w) => bmiWriters.includes(w));
        if (overlap.length > 0) {
            discrepancies.push(
                `Writer(s) found in both ASCAP and BMI: ${overlap.join(", ")} — typically a writer is registered with only one PRO`
            );
        }
    }

    // Check publisher consistency
    const registryPublishers = data.registryResults
        .flatMap((r) => r.publishers.map((p) => p.toLowerCase()));
    const creditPublishers = (data.credits?.publishers ?? []).map((p) =>
        p.toLowerCase()
    );

    if (registryPublishers.length > 0 && creditPublishers.length > 0) {
        const missingInRegistry = creditPublishers.filter(
            (p) => !registryPublishers.some((rp) => rp.includes(p) || p.includes(rp))
        );
        if (missingInRegistry.length > 0) {
            discrepancies.push(
                `Publisher(s) from Spotify credits not found in PRO registries: ${missingInRegistry.join(", ")}`
            );
        }
    }

    // If no discrepancies found programmatically, skip AI analysis
    if (discrepancies.length === 0) {
        return {
            discrepancies: [],
            resolution: "No discrepancies detected across data sources.",
            confidence: 95,
        };
    }

    // Use AI to attempt resolution for detected conflicts
    try {
        const client = new OpenAI({
            baseURL: config.openrouter.baseURL,
            apiKey: config.openrouter.apiKey,
            defaultHeaders: config.openrouter.defaultHeaders,
        });

        const result = await client.chat.completions.create({
            model: config.openrouter.model,
            messages: [
                {
                    role: "system",
                    content: `You are a music copyright discrepancy resolver. Given conflicts between different data sources, explain likely reasons and suggest which source to trust. Be concise. Respond with JSON: { "resolution": "string", "confidence": 0-100 }`,
                },
                {
                    role: "user",
                    content: `Track: "${data.trackName}"\n\nDiscrepancies found:\n${discrepancies.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\nFull context:\n${JSON.stringify(data, null, 2)}`,
                },
            ],
        });

        const content = result.choices?.[0]?.message?.content ?? "";
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [
            null,
            content,
        ];

        const parsed = JSON.parse(jsonMatch[1]!.trim()) as {
            resolution: string;
            confidence: number;
        };

        return {
            discrepancies,
            ...parsed,
        };
    } catch {
        return {
            discrepancies,
            resolution: "AI resolution unavailable — discrepancies require manual review.",
            confidence: 50,
        };
    }
}
