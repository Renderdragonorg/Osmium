import { tavily } from "@tavily/core";
import type { WebSearchSource } from "../types/index.js";

/**
 * Perform a web search using Tavily API and return structured results.
 * This is used to look up label licensing policies and copyright enforcement online.
 */
export async function searchWeb(query: string, apiKey: string): Promise<WebSearchSource[]> {
    try {
        const tvly = tavily({ apiKey });

        // Use Tavily's search API configured for general web information retrieval
        const response = await tvly.search(query, {
            searchDepth: "basic",
            maxResults: 5,
            includeAnswer: false,
        });

        // Map the results to our internal WebSearchSource format
        return response.results.map((result) => ({
            title: result.title,
            url: result.url,
            snippet: result.content,
        }));
    } catch (error) {
        throw new Error(`Web search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
