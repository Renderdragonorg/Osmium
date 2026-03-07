import dotenv from "dotenv";
import type { AppConfig } from "../types/index.js";
import { fetchSecretsFromConvex } from "../utils/convex-client.js";

dotenv.config();

let _config: AppConfig | null = null;

function buildConfigFromEnv(): AppConfig {
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
            model: process.env.OPENROUTER_MODEL || "z-ai/glm-4.5-air:free",
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

function mergeConfigs(convexConfig: Partial<AppConfig> | null, envConfig: AppConfig): AppConfig {
    if (!convexConfig) return envConfig;

    return {
        spotify: convexConfig.spotify || envConfig.spotify,
        nocodeSpotify: convexConfig.nocodeSpotify || envConfig.nocodeSpotify,
        openrouter: convexConfig.openrouter || envConfig.openrouter,
        acoustid: convexConfig.acoustid || envConfig.acoustid,
        discogs: convexConfig.discogs || envConfig.discogs,
        tavily: convexConfig.tavily || envConfig.tavily,
        groq: convexConfig.groq || envConfig.groq,
    };
}

export async function validateConfigAsync(): Promise<AppConfig> {
    const convexConfig = await fetchSecretsFromConvex();
    
    const missing: string[] = [];
    
    if (!convexConfig?.spotify?.clientId && !process.env.SPOTIFY_CLIENT_ID) {
        missing.push("SPOTIFY_CLIENT_ID");
    }
    if (!convexConfig?.spotify?.clientSecret && !process.env.SPOTIFY_CLIENT_SECRET) {
        missing.push("SPOTIFY_CLIENT_SECRET");
    }
    if (!convexConfig?.openrouter?.apiKey && !process.env.OPENROUTER_API_KEY) {
        missing.push("OPENROUTER_API_KEY");
    }
    if (!convexConfig?.nocodeSpotify?.cloudName && !process.env.NOCODE_SPOTIFY_CLOUD_NAME) {
        missing.push("NOCODE_SPOTIFY_CLOUD_NAME");
    }
    if (!convexConfig?.nocodeSpotify?.token && !process.env.NOCODE_SPOTIFY_TOKEN) {
        missing.push("NOCODE_SPOTIFY_TOKEN");
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n${missing.map((k) => `  • ${k}`).join("\n")}\n\nSet them in Convex or in your .env file.`
        );
    }

    const envConfig: AppConfig = {
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID || "",
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
        },
        nocodeSpotify: {
            cloudName: process.env.NOCODE_SPOTIFY_CLOUD_NAME || "",
            token: process.env.NOCODE_SPOTIFY_TOKEN || "",
        },
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY || "",
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

    return mergeConfigs(convexConfig, envConfig);
}

export function validateConfig(): AppConfig {
    return buildConfigFromEnv();
}

export async function getConfigAsync(): Promise<AppConfig> {
    if (_config) return _config;
    _config = await validateConfigAsync();
    return _config;
}

export function getConfig(): AppConfig {
    if (_config) return _config;
    _config = validateConfig();
    return _config;
}
