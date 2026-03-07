import dotenv from "dotenv";
import type { AppConfig } from "../types/index.js";

dotenv.config();

let _config: AppConfig | null = null;

export function validateConfig(): AppConfig {
    const missing: string[] = [];

    if (!process.env.SPOTIFY_CLIENT_ID) missing.push("SPOTIFY_CLIENT_ID");
    if (!process.env.SPOTIFY_CLIENT_SECRET) missing.push("SPOTIFY_CLIENT_SECRET");
    if (!process.env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");
    if (!process.env.NOCODE_SPOTIFY_CLOUD_NAME) missing.push("NOCODE_SPOTIFY_CLOUD_NAME");
    if (!process.env.NOCODE_SPOTIFY_TOKEN) missing.push("NOCODE_SPOTIFY_TOKEN");

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n${missing.map((k) => `  • ${k}`).join("\n")}\n\nCopy .env.example to .env and fill in the values.`
        );
    }

    return {
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
        },
        nocodeSpotify: {
            cloudName: process.env.NOCODE_SPOTIFY_CLOUD_NAME!,
            token: process.env.NOCODE_SPOTIFY_TOKEN!,
        },
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY!,
            model: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
                "HTTP-Referer": "https://github.com/osmium-cli/osmium",
                "X-OpenRouter-Title": "Osmium CLI"
            }
        },
        acoustid: {
            apiKey: process.env.ACOUSTID_API_KEY,
        },
        discogs: {
            token: process.env.DISCOGS_TOKEN,
        },
        tavily: {
            apiKey: process.env.TAVILY_API_KEY,
        },
        ...(process.env.GROQ_API_KEY
            ? {
                  groq: {
                      apiKey: process.env.GROQ_API_KEY,
                      model: process.env.GROQ_MODEL || "qwen/qwen3-32b",
                      baseURL: "https://api.groq.com/openai/v1",
                  },
              }
            : {}),
    };
}

/**
 * Lazy config getter — only validates on first access so CLI --help works without .env
 */
export function getConfig(): AppConfig {
    if (!_config) {
        _config = validateConfig();
    }
    return _config;
}
