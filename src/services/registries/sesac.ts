import { fetchWithRetry } from "../../utils/http.js";
import type { RegistryResult } from "../../types/index.js";

const SESAC_URL = "https://www.sesac.com/repertory/search";

/**
 * Search SESAC repertory for a work by title and optionally writer.
 * 
 * SESAC is the third major US PRO. Their public search is more limited
 * than ASCAP/BMI, but still provides registration verification.
 */
export async function searchSESAC(
    title: string,
    writer?: string
): Promise<RegistryResult[]> {
    try {
        const params = new URLSearchParams({ title });
        if (writer) params.set("writer", writer);

        const response = await fetchWithRetry(
            `${SESAC_URL}?${params.toString()}`,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            }
        );

        if (!response.ok) {
            return [];
        }

        const html = await response.text();
        return parseSESACResults(html, title);
    } catch (error) {
        console.warn(
            `SESAC search failed for "${title}": ${error instanceof Error ? error.message : String(error)}`
        );
        return [];
    }
}

/**
 * Parse SESAC search results.
 */
function parseSESACResults(html: string, searchTitle: string): RegistryResult[] {
    const results: RegistryResult[] = [];

    // SESAC's search results are less structured — attempt basic extraction
    // Look for JSON data embedded in the page
    const jsonMatch = html.match(/var\s+searchResults\s*=\s*(\[[\s\S]*?\]);/);
    if (jsonMatch?.[1]) {
        try {
            const data = JSON.parse(jsonMatch[1]) as Array<{
                title?: string;
                writers?: string[];
                publishers?: string[];
                workId?: string;
            }>;

            for (const item of data) {
                results.push({
                    source: "SESAC",
                    workTitle: item.title || searchTitle,
                    workId: item.workId,
                    writers: (item.writers ?? []).map((name) => ({ name })),
                    publishers: item.publishers ?? [],
                });
            }
        } catch {
            // JSON parse failed — not unexpected for web scraping
        }
    }

    // If no JSON found, try basic HTML text extraction
    if (results.length === 0) {
        // Check if the page contains any indication of results
        const hasResults = html.includes(searchTitle.toUpperCase()) ||
            html.includes(searchTitle.toLowerCase());

        if (hasResults) {
            results.push({
                source: "SESAC",
                workTitle: searchTitle,
                writers: [],
                publishers: [],
                status: "found_unstructured",
            });
        }
    }

    return results;
}
