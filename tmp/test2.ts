import { getConfig } from "../src/config/index.js";
import { getSpotifyToken } from "../src/services/spotify.js";
import { fetchJSON } from "../src/utils/http.js";

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);

    const playlistId = "4bwSNOlsRr0HURnVCvX8SK";
    const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

    console.log("1. Just playlist URL NO PARAMS");
    const p1 = await fetchJSON(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("keys 1:", Object.keys(p1));
    if (p1.tracks) {
        console.log("p1.tracks.total:", p1.tracks.total);
        console.log("p1.tracks keys:", Object.keys(p1.tracks));
    } else {
        console.log("no tracks object returned at all!");
    }

    console.log("3. Tracks url");
    const p3 = await fetchJSON(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=50&offset=0`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("keys 3:", Object.keys(p3));
}

main().catch(console.error);
