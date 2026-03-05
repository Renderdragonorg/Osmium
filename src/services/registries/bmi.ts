import * as cheerio from "cheerio";
import { fetchWithRetry } from "../../utils/http.js";
import type { RegistryResult } from "../../types/index.js";

const BMI_REPERTOIRE_URL = "https://repertoire.bmi.com/Search/Search";

/**
 * Search BMI Repertoire database for a work by title and optionally writer.
 * 
 * BMI provides a public repertoire search. This scrapes the search results
 * for work details including writers, publishers, and work IDs.
 */
export async function searchBMI(
    title: string,
    writer?: string
): Promise<RegistryResult[]> {
    try {
        const params = new URLSearchParams({
            Main_Search_Text: title,
            Search_Type: "songtitle",
            View_Count: "10",
            Page_Number: "1",
        });

        if (writer) {
            params.set("Main_Search_Text", `${title}`);
            params.set("Sub_Search_Text", writer);
        }

        const response = await fetchWithRetry(
            `${BMI_REPERTOIRE_URL}?${params.toString()}`,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    Referer: "https://repertoire.bmi.com/",
                },
            }
        );

        if (!response.ok) {
            return [];
        }

        const html = await response.text();
        return parseBMIResults(html, title);
    } catch (error) {
        console.warn(
            `BMI search failed for "${title}": ${error instanceof Error ? error.message : String(error)}`
        );
        return [];
    }
}

/**
 * Parse BMI Repertoire search results HTML.
 */
function parseBMIResults(html: string, searchTitle: string): RegistryResult[] {
    const $ = cheerio.load(html);
    const results: RegistryResult[] = [];

    // BMI search results structure
    $(".songResult, .search-result-item, .result-card").each((_, el) => {
        const $el = $(el);
        const workTitle =
            $el.find(".songTitle, .title, h3").first().text().trim() || searchTitle;
        const workId = $el.find(".workId, .bmi-work-id").text().trim();

        const writers: RegistryResult["writers"] = [];
        const publishers: string[] = [];

        // Extract writers
        $el.find(".writerName, .writer, .creator-name").each((_, writerEl) => {
            const name = $(writerEl).text().trim();
            if (name) {
                const roleEl = $(writerEl).next(".role, .writer-role");
                writers.push({
                    name,
                    role: roleEl.text().trim() || undefined,
                });
            }
        });

        // Extract publishers
        $el.find(".publisherName, .publisher, .publisher-name").each((_, pubEl) => {
            const name = $(pubEl).text().trim();
            if (name) publishers.push(name);
        });

        if (workTitle) {
            results.push({
                source: "BMI",
                workTitle,
                workId: workId || undefined,
                writers,
                publishers,
            });
        }
    });

    return results;
}
