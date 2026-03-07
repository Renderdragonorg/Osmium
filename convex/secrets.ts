import { query } from "./_generated/server.js";

export const getApiKeys = query({
    args: {},
    handler: async () => {
        return {
            spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
            spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            openrouterApiKey: process.env.OPENROUTER_API_KEY,
            openrouterModel: process.env.OPENROUTER_MODEL || "z-ai/glm-4.5-air:free",
            nocodeSpotifyCloudName: process.env.NOCODE_SPOTIFY_CLOUD_NAME,
            nocodeSpotifyToken: process.env.NOCODE_SPOTIFY_TOKEN,
            tavilyApiKey: process.env.TAVILY_API_KEY,
            acoustidApiKey: process.env.ACOUSTID_API_KEY,
            groqApiKey: process.env.GROQ_API_KEY,
            groqModel: process.env.GROQ_MODEL || "qwen/qwen3-32b",
            discogsToken: process.env.DISCOGS_TOKEN,
        };
    },
});
