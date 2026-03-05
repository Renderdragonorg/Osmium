import * as cheerio from "cheerio";
import { fetchWithRetry } from "../../utils/http.js";
import type { RegistryResult } from "../../types/index.js";

const ASCAP_ACE_URL = "https://www.ascap.com/repertory/ace";

/**
 * Search ASCAP ACE database for a work by title and optionally writer name.
 * 
 * ASCAP ACE provides a public search interface for performing rights registrations.
 * This scrapes the search results page for work details.
 */
export async function searchASCAP(
    title: string,
    writer?: string
): Promise<RegistryResult[]> {
    try {
        // ASCAP ACE search endpoint
        const params = new URLSearchParams({
            searchMode: "performed",
            title: title,
        });
        if (writer) {
            params.set("performer", writer);
        }

        const response = await fetchWithRetry(
            `${ASCAP_ACE_URL}?${params.toString()}`,
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
        return parseASCAPResults(html, title);
    } catch (error) {
        // ASCAP scraping may fail due to anti-bot protections — fail gracefully
        console.warn(
            `ASCAP search failed for "${title}": ${error instanceof Error ? error.message : String(error)}`
        );
        return [];
    }
}

/**
 * Parse ASCAP ACE search results HTML.
 */
function parseASCAPResults(html: string, searchTitle: string): RegistryResult[] {
    const $ = cheerio.load(html);
    const results: RegistryResult[] = [];

    // Look for result rows in the ACE search results table
    $(".search-results-table tr, .result-row, [data-work-id]").each((_, el) => {
        const $el = $(el);
        const workTitle = $el.find(".work-title, .title, td:first").text().trim();
        const workId = $el.attr("data-work-id") || $el.find(".work-id").text().trim();

        if (!workTitle) return;

        const writers: RegistryResult["writers"] = [];
        const publishers: string[] = [];

        // Extract writer names
        $el.find(".writer-name, .creator").each((_, writerEl) => {
            const name = $(writerEl).text().trim();
            if (name) writers.push({ name });
        });

        // Extract publisher names
        $el.find(".publisher-name, .publisher").each((_, pubEl) => {
            const name = $(pubEl).text().trim();
            if (name) publishers.push(name);
        });

        results.push({
            source: "ASCAP",
            workTitle: workTitle || searchTitle,
            workId: workId || undefined,
            writers,
            publishers,
        });
    });

    return results;
}
