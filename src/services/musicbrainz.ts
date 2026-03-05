import { rateLimitedFetch } from "../utils/http.js";
import type { MusicBrainzResult, MusicBrainzRecording } from "../types/index.js";

const MB_API_BASE = "https://musicbrainz.org/ws/2";
const MB_USER_AGENT = "OsmiumCLI/1.0 (music-copyright-checker)";

/**
 * Look up recordings by ISRC from MusicBrainz.
 * Returns canonical recording info including labels and artist credits.
 *
 * MusicBrainz requires a descriptive User-Agent and limits to 1 req/sec.
 */
export async function lookupByISRC(isrc: string): Promise<MusicBrainzResult> {
    const url = `${MB_API_BASE}/isrc/${isrc}?inc=releases+labels+artist-credits&fmt=json`;

    const response = await rateLimitedFetch(
        url,
        {
            headers: {
                "User-Agent": MB_USER_AGENT,
                Accept: "application/json",
            },
        },
        1100 // 1.1 sec between requests
    );

    if (!response.ok) {
        if (response.status === 404) {
            return { recordings: [], isrc, label: undefined, mbid: undefined };
        }
        throw new Error(
            `MusicBrainz ISRC lookup failed (${response.status}): ${isrc}`
        );
    }

    const data = (await response.json()) as { recordings?: MusicBrainzRecording[] };

    const recordings = data.recordings ?? [];
    const primaryRecording = recordings[0];

    // Extract label from the first release's label-info
    let label: string | undefined;
    let mbid: string | undefined;

    if (primaryRecording) {
        mbid = primaryRecording.id;
        const release = primaryRecording.releases?.[0];
        if (release?.labelInfo) {
            label = release.labelInfo[0]?.label?.name;
        }
    }

    return { recordings, isrc, label, mbid };
}

/**
 * Look up a recording by MBID with additional relationships.
 */
export async function getRecording(
    mbid: string
): Promise<MusicBrainzRecording | null> {
    const url = `${MB_API_BASE}/recording/${mbid}?inc=releases+labels+artist-credits+work-rels&fmt=json`;

    const response = await rateLimitedFetch(
        url,
        {
            headers: {
                "User-Agent": MB_USER_AGENT,
                Accept: "application/json",
            },
        },
        1100
    );

    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(
            `MusicBrainz recording lookup failed (${response.status}): ${mbid}`
        );
    }

    return response.json() as Promise<MusicBrainzRecording>;
}
