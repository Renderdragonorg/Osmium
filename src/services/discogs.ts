import { fetchJSON, rateLimitedFetch } from "../utils/http.js";
import type { DiscogsRelease, DiscogsResult } from "../types/index.js";

const DISCOGS_API_BASE = "https://api.discogs.com";
const DISCOGS_USER_AGENT = "OsmiumCLI/1.0";

interface DiscogsSearchResponse {
    results: Array<{
        id: number;
        title: string;
        year?: string;
        label?: string[];
        catno?: string;
        type: string;
    }>;
    pagination: { pages: number; items: number };
}

/**
 * Search Discogs for releases matching the query (title + artist).
 * Rate limited to 60 req/min as per Discogs API guidelines.
 */
export async function searchRelease(
    query: string,
    token?: string
): Promise<DiscogsResult> {
    const params = new URLSearchParams({
        q: query,
        type: "release",
        per_page: "5",
    });

    if (token) params.set("token", token);

    const response = await rateLimitedFetch(
        `${DISCOGS_API_BASE}/database/search?${params.toString()}`,
        {
            headers: {
                "User-Agent": DISCOGS_USER_AGENT,
                Accept: "application/json",
            },
        },
        1000 // 1 sec between requests (safe under 60/min)
    );

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Discogs authentication failed. Check your DISCOGS_TOKEN.");
        }
        throw new Error(`Discogs search failed (${response.status})`);
    }

    const data = (await response.json()) as DiscogsSearchResponse;

    const releases: DiscogsRelease[] = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        year: r.year ? parseInt(r.year, 10) : undefined,
        labels: r.label
            ? r.label.map((l, i) => ({
                id: 0,
                name: l,
                catno: i === 0 ? r.catno ?? "" : "",
            }))
            : undefined,
    }));

    const firstResult = data.results[0];

    return {
        releases,
        label: firstResult?.label?.[0],
        catalogNumber: firstResult?.catno,
    };
}

/**
 * Get full release details from Discogs.
 */
export async function getRelease(
    releaseId: number,
    token?: string
): Promise<DiscogsRelease> {
    const params = token ? `?token=${token}` : "";
    return fetchJSON<DiscogsRelease>(
        `${DISCOGS_API_BASE}/releases/${releaseId}${params}`,
        {
            headers: {
                "User-Agent": DISCOGS_USER_AGENT,
                Accept: "application/json",
            },
        }
    );
}

/**
 * Get label information from Discogs.
 */
export async function getLabel(
    labelId: number,
    token?: string
): Promise<{ id: number; name: string; profile?: string }> {
    const params = token ? `?token=${token}` : "";
    return fetchJSON(
        `${DISCOGS_API_BASE}/labels/${labelId}${params}`,
        {
            headers: {
                "User-Agent": DISCOGS_USER_AGENT,
                Accept: "application/json",
            },
        }
    );
}
