import { getConfig } from "../src/config/index.js";
import { getSpotifyToken } from "../src/services/spotify.js";
import { fetchJSON } from "../src/utils/http.js";

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);

    const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

    console.log("Fetching user's playlists...");
    const searchRes = await fetchJSON<any>(`${SPOTIFY_API_BASE}/users/spotify/playlists?limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log("searchRes keys:", Object.keys(searchRes));
    const validId = searchRes.items[0]?.id;
    console.log("Found valid playlist ID:", validId);

    if (!validId) return;

    console.log("Fetching playlist...");
    const page = await fetchJSON<any>(`${SPOTIFY_API_BASE}/playlists/${validId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log("page keys:", Object.keys(page));
    if (page.tracks) console.log("Has tracks! Total:", page.tracks.total);
    else console.log("STILL NO TRACKS!");
}

main().catch(console.error);
