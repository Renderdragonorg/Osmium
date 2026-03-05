import OpenAI from "openai";
import type { AppConfig, CopyrightVerdict, AISummary, WebSearchSource } from "../types/index.js";

/**
 * AI Summary Agent — takes the full copyright verdict and recent web search results
 * about the label/studio, and produces a final, clear, human-readable summary about
 * whether a license is required and how to obtain it.
 */
export async function generateAISummary(
    config: AppConfig,
    verdict: CopyrightVerdict,
    webSearchResults: WebSearchSource[]
): Promise<AISummary> {
    const client = new OpenAI({
        baseURL: config.openrouter.baseURL,
        apiKey: config.openrouter.apiKey,
        defaultHeaders: config.openrouter.defaultHeaders,
    });

    const systemPrompt = `You are an expert music licensing and copyright AI assistant. 
Your job is to read the structured copyright data for a track, along with context from recent web searches about the label or rights holder, and provide a definitive answer on whether a license is required to use the song.

You must respond with ONLY valid JSON matching this exact schema:
{
  "isCopyrighted": "yes" | "no" | "unclear",
  "requiresLicense": "yes" | "no" | "depends",
  "masterRightsHolder": "string (the name of the label or studio)",
  "labelType": "major" | "indie" | "self-released" | "unknown",
  "labelInfo": "string (brief sentence about the label or their general licensing ethos based on search results)",
  "licensingVerdict": "string (a clear 1-2 sentence final verdict on if they can use it)",
  "explanation": "string (a detailed paragraph explaining the rights situation, referencing the master and composition rights)",
  "actionableSteps": ["string", "string"] (2-3 concrete next steps to legally use the track)
}

Important Guidelines:
- If the track is public domain, 'requiresLicense' is likely 'no'.
- If the track is owned by a major label (UMG, Sony, Warner etc.), 'requiresLicense' is 'yes'.
- If the search results indicate the label offers "sync licenses" or "creator safe" music, note that.
- Keep the explanation professional and legally sound, but easy to understand for a content creator.`;

    const userMessage = `Analyze the copyright data and web search results to produce a final AI summary.

**TRACK VERDICT DATA:**
Confidence: ${verdict.confidence}%
Risk Level: ${verdict.riskLevel}
Copyright Type: ${verdict.copyrightType}

Master Rights Holder: ${verdict.masterRights.holder} (Confirmed: ${verdict.masterRights.confirmed ? "Yes" : "No"})
Label: ${verdict.masterRights.label || "N/A"}

Composition Writers: ${verdict.compositionRights.writers.map(w => w.name).join(", ") || "Unknown"}
Publishers: ${verdict.compositionRights.publishers.join(", ") || "Unknown"}
PRO Registrations: ${verdict.compositionRights.proRegistrations.map(p => p.pro).join(", ") || "None found"}

Samples Detected: ${verdict.samples.detected ? "Yes" : "No"}

**WEB SEARCH RESULTS (Queries about label/studio policies):**
${webSearchResults.length > 0
            ? webSearchResults.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}\n`).join("\n")
            : "No web search results available."}

Generate the JSON summary now.`;

    try {
        const response = await client.chat.completions.create({
            model: config.openrouter.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No response from summary agent");
        }

        // Try to parse the response as JSON (handle markdown code blocks and random text)
        let parsed: Omit<AISummary, "webSearchSources">;
        try {
            // 1. Try extracting from markdown JSON blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                // 2. Try looking for the first { and last }
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    parsed = JSON.parse(content.substring(firstBrace, lastBrace + 1));
                } else {
                    // 3. Fallback to parsing the whole thing
                    parsed = JSON.parse(content.trim());
                }
            }
        } catch (parseError) {
            console.error("\n--- RAW AI SUMMARY RESPONSE ---");
            console.error(content);
            console.error("-------------------------------\n");
            throw new Error(`Failed to parse AI summary JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }

        return {
            ...parsed,
            webSearchSources: webSearchResults,
        };
    } catch (error) {
        throw new Error(
            `Summary agent failed: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
