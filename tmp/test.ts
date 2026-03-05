import { getConfig } from "../src/config/index.js";
import { getSpotifyToken } from "../src/services/spotify.js";
import { fetchJSON } from "../src/utils/http.js";

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);

    // We try the same call as in the code
    const limit = 50;
    const offset = 0;
    const playlistId = "4bwSNOlsRr0HURnVCvX8SK";
    const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

    const page = await fetchJSON(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("page keys:", Object.keys(page));
    console.log("page.tracks keys:", page.tracks ? Object.keys(page.tracks) : "undefined");
    if (!page.tracks) {
        console.log("page content completely:", JSON.stringify(page, null, 2));
    }
}

main().catch(console.error);
