import { ConvexHttpClient } from "convex/browser";
import type { AppConfig } from "../types/index.js";

declare global {
    var _convexClient: ConvexHttpClient | undefined;
}

let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient | null {
    if (convexClient) return convexClient;
    
    const convexUrl = process.env.CONVEX_URL;
    if (!convexUrl) return null;
    
    convexClient = new ConvexHttpClient(convexUrl);
    return convexClient;
}

export async function fetchSecretsFromConvex(): Promise<Partial<AppConfig> | null> {
    const client = getConvexClient();
    if (!client) return null;
    
    try {
        const { api } = await import("../../convex/_generated/api.js");
        const secrets = await client.query(api.secrets.getApiKeys);
        
        if (!secrets) return null;
        
        return {
            spotify: secrets.spotifyClientId && secrets.spotifyClientSecret ? {
                clientId: secrets.spotifyClientId,
                clientSecret: secrets.spotifyClientSecret,
            } : undefined,
            nocodeSpotify: secrets.nocodeSpotifyCloudName && secrets.nocodeSpotifyToken ? {
                cloudName: secrets.nocodeSpotifyCloudName,
                token: secrets.nocodeSpotifyToken,
            } : undefined,
            openrouter: secrets.openrouterApiKey ? {
                apiKey: secrets.openrouterApiKey,
                model: secrets.openrouterModel || "openai/gpt-4o",
                baseURL: "https://openrouter.ai/api/v1",
                defaultHeaders: {
                    "HTTP-Referer": "https://github.com/osmium-cli/osmium",
                    "X-OpenRouter-Title": "Osmium CLI",
                },
            } : undefined,
            acoustid: secrets.acoustidApiKey ? {
                apiKey: secrets.acoustidApiKey,
            } : undefined,
            discogs: secrets.discogsToken ? {
                token: secrets.discogsToken,
            } : undefined,
            tavily: secrets.tavilyApiKey ? {
                apiKey: secrets.tavilyApiKey,
            } : undefined,
            groq: secrets.groqApiKey ? {
                apiKey: secrets.groqApiKey,
                model: secrets.groqModel || "qwen/qwen3-32b",
                baseURL: "https://api.groq.com/openai/v1",
            } : undefined,
        } as Partial<AppConfig>;
    } catch {
        return null;
    }
}
