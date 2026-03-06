import { chatCompletionJSON } from "../utils/ai-client.js";
import type { AppConfig, CopyrightVerdict } from "../types/index.js";

export async function assessRisk(
    config: AppConfig,
    partialVerdict: Partial<CopyrightVerdict>,
    trackInfo: {
        name: string;
        artists: string[];
        isrc: string;
        spotifyId: string;
        releaseDate: string;
        duration: number;
    }
): Promise<CopyrightVerdict> {

    const systemPrompt = `You are a music copyright risk assessor. Given partial copyright analysis data, you must:
1. Verify the risk level is appropriate for the identified copyright type
2. Calculate a final confidence score based on data completeness
3. Write a clear, actionable licensing path
4. Finalize the copyright type classification

Scoring guidelines:
- 90-100: All sources agree, PRO registration confirmed, label confirmed
- 70-89: Most sources agree, minor gaps or missing PRO data
- 50-69: Significant gaps, conflicting data, or unresolved discrepancies 
- 30-49: Major data missing, unregistered work, or multiple conflicts
- 0-29: Very little data, high uncertainty

Respond with ONLY JSON containing adjustments:
{
  "copyrightType": "original|cover|sample|interpolation|remix|public_domain|unknown",
  "riskLevel": "low|medium|high|critical",
  "confidence": 0-100,
  "licensingPath": "detailed string explaining how to license this track for use"
}`;

    try {
        const assessment = await chatCompletionJSON<{
            copyrightType: CopyrightVerdict["copyrightType"];
            riskLevel: CopyrightVerdict["riskLevel"];
            confidence: number;
            licensingPath: string;
        }>(
            config,
            [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `Assess the risk and finalize the verdict for:\n\nTrack: "${trackInfo.name}" by ${trackInfo.artists.join(", ")}\nISRC: ${trackInfo.isrc}\n\nPartial Verdict:\n${JSON.stringify(partialVerdict, null, 2)}`,
                },
            ],
            { model: config.openrouter.model }
        );

        // Merge assessment into final verdict
        return {
            track: trackInfo,
            masterRights: partialVerdict.masterRights ?? {
                holder: "Unknown",
                label: "Unknown",
                confirmed: false,
                sources: [],
            },
            compositionRights: partialVerdict.compositionRights ?? {
                writers: [],
                publishers: [],
                proRegistrations: [],
            },
            samples: partialVerdict.samples ?? {
                detected: false,
                details: [],
                riskLevel: "none",
            },
            copyrightType: assessment.copyrightType,
            riskLevel: assessment.riskLevel,
            confidence: assessment.confidence,
            licensingPath: assessment.licensingPath,
            discrepancies: partialVerdict.discrepancies ?? [],
            dataSources: partialVerdict.dataSources ?? [],
            generatedAt: new Date().toISOString(),
        };
    } catch (error) {
        // If AI assessment fails, build verdict from available data
        return {
            track: trackInfo,
            masterRights: partialVerdict.masterRights ?? {
                holder: "Unknown",
                label: "Unknown",
                confirmed: false,
                sources: [],
            },
            compositionRights: partialVerdict.compositionRights ?? {
                writers: [],
                publishers: [],
                proRegistrations: [],
            },
            samples: partialVerdict.samples ?? {
                detected: false,
                details: [],
                riskLevel: "none",
            },
            copyrightType: partialVerdict.copyrightType ?? "unknown",
            riskLevel: partialVerdict.riskLevel ?? "high",
            confidence: partialVerdict.confidence ?? 25,
            licensingPath:
                partialVerdict.licensingPath ??
                "Insufficient data for licensing recommendation. Manual review required.",
            discrepancies: partialVerdict.discrepancies ?? [
                `Risk assessment failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
            dataSources: partialVerdict.dataSources ?? [],
            generatedAt: new Date().toISOString(),
        };
    }
}
