#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { writeFile } from "node:fs/promises";
import { getConfig } from "./config/index.js";
import { getSpotifyToken, searchTracks } from "./services/spotify.js";
import { getPlaylistTracksViaNoCodeAPI } from "./services/nocode-spotify.js";
import { PipelineRunner } from "./pipeline/runner.js";
import { Logger } from "./utils/logger.js";
import { parsePlaylistInput } from "./utils/validation.js";
import { loadHistory, saveToHistory, clearHistory, getStorePathForDisplay } from "./utils/history.js";
import { shutdownAnalytics } from "./utils/analytics.js";
import type { PipelineEvent, CopyrightVerdict } from "./types/index.js";

const VERSION = "1.0.0";

const program = new Command();

program
    .name("osmium")
    .description(
        chalk.hex("#e8ff47")("◆ Osmium") +
        chalk.gray(
            " — The Best tool for Checking Spotify Track Copyrights (and Playlists!)"
        )
    )
    .version(VERSION);

/**
 * Shared check logic used by both `check` and `search` commands.
 */
async function runCheck(track: string, options: { output?: string; verbose?: boolean }) {
    const logger = new Logger(options.verbose);

    // Header
    console.log();
    console.log(
        chalk.bold(chalk.hex("#e8ff47")("  ◆ OSMIUM")) +
        chalk.gray(" · Music Copyright Checker v" + VERSION)
    );
    console.log(chalk.dim("  ─".repeat(25)));
    console.log();

    const spinner = ora({
        text: "Initializing pipeline...",
        color: "yellow",
    }).start();

    try {
        const config = getConfig();
        const pipeline = new PipelineRunner(config);

        // Listen for progress events
        pipeline.on("progress", (event: PipelineEvent) => {
            if (event.status === "in_progress") {
                spinner.text = `[${event.step}/9] ${event.message ?? event.name}`;
            } else if (event.status === "completed") {
                spinner.stop();
                logger.step(event.step, formatStepName(event.name), "completed");
                if (event.message) {
                    logger.debug(event.message);
                }
                spinner.start(`[${event.step + 1}/9] Processing...`);
            } else if (event.status === "failed") {
                spinner.stop();
                logger.step(event.step, formatStepName(event.name), "failed");
                if (event.error) {
                    logger.debug(`Error: ${event.error}`);
                }
                spinner.start(`[${event.step + 1}/9] Continuing...`);
            } else if (event.status === "skipped") {
                spinner.stop();
                logger.step(event.step, formatStepName(event.name), "skipped");
                if (event.message) {
                    logger.debug(event.message);
                }
                spinner.start(`[${event.step + 1}/9] Processing...`);
            }
        });

        // Run the pipeline
        const verdict = await pipeline.run(track, {
            verbose: options.verbose ?? false,
            outputFile: options.output,
        });

        spinner.stop();
        console.log();

        // Display verdict
        displayVerdict(verdict, logger);

        // Save to history
        await saveToHistory(verdict);

        // Write to file if requested
        if (options.output) {
            await writeFile(
                options.output,
                JSON.stringify(verdict, null, 2),
                "utf-8"
            );
            console.log();
            logger.success(`Verdict written to ${chalk.bold(options.output)}`);
        }
        await shutdownAnalytics();
    } catch (error) {
        spinner.stop();
        logger.error(
            error instanceof Error ? error.message : String(error)
        );
        await shutdownAnalytics();
        process.exit(1);
    }
}

program
    .command("check")
    .description("Check copyright ownership for a Spotify track")
    .argument("<track>", "Spotify track URL, URI, or ID")
    .option("-o, --output <file>", "Write verdict JSON to file")
    .option("-v, --verbose", "Enable verbose output with detailed progress", false)
    .action(async (track: string, options: { output?: string; verbose?: boolean }) => {
        await runCheck(track, options);
    });

program
    .command("check-playlist")
    .description("Check copyright ownership for all tracks in a Spotify playlist")
    .argument("<playlist>", "Spotify playlist URL, URI, or ID")
    .option("-o, --output <file>", "Write all verdicts as JSON array to file")
    .option("-v, --verbose", "Enable verbose output", false)
    .option("--limit <n>", "Limit number of tracks to check", undefined)
    .action(async (playlistInput: string, options: { output?: string; verbose?: boolean; limit?: string }) => {
        const logger = new Logger(options.verbose);
        const limit = options.limit ? parseInt(options.limit, 10) : undefined;

        // Header
        console.log();
        console.log(
            chalk.bold(chalk.hex("#e8ff47")("  ◆ OSMIUM")) +
            chalk.gray(" · Playlist Copyright Checker v" + VERSION)
        );
        console.log(chalk.dim("  ─".repeat(25)));
        console.log();

        const spinner = ora({ text: "Loading playlist...", color: "yellow" }).start();

        try {
            const config = getConfig();
            const playlistId = parsePlaylistInput(playlistInput);

            const playlist = await getPlaylistTracksViaNoCodeAPI(
                playlistId,
                config.nocodeSpotify.cloudName,
                config.nocodeSpotify.token
            );

            spinner.stop();
            console.log(chalk.bold(`  📋 ${playlist.name}`) + chalk.gray(` by ${playlist.owner}`));
            console.log(chalk.dim(`  ${playlist.tracks.length} tracks (${playlist.totalTracks} total)`));
            console.log();

            const tracksToCheck = limit ? playlist.tracks.slice(0, limit) : playlist.tracks;
            const verdicts: CopyrightVerdict[] = [];
            const failures: Array<{ track: string; error: string }> = [];

            // Process each track
            for (let i = 0; i < tracksToCheck.length; i++) {
                const t = tracksToCheck[i];
                const progress = chalk.gray(`[${i + 1}/${tracksToCheck.length}]`);
                const trackLabel = `${t.name} — ${t.artists.join(", ")}`;

                spinner.start(`${progress} Checking ${chalk.white(trackLabel)}`);

                try {
                    const pipeline = new PipelineRunner(config);

                    // Suppress individual step progress for playlist mode
                    if (!options.verbose) {
                        pipeline.on("progress", (event: PipelineEvent) => {
                            if (event.status === "in_progress") {
                                spinner.text = `${progress} ${chalk.white(trackLabel)} ${chalk.dim(`· ${event.message ?? event.name}`)}`;
                            }
                        });
                    } else {
                        pipeline.on("progress", (event: PipelineEvent) => {
                            if (event.status === "completed") {
                                spinner.stop();
                                logger.step(event.step, event.name, "completed");
                                if (event.message) logger.debug(event.message);
                                spinner.start(`${progress} ${chalk.white(trackLabel)}`);
                            } else if (event.status === "failed") {
                                spinner.stop();
                                logger.step(event.step, event.name, "failed");
                                spinner.start(`${progress} ${chalk.white(trackLabel)}`);
                            }
                        });
                    }

                    const verdict = await pipeline.run(t.id, { verbose: options.verbose ?? false });
                    verdicts.push(verdict);
                    await saveToHistory(verdict);

                    spinner.stop();
                    const risk = colorRiskBadge(verdict.riskLevel);
                    const conf = chalk.dim(`${verdict.confidence}%`);
                    console.log(`  ${chalk.green("✓")} ${progress} ${trackLabel}  ${risk} ${conf}`);
                } catch (error) {
                    spinner.stop();
                    const errMsg = error instanceof Error ? error.message : String(error);
                    failures.push({ track: trackLabel, error: errMsg });
                    console.log(`  ${chalk.red("✗")} ${progress} ${trackLabel}  ${chalk.red("[ERROR]")}`);
                    if (options.verbose) {
                        console.log(chalk.dim(`    ${errMsg}`));
                    }
                }
            }

            // Summary
            console.log();
            console.log(chalk.dim("  ─".repeat(25)));
            console.log(chalk.bold("  📊 Playlist Summary"));
            console.log();

            const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
            for (const v of verdicts) {
                riskCounts[v.riskLevel]++;
            }

            console.log(`  ${chalk.green("●")} Low Risk:      ${riskCounts.low}`);
            console.log(`  ${chalk.yellow("●")} Medium Risk:   ${riskCounts.medium}`);
            console.log(`  ${chalk.red("●")} High Risk:     ${riskCounts.high}`);
            console.log(`  ${chalk.bgRed.white("●")} Critical:      ${riskCounts.critical}`);

            if (failures.length > 0) {
                console.log(`  ${chalk.gray("●")} Failed:        ${failures.length}`);
            }

            const avgConfidence = verdicts.length > 0
                ? Math.round(verdicts.reduce((sum, v) => sum + v.confidence, 0) / verdicts.length)
                : 0;
            console.log();
            console.log(chalk.dim(`  Avg Confidence: ${avgConfidence}%  ·  Checked: ${verdicts.length}/${tracksToCheck.length}`));

            // Write to file if requested
            if (options.output) {
                await writeFile(options.output, JSON.stringify(verdicts, null, 2), "utf-8");
                console.log();
                logger.success(`All verdicts written to ${chalk.bold(options.output)}`);
            }

            console.log();
        } catch (error) {
            spinner.stop();
            logger.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

function colorRiskBadge(level: string): string {
    switch (level) {
        case "low": return chalk.green("[LOW]");
        case "medium": return chalk.yellow("[MEDIUM]");
        case "high": return chalk.red("[HIGH]");
        case "critical": return chalk.bgRed.white(" CRITICAL ");
        default: return chalk.gray(`[${level.toUpperCase()}]`);
    }
}

/**
 * Display the copyright verdict in a formatted table.
 */
function displayVerdict(verdict: CopyrightVerdict, logger: Logger): void {
    logger.header("Copyright Verdict");
    console.log();

    const spotifyUrl = `https://open.spotify.com/track/${verdict.track.spotifyId}`;

    const rows: Array<[string, string, string]> = [
        [
            "Track",
            `${verdict.track.name} — ${verdict.track.artists.join(", ")}`,
            "",
        ],
        [
            "Spotify",
            chalk.cyan.underline(spotifyUrl),
            "",
        ],
        [
            "ISRC",
            verdict.track.isrc || "N/A",
            verdict.track.isrc ? colorStatus("VERIFIED") : colorStatus("MISSING", "warn"),
        ],
        [
            "Master Rights",
            `${verdict.masterRights.holder} ${verdict.masterRights.label ? `(${verdict.masterRights.label})` : ""}`,
            verdict.masterRights.confirmed
                ? colorStatus("CONFIRMED")
                : colorStatus("UNCONFIRMED", "warn"),
        ],
        [
            "Composition",
            verdict.compositionRights.writers.map((w) => w.name).join(", ") || "Unknown",
            verdict.compositionRights.writers.length > 0
                ? colorStatus(`${verdict.compositionRights.writers.length} WRITERS`)
                : colorStatus("UNKNOWN", "warn"),
        ],
        [
            "Publishers",
            verdict.compositionRights.publishers.join(", ") || "Unknown",
            verdict.compositionRights.publishers.length > 0
                ? colorStatus(`${verdict.compositionRights.publishers.length} PUBLISHERS`, "info")
                : "",
        ],
        [
            "PRO",
            verdict.compositionRights.proRegistrations
                .map((r) => `${r.pro}${r.status === "registered" ? " ✓" : ""}`)
                .join(", ") || "Not found",
            verdict.compositionRights.proRegistrations.length > 0
                ? colorStatus("REGISTERED")
                : colorStatus("NOT FOUND", "warn"),
        ],
        [
            "Samples",
            verdict.samples.detected
                ? verdict.samples.details.map((s) => `${s.originalTrack} by ${s.originalArtist}`).join("; ")
                : "None detected",
            verdict.samples.detected
                ? colorStatus(verdict.samples.riskLevel.toUpperCase(), "warn")
                : colorStatus("CLEAR"),
        ],
        [
            "Copyright Type",
            verdict.copyrightType.replace(/_/g, " ").toUpperCase(),
            "",
        ],
        [
            "Risk Level",
            "",
            colorRiskLevel(verdict.riskLevel),
        ],
        [
            "Confidence",
            `${verdict.confidence}%`,
            colorConfidence(verdict.confidence),
        ],
    ];

    for (const [label, value, status] of rows) {
        const labelCol = chalk.gray(label.padEnd(18));
        const valueCol = chalk.white(value);
        const statusCol = status ? `  ${status}` : "";
        console.log(`  ${labelCol} ${valueCol}${statusCol}`);
    }

    if (verdict.licensingPath) {
        console.log();
        console.log(chalk.gray("  Licensing Path:"));
        console.log(`  ${chalk.cyan(verdict.licensingPath)}`);
    }

    if (verdict.discrepancies.length > 0) {
        console.log();
        console.log(chalk.yellow("  ⚠ Discrepancies:"));
        for (const d of verdict.discrepancies) {
            console.log(`    ${chalk.dim("•")} ${chalk.yellow(d)}`);
        }
    }

    if (verdict.aiSummary) {
        console.log();
        logger.header("AI Licensing Summary");

        const summary = verdict.aiSummary;
        let bannerText = "";
        if (summary.requiresLicense === "no") bannerText = chalk.bgGreen.white(" NO LICENSE REQUIRED ");
        else if (summary.requiresLicense === "depends") bannerText = chalk.bgYellow.white(" LICENSE MAY BE REQUIRED ");
        else bannerText = chalk.bgRed.white(" LICENSE REQUIRED ");

        console.log();
        console.log(`  ${bannerText}`);
        console.log();
        console.log(`  ${chalk.white(summary.explanation)}`);

        if (summary.licensingUrl) {
            console.log();
            console.log(chalk.gray("  Licensing URL:"));
            console.log(`  ${chalk.cyan.underline(summary.licensingUrl)}`);
        }

        console.log();
        console.log(chalk.gray("  Actionable Steps:"));
        for (const step of summary.actionableSteps) {
            console.log(`    ${chalk.cyan("→")} ${chalk.white(step)}`);
        }

        if (summary.webSearchSources.length > 0) {
            console.log();
            console.log(chalk.gray("  Web Sources:"));
            for (const src of summary.webSearchSources) {
                console.log(`    ${chalk.dim("•")} ${chalk.white(src.title)}`);
                console.log(`      ${chalk.cyan.underline(src.url)}`);
            }
        }
    }

    console.log();
    console.log(
        chalk.dim(`  Sources: ${verdict.dataSources.join(" · ")}`)
    );
    console.log(chalk.dim(`  Generated: ${verdict.generatedAt}`));
    console.log();
}

function formatStepName(name: string): string {
    return name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function colorStatus(
    text: string,
    type: "ok" | "warn" | "info" = "ok"
): string {
    switch (type) {
        case "ok":
            return chalk.green(`[${text}]`);
        case "warn":
            return chalk.yellow(`[${text}]`);
        case "info":
            return chalk.cyan(`[${text}]`);
    }
}

function colorRiskLevel(level: string): string {
    switch (level) {
        case "low":
            return chalk.green(`[LOW]`);
        case "medium":
            return chalk.yellow(`[MEDIUM]`);
        case "high":
            return chalk.red(`[HIGH]`);
        case "critical":
            return chalk.bgRed.white(` CRITICAL `);
        default:
            return chalk.gray(`[${level.toUpperCase()}]`);
    }
}

function colorConfidence(confidence: number): string {
    if (confidence >= 80) return chalk.green(`[HIGH]`);
    if (confidence >= 50) return chalk.yellow(`[MEDIUM]`);
    return chalk.red(`[LOW]`);
}

program
    .command("history")
    .description("View past copyright checks (synced with desktop app)")
    .option("-c, --clear", "Clear all history", false)
    .option("-l, --limit <n>", "Limit number of entries to show", "20")
    .action(async (options: { clear?: boolean; limit?: string }) => {
        if (options.clear) {
            await clearHistory();
            console.log();
            console.log(chalk.green("  ✓ History cleared"));
            console.log();
            return;
        }

        const limit = options.limit ? parseInt(options.limit, 10) : 20;
        const history = await loadHistory();

        console.log();
        console.log(
            chalk.bold(chalk.hex("#e8ff47")("  ◆ OSMIUM")) +
            chalk.gray(" · Check History")
        );
        console.log(chalk.dim("  ─".repeat(25)));
        console.log();

        if (history.length === 0) {
            console.log(chalk.dim("  No checks in history"));
            console.log();
            console.log(chalk.dim(`  Store: ${getStorePathForDisplay()}`));
            console.log();
            return;
        }

        console.log(chalk.dim(`  ${history.length} check(s) in history`));
        console.log();

        const display = history.slice(0, limit);

        for (let i = 0; i < display.length; i++) {
            const v = display[i];
            const num = chalk.dim(`${(i + 1).toString().padStart(3)}`);
            const risk = colorRiskBadge(v.riskLevel);
            const conf = chalk.dim(`${v.confidence}%`.padStart(4));
            const track = chalk.white(v.track.name);
            const artists = chalk.gray(`— ${v.track.artists.join(", ")}`);

            console.log(`  ${num} ${risk} ${conf}  ${track} ${artists}`);
        }

        if (history.length > limit) {
            console.log();
            console.log(chalk.dim(`  ... and ${history.length - limit} more`));
        }

        console.log();
        console.log(chalk.dim(`  Store: ${getStorePathForDisplay()}`));
        console.log();
    });

program
    .command("search")
    .description("Search for a track by name and interactively optionally check copyright")
    .argument("[query]", "Search query (e.g., 'blinding lights the weeknd')")
    .option("-o, --output <file>", "Write verdict JSON to file")
    .option("-v, --verbose", "Enable verbose output with detailed progress", false)
    .action(async (queryParam?: string, options?: { output?: string; verbose?: boolean }) => {
        const logger = new Logger(options?.verbose);

        let query = queryParam;
        if (!query) {
            const inquirer = await import("@inquirer/prompts");
            query = await inquirer.input({
                message: "Enter search query:",
                theme: {
                    prefix: chalk.hex("#e8ff47")("?"),
                }
            });
        }

        if (!query) {
            logger.error("No search query provided.");
            process.exit(1);
        }

        const spinner = ora({ text: "Searching Spotify...", color: "yellow" }).start();

        try {
            const config = getConfig();
            const token = await getSpotifyToken(config.spotify.clientId, config.spotify.clientSecret);
            const results = await searchTracks(query, token);
            spinner.stop();

            if (results.length === 0) {
                logger.error("No tracks found matching your query.");
                process.exit(1);
            }

            const inquirer = await import("@inquirer/prompts");
            const selectedTrackId = await inquirer.select({
                message: "Select a track to check:",
                choices: results.map((t) => ({
                    name: `${t.name} — ${t.artists.join(", ")} (${t.album})`,
                    value: t.id,
                })),
                pageSize: 15,
                theme: {
                    prefix: chalk.hex("#e8ff47")("?"),
                    style: {
                        highlight: (text: string) => chalk.hex("#e8ff47")(text),
                    }
                }
            });

            const trackUrl = `https://open.spotify.com/track/${selectedTrackId}`;
            await runCheck(trackUrl, {
                output: options?.output,
                verbose: options?.verbose ?? false,
            });
        } catch (error) {
            spinner.stop();
            logger.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

program.parse();
