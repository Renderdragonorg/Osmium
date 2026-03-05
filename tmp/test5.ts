import { getConfig } from "../src/config/index.js";
import { getSpotifyToken } from "../src/services/spotify.js";
import { fetchJSON } from "../src/utils/http.js";

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);

    const playlistId = "4bwSNOlsRr0HURnVCvX8SK";
    const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

    console.log("Fetching plain playlist...");
    const url = `${SPOTIFY_API_BASE}/playlists/${playlistId}`;

    const page = await fetchJSON(url, { headers: { Authorization: `Bearer ${token}` } });

    console.log("page.tracks.href:", page.tracks?.href);
    console.log("page.tracks.next:", page.tracks?.next);

    // Now let's try to fetch using the href
    if (page.tracks?.href) {
        console.log("Fetching tracks using the href...");
        const tracksPage = await fetchJSON(page.tracks.href, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Tracks fetched! Total:", tracksPage.total);
    }
}

main().catch(console.error);
