import { getSpotifyToken } from "../src/services/spotify.js";
import { fetchJSON } from "../src/utils/http.js";
import { getConfig } from "../src/config/index.js";

async function run() {
    console.log("Starting...");
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);
    console.log("Token:", token.substring(0, 5) + "...");

    const url = `https://api.spotify.com/v1/search?q=blinding%20lights&type=track&limit=20`;
    console.log("Fetching:", url);
    try {
        const response = await fetchJSON(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success:", !!response);
    } catch (err) {
        console.error(err);
    }
}

run();
