import { getConfig } from "../src/config/index.js";
import { getSpotifyToken } from "../src/services/spotify.js";
import { fetchJSON } from "../src/utils/http.js";

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);

    // Let's search for a playlist to get a valid ID
    const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

    console.log("Searching for playlists...");
    const searchParams = new URLSearchParams({ q: "top hits", type: "playlist", limit: "1" });
    const searchRes = await fetchJSON<any>(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const validId = searchRes.playlists.items[0]?.id;
    console.log("Found valid playlist ID:", validId);

    console.log("Fetching playlist...");
    const page = await fetchJSON<any>(`${SPOTIFY_API_BASE}/playlists/${validId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log("page keys:", Object.keys(page));
    if (page.tracks) console.log("Has tracks! Total:", page.tracks.total);
    else console.log("STILL NO TRACKS! Full page:", JSON.stringify(page, null, 2));

    console.log("Now trying the problematic ID: 4bwSNOlsRr0HURnVCvX8SK");
    const p2 = await fetchJSON<any>(`${SPOTIFY_API_BASE}/playlists/4bwSNOlsRr0HURnVCvX8SK`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("p2 keys:", Object.keys(p2));
    if (!p2.tracks) console.log("p2 FULL:", JSON.stringify(p2, null, 2));
}

main().catch(console.error);
