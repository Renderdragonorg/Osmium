import { fetchJSON } from "../utils/http.js";
import type {
    SpotifyToken,
    SpotifyTrack,
    SpotifyAlbum,
} from "../types/index.js";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

let cachedToken: SpotifyToken | null = null;

/**
 * Get a Spotify access token using the Client Credentials flow.
 * Caches the token until it expires.
 */
export async function getSpotifyToken(
    clientId: string,
    clientSecret: string
): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.access_token;
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64"
    );

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
            `Spotify authentication failed (${response.status}): ${body}`
        );
    }

    const data = (await response.json()) as Omit<SpotifyToken, "expiresAt">;
    cachedToken = {
        ...data,
        expiresAt: Date.now() + data.expires_in * 1000 - 60_000, // refresh 1 min early
    };

    return cachedToken.access_token;
}

/**
 * Fetch full track metadata from Spotify.
 */
export async function getTrack(
    trackId: string,
    token: string
): Promise<SpotifyTrack> {
    return fetchJSON<SpotifyTrack>(`${SPOTIFY_API_BASE}/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Fetch album metadata from Spotify (includes label + copyright fields).
 */
export async function getAlbum(
    albumId: string,
    token: string
): Promise<SpotifyAlbum> {
    return fetchJSON<SpotifyAlbum>(`${SPOTIFY_API_BASE}/albums/${albumId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Fetch both track and album data in one call, returning enriched info.
 */
export async function getTrackWithAlbum(
    trackId: string,
    token: string
): Promise<{ track: SpotifyTrack; album: SpotifyAlbum }> {
    const track = await getTrack(trackId, token);
    const album = await getAlbum(track.album.id, token);
    return { track, album };
}

/**
 * Spotify playlist track item from the API response.
 */
interface PlaylistTrackItem {
    track: SpotifyTrack | null;
    is_local: boolean;
}

export interface PlaylistInfo {
    name: string;
    owner: string;
    description: string;
    totalTracks: number;
    tracks: Array<{ id: string; name: string; artists: string[] }>;
}

/**
 * Fetch all tracks from a Spotify playlist, handling pagination.
 * Skips local files and null tracks.
 */
export async function getPlaylistTracks(
    playlistId: string,
    token: string
): Promise<PlaylistInfo> {
    const headers = { Authorization: `Bearer ${token}` };

    const tracks: PlaylistInfo["tracks"] = [];
    let offset = 0;
    const limit = 50;
    let total = 0;
    let name = "";
    let owner = "";
    let description = "";

    do {
        const page = await fetchJSON<{
            name: string;
            description: string;
            owner: { display_name: string };
            tracks?: {
                total: number;
                items: PlaylistTrackItem[];
                next: string | null;
                limit: number;
                offset: number;
            };
        }>(
            `${SPOTIFY_API_BASE}/playlists/${playlistId}?limit=${limit}&offset=${offset}`,
            { headers }
        );

        if (!page.tracks) {
            throw new Error(
                `Spotify API returned missing tracks data. Since Nov 2024, Spotify API changes restrict third-party Client Credentials access to public playlist tracks. They now require User Authentication and ownership/collaborator permissions.`
            );
        }

        if (offset === 0) {
            name = page.name;
            owner = page.owner.display_name;
            description = page.description;
            total = page.tracks.total;
        }

        for (const item of page.tracks.items) {
            if (!item.is_local && item.track?.id) {
                tracks.push({
                    id: item.track.id,
                    name: item.track.name,
                    artists: item.track.artists.map((a) => a.name),
                });
            }
        }

        offset += limit;
    } while (tracks.length < total && offset < total);

    return {
        name,
        owner,
        description,
        totalTracks: total,
        tracks,
    };
}

export interface SpotifySearchResult {
    id: string;
    name: string;
    artists: string[];
    album: string;
    duration_ms: number;
}

/**
 * Search for tracks on Spotify.
 */
export async function searchTracks(
    query: string,
    token: string,
    limit: number = 20
): Promise<SpotifySearchResult[]> {
    const response = await fetchJSON<{
        tracks: {
            items: SpotifyTrack[];
        };
    }>(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return response.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((a) => a.name),
        album: track.album.name,
        duration_ms: track.duration_ms,
    }));
}
