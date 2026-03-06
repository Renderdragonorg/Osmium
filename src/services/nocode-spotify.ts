import { fetchJSON } from "../utils/http.js";

const NOCODE_API_BASE = "https://v1.nocodeapi.com";

export interface NoCodePlaylistTrack {
    track: {
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        is_local?: boolean;
    } | null;
}

export interface NoCodePlaylistResponse {
    name: string;
    description?: string;
    owner?: { display_name?: string };
    tracks?: {
        total: number;
        items: NoCodePlaylistTrack[];
        next?: string | null;
    };
}

export interface PlaylistInfo {
    name: string;
    owner: string;
    description: string;
    totalTracks: number;
    tracks: Array<{ id: string; name: string; artists: string[] }>;
}

export async function getPlaylistTracksViaNoCodeAPI(
    playlistId: string,
    cloudName: string,
    token: string
): Promise<PlaylistInfo> {
    const url = `${NOCODE_API_BASE}/${cloudName}/spotify/${token}/playlists?id=${playlistId}`;

    const response = await fetchJSON<NoCodePlaylistResponse>(url);

    if (!response.tracks || !response.tracks.items) {
        throw new Error(
            "NoCodeAPI returned invalid playlist data. Check your cloudName and token."
        );
    }

    const tracks: PlaylistInfo["tracks"] = [];

    for (const item of response.tracks.items) {
        if (item.track && !item.track.is_local && item.track.id) {
            tracks.push({
                id: item.track.id,
                name: item.track.name,
                artists: item.track.artists?.map((a) => a.name) || [],
            });
        }
    }

    return {
        name: response.name || "Unknown Playlist",
        owner: response.owner?.display_name || "Unknown",
        description: response.description || "",
        totalTracks: response.tracks.total,
        tracks,
    };
}
