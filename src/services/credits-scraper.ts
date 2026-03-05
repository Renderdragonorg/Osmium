import * as cheerio from "cheerio";
import { fetchWithRetry } from "../utils/http.js";

/**
 * Scrape the Spotify track page to extract __NEXT_DATA__ credits.
 *
 * The open.spotify.com track page embeds a <script id="__NEXT_DATA__"> tag
 * containing server-rendered track data, which often includes credits
 * (writers, producers, publishers) not available through the public API.
 */
export async function scrapeCredits(
    trackId: string
): Promise<{ credits: unknown; rawHtml?: string }> {
    const url = `https://open.spotify.com/track/${trackId}`;

    const response = await fetchWithRetry(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch Spotify track page (${response.status}): ${url}`
        );
    }

    const html = await response.text();
    return parseCreditsFromHtml(html);
}

/**
 * Parse credits data from raw HTML containing __NEXT_DATA__.
 */
function parseCreditsFromHtml(html: string): {
    credits: unknown;
    rawHtml?: string;
} {
    const $ = cheerio.load(html);
    const nextDataScript = $("#__NEXT_DATA__").html();

    if (!nextDataScript) {
        // Fallback: try regex
        const match = html.match(
            /<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/
        );
        if (match?.[1]) {
            try {
                const data = JSON.parse(match[1]);
                return extractCreditsFromNextData(data);
            } catch {
                // JSON parse failed
            }
        }
        return { credits: null, rawHtml: html };
    }

    try {
        const data = JSON.parse(nextDataScript);
        return extractCreditsFromNextData(data);
    } catch {
        return { credits: null, rawHtml: html };
    }
}

/**
 * Navigate __NEXT_DATA__ structure to find the credits object.
 */
function extractCreditsFromNextData(data: Record<string, unknown>): {
    credits: unknown;
} {
    // The credits location varies, try common paths
    const paths = [
        ["props", "pageProps", "track", "credits"],
        ["props", "pageProps", "state", "data", "entity", "credits"],
        ["props", "pageProps", "data", "trackUnion", "credits"],
    ];

    for (const path of paths) {
        const value = getNestedValue(data, path);
        if (value) {
            return { credits: value };
        }
    }

    // If no specific credits path found, return the entire pageProps for AI parsing
    const pageProps = getNestedValue(data, ["props", "pageProps"]);
    return { credits: pageProps ?? data };
}

/**
 * Safely get a nested value from an object using a path of keys.
 */
function getNestedValue(
    obj: unknown,
    path: string[]
): unknown {
    let current: unknown = obj;
    for (const key of path) {
        if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }
    return current;
}
