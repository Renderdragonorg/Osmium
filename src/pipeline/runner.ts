import { EventEmitter } from "node:events";
import type {
    AppConfig,
    PipelineConfig,
    PipelineEvent,
    CopyrightVerdict,
    ParsedCredits,
    RegistryResult,
} from "../types/index.js";

import { getSpotifyToken, getTrackWithAlbum } from "../services/spotify.js";
import { scrapeCredits } from "../services/credits-scraper.js";
import { lookupByISRC } from "../services/musicbrainz.js";
import { lookupByPreviewUrl } from "../services/acoustid.js";
import { searchRelease } from "../services/discogs.js";
import { parseCreditsWithAI } from "../agents/credits-parser.js";
import { runRegistryLookup } from "../agents/registry-lookup.js";
import { resolveDiscrepancies } from "../agents/discrepancy.js";
import { detectSamples } from "../agents/sample-detector.js";
import { runOrchestrator } from "../agents/orchestrator.js";
import { assessRisk } from "../agents/risk-assessor.js";
import { searchWeb } from "../services/web-search.js";
import { generateAISummary } from "../agents/summary-agent.js";
import { parseTrackInput } from "../utils/validation.js";

/**
 * PipelineRunner — orchestrates the full copyright checking pipeline.
 *
 * Emits 'progress' events for each step so the CLI can display real-time
 * status updates. Each step is independent and handles its own errors
 * without crashing the pipeline.
 */
export class PipelineRunner extends EventEmitter {
    private config: AppConfig;

    constructor(config: AppConfig) {
        super();
        this.config = config;
    }

    private emit_progress(event: PipelineEvent): void {
        this.emit("progress", event);
    }

    /**
     * Run the full copyright checking pipeline for a Spotify track.
     */
    async run(trackInput: string, pipelineConfig: PipelineConfig): Promise<CopyrightVerdict> {
        const dataSources: string[] = [];

        // ─── Step 1: Track Resolution ───────────────────────
        this.emit_progress({
            step: 1,
            name: "track-resolution",
            status: "in_progress",
            message: "Resolving Spotify track...",
        });

        const trackId = parseTrackInput(trackInput);
        const token = await getSpotifyToken(
            this.config.spotify.clientId,
            this.config.spotify.clientSecret
        );
        const { track, album } = await getTrackWithAlbum(trackId, token);

        dataSources.push("Spotify Web API");

        const isrc = track.external_ids?.isrc ?? "";

        this.emit_progress({
            step: 1,
            name: "track-resolution",
            status: "completed",
            message: `${track.name} — ${track.artists.map((a) => a.name).join(", ")}`,
            data: {
                track: track.name,
                artists: track.artists.map((a) => a.name),
                isrc: isrc,
                label: album.label,
            },
        });

        const artistNames = track.artists.map((a) => a.name);
        const primaryArtist = artistNames[0] ?? "";

        // ─── Step 2: Credits Parsing ────────────────────────
        this.emit_progress({
            step: 2,
            name: "credits-parsing",
            status: "in_progress",
            message: "Scraping Spotify credits page...",
        });

        let parsedCredits: ParsedCredits | null = null;

        try {
            const { credits: rawCredits } = await scrapeCredits(trackId);
            if (rawCredits) {
                parsedCredits = await parseCreditsWithAI(
                    this.config,
                    rawCredits,
                    track.name,
                    artistNames
                );
                dataSources.push("Spotify Credits Page");
            }

            this.emit_progress({
                step: 2,
                name: "credits-parsing",
                status: "completed",
                message: parsedCredits
                    ? `Found ${parsedCredits.writers.length} writers, ${parsedCredits.producers.length} producers`
                    : "No credits data available",
            });
        } catch (error) {
            this.emit_progress({
                step: 2,
                name: "credits-parsing",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // ─── Step 3: Registry Lookup ────────────────────────
        this.emit_progress({
            step: 3,
            name: "registry-lookup",
            status: "in_progress",
            message: "Searching PRO registries (ASCAP, BMI, SESAC, Copyright Office)...",
        });

        let registryResults: RegistryResult[] = [];
        const writerNames = parsedCredits?.writers.map((w) => w.name) ?? [primaryArtist];

        try {
            const registryData = await runRegistryLookup(
                track.name,
                writerNames,
                primaryArtist
            );
            registryResults = registryData.results;
            dataSources.push(...registryData.sourcesChecked);

            this.emit_progress({
                step: 3,
                name: "registry-lookup",
                status: "completed",
                message: `Found ${registryResults.length} registrations across ${registryData.sourcesChecked.length} sources`,
            });
        } catch (error) {
            this.emit_progress({
                step: 3,
                name: "registry-lookup",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // ─── Step 4: MusicBrainz Lookup ─────────────────────
        this.emit_progress({
            step: 4,
            name: "musicbrainz-lookup",
            status: "in_progress",
            message: "Querying MusicBrainz...",
        });

        let mbLabel: string | undefined;

        try {
            if (isrc) {
                const mbResult = await lookupByISRC(isrc);
                mbLabel = mbResult.label;
                dataSources.push("MusicBrainz");

                this.emit_progress({
                    step: 4,
                    name: "musicbrainz-lookup",
                    status: "completed",
                    message: mbLabel
                        ? `Label: ${mbLabel}, ${mbResult.recordings.length} recordings found`
                        : `${mbResult.recordings.length} recordings found`,
                });
            } else {
                this.emit_progress({
                    step: 4,
                    name: "musicbrainz-lookup",
                    status: "skipped",
                    message: "No ISRC available",
                });
            }
        } catch (error) {
            this.emit_progress({
                step: 4,
                name: "musicbrainz-lookup",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // ─── Step 5: Audio Fingerprint ──────────────────────
        this.emit_progress({
            step: 5,
            name: "fingerprint-check",
            status: "in_progress",
            message: "Running audio fingerprint checks...",
        });

        let fingerprintMatch = 0;

        try {
            if (track.preview_url) {
                // AcoustID
                if (this.config.acoustid.apiKey) {
                    const acoustResults = await lookupByPreviewUrl(
                        this.config.acoustid.apiKey,
                        track.preview_url
                    );
                    if (acoustResults.length > 0) {
                        fingerprintMatch = Math.max(
                            ...acoustResults.map((r) => r.score * 100)
                        );
                        dataSources.push("AcoustID");
                    }
                }

                this.emit_progress({
                    step: 5,
                    name: "fingerprint-check",
                    status: "completed",
                    message: fingerprintMatch > 0
                        ? `Match confidence: ${fingerprintMatch.toFixed(0)}%`
                        : "Fingerprint checks completed",
                });
            } else {
                this.emit_progress({
                    step: 5,
                    name: "fingerprint-check",
                    status: "skipped",
                    message: "No preview URL available for fingerprinting",
                });
            }
        } catch (error) {
            this.emit_progress({
                step: 5,
                name: "fingerprint-check",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // ─── Step 6: Sample Detection ───────────────────────
        this.emit_progress({
            step: 6,
            name: "sample-detection",
            status: "in_progress",
            message: "Checking for samples and interpolations...",
        });

        let sampleInfo: Awaited<ReturnType<typeof detectSamples>> = {
            samples: [],
            riskLevel: "none",
        };

        try {
            sampleInfo = await detectSamples(
                this.config,
                track.name,
                primaryArtist
            );
            dataSources.push("WhoSampled");

            this.emit_progress({
                step: 6,
                name: "sample-detection",
                status: "completed",
                message:
                    sampleInfo.samples.length > 0
                        ? `${sampleInfo.samples.length} sample(s) detected — risk: ${sampleInfo.riskLevel}`
                        : "No samples detected",
            });
        } catch (error) {
            this.emit_progress({
                step: 6,
                name: "sample-detection",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // ─── Discrepancy Resolution (internal step) ─────────
        const discrepancyResult = await resolveDiscrepancies(this.config, {
            trackName: track.name,
            spotifyLabel: album.label,
            spotifyCopyrights: album.copyrights.map((c) => ({
                type: c.type,
                text: c.text,
            })),
            credits: parsedCredits,
            registryResults,
            musicBrainzLabel: mbLabel,
        });

        // ─── Step 7: AI Synthesis ───────────────────────────
        this.emit_progress({
            step: 7,
            name: "ai-synthesis",
            status: "in_progress",
            message: "Running AI orchestrator for copyright synthesis...",
        });

        let partialVerdict: Partial<CopyrightVerdict> = {};

        try {
            partialVerdict = await runOrchestrator(this.config, {
                trackName: track.name,
                artists: artistNames,
                isrc,
                label: album.label,
                copyrights: album.copyrights.map((c) => ({
                    type: c.type,
                    text: c.text,
                })),
                credits: parsedCredits,
                registryResults,
                musicBrainzLabel: mbLabel,
                fingerprintMatch,
                sampleInfo,
                discrepancies: discrepancyResult.discrepancies,
            });

            partialVerdict.dataSources = [...new Set(dataSources)];

            this.emit_progress({
                step: 7,
                name: "ai-synthesis",
                status: "completed",
                message: "Copyright analysis synthesized",
            });
        } catch (error) {
            this.emit_progress({
                step: 7,
                name: "ai-synthesis",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // ─── Step 8: Risk Assessment ────────────────────────
        this.emit_progress({
            step: 8,
            name: "risk-assessment",
            status: "in_progress",
            message: "Finalizing risk assessment and verdict...",
        });

        const trackInfo = {
            name: track.name,
            artists: artistNames,
            isrc,
            spotifyId: track.id,
            releaseDate: album.release_date,
            duration: track.duration_ms,
        };

        const verdict = await assessRisk(this.config, partialVerdict, trackInfo);

        this.emit_progress({
            step: 8,
            name: "risk-assessment",
            status: "completed",
            message: `Verdict: ${verdict.copyrightType} — Risk: ${verdict.riskLevel} — Confidence: ${verdict.confidence}%`,
        });

        // ─── Step 9: AI Summary ───────────────────────────
        this.emit_progress({
            step: 9,
            name: "ai-summary",
            status: "in_progress",
            message: "Generating AI summary and researching licensing...",
        });

        const labelName = verdict.masterRights.label || album.label || mbLabel;
        let webSearchResults: Awaited<ReturnType<typeof searchWeb>> = [];

        try {
            if (this.config.tavily?.apiKey && labelName && labelName !== "Unknown") {
                this.emit_progress({
                    step: 9,
                    name: "ai-summary",
                    status: "in_progress",
                    message: `Searching web for licensing policies of "${labelName}"...`,
                });
                webSearchResults = await searchWeb(
                    `"${labelName}" record label licensing policy OR copyright OR sync license`,
                    this.config.tavily.apiKey
                );
            }

            this.emit_progress({
                step: 9,
                name: "ai-summary",
                status: "in_progress",
                message: "Synthesizing final AI summary...",
            });

            const aiSummary = await generateAISummary(this.config, verdict, webSearchResults);
            verdict.aiSummary = aiSummary;

            this.emit_progress({
                step: 9,
                name: "ai-summary",
                status: "completed",
                message: `Summary generated: ${aiSummary.isCopyrighted === "yes" ? "Copyrighted" : "Check required"}`
            });
        } catch (error) {
            this.emit_progress({
                step: 9,
                name: "ai-summary",
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }

        return verdict;
    }
}
