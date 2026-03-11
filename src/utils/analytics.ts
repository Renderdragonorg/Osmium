import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { AppConfig, PipelineEvent, CopyrightVerdict } from "../types/index.js";

type AnalyticsContext = {
    checkId: string;
    trackInput?: string;
    source: "cli" | "desktop";
    step?: string;
    steps: PipelineEvent[];
    fallbackProviders: string[];
    httpRequests: Array<{
        url: string;
        method: string;
        status?: number;
        ok?: boolean;
        durationMs: number;
        attempt: number;
        retries: number;
        error?: string;
        retryAfterMs?: number;
    }>;
};

const store = new AsyncLocalStorage<AnalyticsContext>();
let analyticsConfig: AppConfig | null = null;

function resolveSource(): "cli" | "desktop" {
    return process.versions.electron ? "desktop" : "cli";
}

export function initAnalytics(config: AppConfig): void {
    analyticsConfig = config;
}

export function withCheckContext<T>(
    data: { trackInput?: string },
    fn: () => Promise<T>
): Promise<T> {
    const context: AnalyticsContext = {
        checkId: randomUUID(),
        trackInput: data.trackInput,
        source: resolveSource(),
        steps: [],
        fallbackProviders: [],
        httpRequests: [],
    };
    return store.run(context, fn);
}

export function setCheckStep(step?: string): void {
    const context = store.getStore();
    if (context) context.step = step;
}

export function recordStep(event: PipelineEvent): void {
    const context = store.getStore();
    if (!context) return;
    context.steps.push(event);
    context.step = event.name;
}

export function reportProviderFallback(provider: string): void {
    const context = store.getStore();
    if (!context) return;
    if (!context.fallbackProviders.includes(provider)) {
        context.fallbackProviders.push(provider);
    }
}

function resolveWebhookConfig(): { url?: string; customMessage?: string } {
    return {
        url: analyticsConfig?.discordWebhook?.url ?? process.env.DISCORD_WEBHOOK_URL,
        customMessage:
            analyticsConfig?.discordWebhook?.customMessage ?? process.env.DISCORD_WEBHOOK_CUSTOM_MESSAGE,
    };
}

function formatSteps(context: AnalyticsContext): string {
    if (context.steps.length === 0) return "No steps recorded.";
    return context.steps
        .map((step) => {
            const status = step.status;
            const label = `${step.step}. ${step.name}: ${status}`;
            if (status === "failed" && step.error) {
                return `${label} — ${step.error}`;
            }
            return label;
        })
        .join("\n");
}

function formatFallback(context: AnalyticsContext): string {
    if (context.fallbackProviders.length === 0) {
        return "Backup provider used: no";
    }
    return `Backup provider used: ${context.fallbackProviders.join(", ")}`;
}

function trimMessage(message: string, limit = 1900): string {
    if (message.length <= limit) return message;
    return `${message.slice(0, limit - 3)}...`;
}

async function sendDiscordMessage(message: string): Promise<void> {
    const { url } = resolveWebhookConfig();
    if (!url) return;
    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimMessage(message) }),
    });
}

export async function reportCheckCompleted(verdict: CopyrightVerdict): Promise<void> {
    const context = store.getStore();
    if (!context) return;
    const { customMessage } = resolveWebhookConfig();
    const stepsSummary = formatSteps(context);
    const fallbackSummary = formatFallback(context);
    await sendDiscordMessage(
        `Check completed (${context.source})\nTrack: ${verdict.track.name} — ${verdict.track.artists.join(", ")}\n${fallbackSummary}\n\nSteps:\n${stepsSummary}`
    );
    await sendDiscordMessage(
        `Result\nRisk: ${verdict.riskLevel} • Confidence: ${verdict.confidence}% • Type: ${verdict.copyrightType}\nLicensing: ${verdict.licensingPath}\n${customMessage ?? ""}`.trim()
    );
}

export async function reportCheckFailed(error: string): Promise<void> {
    const context = store.getStore();
    if (!context) return;
    const { customMessage } = resolveWebhookConfig();
    const stepsSummary = formatSteps(context);
    const fallbackSummary = formatFallback(context);
    await sendDiscordMessage(
        `Check failed (${context.source})\nInput: ${context.trackInput ?? "unknown"}\n${fallbackSummary}\n\nSteps:\n${stepsSummary}`
    );
    await sendDiscordMessage(`Error: ${error}\n${customMessage ?? ""}`.trim());
}

export function reportHttpRequest(details: {
    url: string;
    method: string;
    status?: number;
    ok?: boolean;
    durationMs: number;
    attempt: number;
    retries: number;
    error?: string;
    retryAfterMs?: number;
}): void {
    const context = store.getStore();
    if (!context) return;
    context.httpRequests.push(details);
}

export async function shutdownAnalytics(): Promise<void> {
    return;
}
