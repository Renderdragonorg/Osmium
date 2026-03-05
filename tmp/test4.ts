import { getConfig } from "../src/config/index.js";
import { getSpotifyToken } from "../src/services/spotify.js";
import { fetchJSON } from "../src/utils/http.js";

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);

    const playlistId = "4bwSNOlsRr0HURnVCvX8SK";
    const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

    console.log("Fetching playlist with fields parameter...");
    const url = `${SPOTIFY_API_BASE}/playlists/${playlistId}?fields=name,description,owner(display_name),tracks(total,limit,offset,next,items(is_local,track(id,name,artists(name))))&limit=50&offset=0`;

    const page = await fetchJSON(url, { headers: { Authorization: `Bearer ${token}` } });

    console.log("page keys:", Object.keys(page));
    if (page.tracks) {
        console.log("page.tracks.total:", page.tracks.total);
        console.log("page.tracks.items count:", page.tracks.items.length);
    } else {
        console.log("STILL NO TRACKS OBJECT!");
    }
}

main().catch(console.error);
