import { getSpotifyToken, searchTracks } from "../src/services/spotify.js";
import { getConfig } from "../src/config/index.js";

async function run() {
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);
    console.log("Token acquired.");
    try {
        const results = await searchTracks("blinding lights", token, 20);
        console.log("Results 20:", results.length);
    } catch (err) {
        console.error("Error with limit 20:", err);
    }
}

run();
