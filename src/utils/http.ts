import { reportHttpRequest } from "./analytics.js";

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

/**
 * Fetch with exponential backoff retry.
 */
export async function fetchWithRetry(
    url: string,
    options: FetchOptions = {},
    retries = 3,
    baseDelay = 1000
): Promise<Response> {
    const headers: Record<string, string> = {
        "User-Agent": DEFAULT_USER_AGENT,
        ...options.headers,
    };
    const method = (options.method ?? "GET").toUpperCase();

    for (let attempt = 0; attempt <= retries; attempt++) {
        const startedAt = Date.now();
        try {
            const response = await fetch(url, { ...options, headers });
            const durationMs = Date.now() - startedAt;

            if (response.status === 429 && attempt < retries) {
                const retryAfter = response.headers.get("Retry-After");
                const delay = retryAfter
                    ? parseInt(retryAfter, 10) * 1000
                    : baseDelay * Math.pow(2, attempt);
                reportHttpRequest({
                    url,
                    method,
                    status: response.status,
                    ok: response.ok,
                    durationMs,
                    attempt,
                    retries,
                    retryAfterMs: delay,
                });
                await sleep(delay);
                continue;
            }

            if (!response.ok && attempt < retries && response.status >= 500) {
                reportHttpRequest({
                    url,
                    method,
                    status: response.status,
                    ok: response.ok,
                    durationMs,
                    attempt,
                    retries,
                });
                await sleep(baseDelay * Math.pow(2, attempt));
                continue;
            }

            reportHttpRequest({
                url,
                method,
                status: response.status,
                ok: response.ok,
                durationMs,
                attempt,
                retries,
            });
            return response;
        } catch (error) {
            const durationMs = Date.now() - startedAt;
            reportHttpRequest({
                url,
                method,
                durationMs,
                attempt,
                retries,
                error: error instanceof Error ? error.message : String(error),
            });
            if (attempt === retries) throw error;
            await sleep(baseDelay * Math.pow(2, attempt));
        }
    }

    throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts`);
}

/**
 * Rate-limited fetch — waits a minimum delay between calls.
 */
let lastFetchTime = 0;

export async function rateLimitedFetch(
    url: string,
    options: FetchOptions = {},
    minDelayMs = 1000
): Promise<Response> {
    const now = Date.now();
    const elapsed = now - lastFetchTime;

    if (elapsed < minDelayMs) {
        await sleep(minDelayMs - elapsed);
    }

    lastFetchTime = Date.now();
    return fetchWithRetry(url, options);
}

/**
 * Fetch JSON with retry and parse.
 */
export async function fetchJSON<T>(
    url: string,
    options: FetchOptions = {}
): Promise<T> {
    const response = await fetchWithRetry(url, {
        ...options,
        headers: {
            Accept: "application/json",
            ...options.headers,
        },
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
            `HTTP ${response.status} ${response.statusText} for ${url}: ${body.slice(0, 200)}`
        );
    }

    return response.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
