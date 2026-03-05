import { getConfig } from "../src/config/index.js";
import { getSpotifyToken, getTrackWithAlbum } from "../src/services/spotify.js";

async function main() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const config = getConfig();
    const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);

    const trackId = "1r7Z9iJ0Mmckpi0dsaHKK8";

    try {
        const { track, album } = await getTrackWithAlbum(trackId, token);
        console.log("track keys:", Object.keys(track));
        console.log("track.external_ids:", track.external_ids);
    } catch (error) {
        console.error("Error fetching track:", error);
    }
}

main().catch(console.error);
