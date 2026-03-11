import OpenAI from "openai";
import type {
    ChatCompletionMessageParam,
    ChatCompletionTool,
    ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions";
import type { AppConfig } from "../types/index.js";
import { reportProviderFallback } from "./analytics.js";
import { searchWeb } from "../services/web-search.js";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatCompletionOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    tools?: ChatCompletionTool[];
    toolChoice?: ChatCompletionToolChoiceOption;
    toolHandlers?: Record<string, (args: unknown) => Promise<string>>;
    maxToolRounds?: number;
    enableTavilyTools?: boolean;
}

type ToolHandler = (args: unknown) => Promise<string>;

function isFunctionTool(
    tool: ChatCompletionTool
): tool is Extract<ChatCompletionTool, { type: "function" }> {
    return tool.type === "function";
}

function buildTavilyTool(apiKey: string): {
    tool: ChatCompletionTool;
    handler: ToolHandler;
} {
    return {
        tool: {
            type: "function",
            function: {
                name: "tavily_search",
                description: "Search the web using Tavily for licensing or rights information.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                        maxResults: { type: "number" },
                    },
                    required: ["query"],
                },
            },
        },
        handler: async (args: unknown) => {
            const parsed = typeof args === "string" ? JSON.parse(args) : args;
            if (!parsed || typeof parsed !== "object") {
                throw new Error("Invalid tavily_search arguments");
            }
            const { query, maxResults } = parsed as { query?: string; maxResults?: number };
            if (!query) {
                throw new Error("tavily_search requires a query");
            }
            const results = await searchWeb(query, apiKey);
            const limited = typeof maxResults === "number" ? results.slice(0, maxResults) : results;
            return JSON.stringify(limited);
        },
    };
}

function resolveTools(
    config: AppConfig,
    options: ChatCompletionOptions
): { tools?: ChatCompletionTool[]; handlers: Map<string, ToolHandler> } {
    const handlers = new Map<string, ToolHandler>();
    const tools: ChatCompletionTool[] = [];

    if (options.tools) {
        tools.push(...options.tools);
    }

    if (options.toolHandlers) {
        for (const [name, handler] of Object.entries(options.toolHandlers)) {
            handlers.set(name, handler);
        }
    }

    const enableTavilyTools = options.enableTavilyTools ?? true;
    if (enableTavilyTools && config.tavily?.apiKey) {
        const tavily = buildTavilyTool(config.tavily.apiKey);
        const tavilyToolName = isFunctionTool(tavily.tool) ? tavily.tool.function.name : "tavily_search";
        if (!tools.some((tool) => isFunctionTool(tool) && tool.function.name === tavilyToolName)) {
            tools.push(tavily.tool);
        }
        if (!handlers.has(tavilyToolName)) {
            handlers.set(tavilyToolName, tavily.handler);
        }
    }

    return { tools: tools.length > 0 ? tools : undefined, handlers };
}

async function runChatCompletion(
    client: OpenAI,
    request: {
        model: string;
        messages: ChatCompletionMessageParam[];
        max_tokens?: number;
        temperature?: number;
        tools?: ChatCompletionTool[];
        tool_choice?: ChatCompletionToolChoiceOption;
    },
    toolHandlers: Map<string, ToolHandler>,
    maxToolRounds: number
): Promise<string> {
    let workingMessages = [...request.messages];

    for (let round = 0; round <= maxToolRounds; round++) {
        const response = await client.chat.completions.create({
            ...request,
            messages: workingMessages,
        });

        const message = response.choices?.[0]?.message;
        const toolCalls = message?.tool_calls;
        const content = message?.content;

        if (!toolCalls || toolCalls.length === 0) {
            if (!content) {
                throw new Error("No response content from model");
            }
            return content;
        }

        workingMessages = [
            ...workingMessages,
            {
                role: "assistant",
                tool_calls: toolCalls,
            },
        ];

        for (const toolCall of toolCalls) {
            if (toolCall.type !== "function") {
                throw new Error("Unsupported tool call type");
            }
            const toolName = toolCall.function?.name;
            if (!toolName) {
                throw new Error("Tool call missing function name");
            }
            const handler = toolHandlers.get(toolName);
            if (!handler) {
                throw new Error(`No handler registered for tool: ${toolName}`);
            }
            const argsText = toolCall.function?.arguments ?? "{}";
            let args: unknown;
            try {
                args = JSON.parse(argsText);
            } catch {
                args = argsText;
            }
            const toolResult = await handler(args);
            workingMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResult,
            });
        }
    }

    throw new Error("Tool call loop exceeded");
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
    const { tools, handlers } = resolveTools(config, options);
    const maxToolRounds = options.maxToolRounds ?? 2;

    try {
        return await runChatCompletion(
            openrouterClient,
            {
            model,
                messages: messages as ChatCompletionMessageParam[],
                max_tokens: options.maxTokens,
                temperature: options.temperature,
                tools,
                tool_choice: options.toolChoice,
            },
            handlers,
            maxToolRounds
        );
    } catch (error) {
        console.warn("OpenRouter failed:", error instanceof Error ? error.message : String(error));
        
        if (config.cerebras) {
            console.warn("Falling back to Cerebras...");
            try {
                reportProviderFallback("cerebras");
                const cerebrasClient = new OpenAI({
                    baseURL: config.cerebras.baseURL,
                    apiKey: config.cerebras.apiKey,
                });

                return await runChatCompletion(
                    cerebrasClient,
                    {
                    model: config.cerebras.model,
                        messages: messages as ChatCompletionMessageParam[],
                        max_tokens: options.maxTokens,
                        temperature: options.temperature,
                        tools,
                        tool_choice: options.toolChoice,
                    },
                    handlers,
                    maxToolRounds
                );
            } catch (cerebrasError) {
                console.error("Cerebras fallback also failed:", cerebrasError instanceof Error ? cerebrasError.message : String(cerebrasError));
                throw cerebrasError;
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
