import { rateLimitedFetch } from "../utils/http.js";
import type { MusicBrainzResult, MusicBrainzRecording } from "../types/index.js";

const MB_API_BASE = "https://musicbrainz.org/ws/2";
const MB_USER_AGENT = "OsmiumCLI/1.0 (https://github.com/anomalyco/opencode)";

interface MBSearchResponse {
    created: string;
    count: number;
    offset: number;
    recordings: MusicBrainzRecording[];
}

export async function lookupByISRC(isrc: string): Promise<MusicBrainzResult> {
    const url = `${MB_API_BASE}/recording?query=isrc:${encodeURIComponent(isrc)}&inc=releases+labels+artists&fmt=json&limit=5`;

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
        if (response.status === 404) {
            return { recordings: [], isrc, label: undefined, mbid: undefined };
        }
        const body = await response.text().catch(() => "");
        throw new Error(
            `MusicBrainz ISRC lookup failed (${response.status}): ${isrc}. Response: ${body.slice(0, 200)}`
        );
    }

    const data = (await response.json()) as MBSearchResponse;

    const recordings = data.recordings ?? [];
    const primaryRecording = recordings[0];

    let label: string | undefined;
    let mbid: string | undefined;

    if (primaryRecording) {
        mbid = primaryRecording.id;
        const release = primaryRecording.releases?.[0] as unknown as Record<string, unknown>;
        const labelInfo = (release?.labelInfo ?? release?.["label-info"]) as Array<{ label?: { name: string } }> | undefined;
        if (labelInfo?.[0]?.label?.name) {
            label = labelInfo[0].label.name;
        }
    }

    return { recordings, isrc, label, mbid };
}

export async function getRecording(
    mbid: string
): Promise<MusicBrainzRecording | null> {
    const url = `${MB_API_BASE}/recording/${mbid}?inc=releases+artists+isrcs+work-rels&fmt=json`;

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
        const body = await response.text().catch(() => "");
        throw new Error(
            `MusicBrainz recording lookup failed (${response.status}): ${mbid}. Response: ${body.slice(0, 200)}`
        );
    }

    return response.json() as Promise<MusicBrainzRecording>;
}
