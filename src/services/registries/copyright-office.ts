import { fetchWithRetry } from "../../utils/http.js";
import type { RegistryResult } from "../../types/index.js";

const COPYRIGHT_OFFICE_URL =
    "https://publicrecords.copyright.gov/search";

/**
 * Search the US Copyright Office public records for a sound recording
 * or composition registration.
 * 
 * copyright.gov provides a public records portal that can be searched
 * for registration details, claimants, and dates.
 */
export async function searchCopyrightOffice(
    title: string,
    artist?: string
): Promise<RegistryResult[]> {
    try {
        const query = artist ? `${title} ${artist}` : title;
        const params = new URLSearchParams({
            searchText: query,
            type: "all",
        });

        const response = await fetchWithRetry(
            `${COPYRIGHT_OFFICE_URL}?${params.toString()}`,
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
        return parseCopyrightResults(html, title);
    } catch (error) {
        console.warn(
            `Copyright Office search failed for "${title}": ${error instanceof Error ? error.message : String(error)}`
        );
        return [];
    }
}

/**
 * Parse US Copyright Office search results.
 */
function parseCopyrightResults(
    html: string,
    searchTitle: string
): RegistryResult[] {
    const results: RegistryResult[] = [];

    // Try to extract structured data from the results page
    // The Copyright Office outputs results in a tabular format

    // Look for embedded JSON data
    const jsonMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/
    );

    if (jsonMatch?.[1]) {
        try {
            const state = JSON.parse(jsonMatch[1]) as {
                searchResults?: Array<{
                    title?: string;
                    registrationNumber?: string;
                    claimants?: string[];
                    authors?: string[];
                    registrationDate?: string;
                    type?: string;
                }>;
            };

            for (const item of state.searchResults ?? []) {
                results.push({
                    source: "COPYRIGHT_OFFICE",
                    workTitle: item.title || searchTitle,
                    workId: item.registrationNumber,
                    writers: (item.authors ?? []).map((name) => ({ name })),
                    publishers: item.claimants ?? [],
                    registrationDate: item.registrationDate,
                    status: item.type,
                });
            }
        } catch {
            // JSON parse failed
        }
    }

    // Fallback: check for any mention of the search title
    if (results.length === 0) {
        const titleLower = searchTitle.toLowerCase();
        if (
            html.toLowerCase().includes(titleLower) &&
            (html.includes("Registration Number") || html.includes("registration-number"))
        ) {
            results.push({
                source: "COPYRIGHT_OFFICE",
                workTitle: searchTitle,
                writers: [],
                publishers: [],
                status: "found_unstructured",
            });
        }
    }

    return results;
}
