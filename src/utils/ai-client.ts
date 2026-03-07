import OpenAI from "openai";
import type { AppConfig } from "../types/index.js";

function isRateLimitError(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
        return error.status === 429;
    }
    if (OpenAI.APIConnectionError && error instanceof OpenAI.APIConnectionError) {
        return true;
    }
    if (OpenAI.RateLimitError && error instanceof OpenAI.RateLimitError) {
        return true;
    }
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes("429") ||
            msg.includes("rate limit") ||
            msg.includes("too many requests") ||
            msg.includes("overloaded") ||
            msg.includes("capacity") ||
            msg.includes("temporarily unavailable")
        );
    }
    return false;
}

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatCompletionOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

export async function chatCompletion(
    config: AppConfig,
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
): Promise<string> {
    const openrouterClient = new OpenAI({
        baseURL: config.openrouter.baseURL,
        apiKey: config.openrouter.apiKey,
        defaultHeaders: config.openrouter.defaultHeaders,
    });

    const model = options.model || config.openrouter.model;

    try {
        const result = await openrouterClient.chat.completions.create({
            model,
            messages,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
        });

        const content = result.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No response content from OpenRouter");
        }
        return content;
    } catch (error) {
        if (isRateLimitError(error)) {
            console.warn("OpenRouter rate limited:", error instanceof Error ? error.message : String(error));
            
            if (config.modal) {
                console.warn("Falling back to Modal...");
                try {
                    const modalClient = new OpenAI({
                        baseURL: config.modal.baseURL,
                        apiKey: config.modal.apiKey,
                    });

                    const result = await modalClient.chat.completions.create({
                        model: config.modal.model,
                        messages,
                        max_tokens: options.maxTokens,
                        temperature: options.temperature,
                    });

                    const content = result.choices?.[0]?.message?.content;
                    if (!content) {
                        throw new Error("No response content from Modal");
                    }
                    return content;
                } catch (modalError) {
                    console.error("Modal fallback also failed:", modalError instanceof Error ? modalError.message : String(modalError));
                    throw modalError;
                }
            }
        }

        throw error;
    }
}

export async function chatCompletionJSON<T>(
    config: AppConfig,
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
): Promise<T> {
    const content = await chatCompletion(config, messages, options);

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const parsed = JSON.parse(jsonMatch[1]!.trim());
    return parsed as T;
}
