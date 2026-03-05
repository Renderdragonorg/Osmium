import { searchASCAP } from "../services/registries/ascap.js";
import { searchBMI } from "../services/registries/bmi.js";
import { searchSESAC } from "../services/registries/sesac.js";
import { searchCopyrightOffice } from "../services/registries/copyright-office.js";
import type { RegistryResult } from "../types/index.js";

/**
 * Registry Lookup Agent — runs parallel searches across all PRO registries
 * and the US Copyright Office.
 *
 * Aggregates all results into a unified array and handles partial failures
 * gracefully (a single registry failure doesn't stop other lookups).
 */
export async function runRegistryLookup(
    title: string,
    writers: string[],
    artist?: string
): Promise<{
    results: RegistryResult[];
    errors: string[];
    sourcesChecked: string[];
}> {
    const errors: string[] = [];
    const sourcesChecked: string[] = [];
    const primaryWriter = writers[0];

    // Run all lookups in parallel
    const [ascapResults, bmiResults, sesacResults, copyrightResults] =
        await Promise.allSettled([
            searchASCAP(title, primaryWriter).then((r) => {
                sourcesChecked.push("ASCAP");
                return r;
            }),
            searchBMI(title, primaryWriter).then((r) => {
                sourcesChecked.push("BMI");
                return r;
            }),
            searchSESAC(title, primaryWriter).then((r) => {
                sourcesChecked.push("SESAC");
                return r;
            }),
            searchCopyrightOffice(title, artist).then((r) => {
                sourcesChecked.push("COPYRIGHT_OFFICE");
                return r;
            }),
        ]);

    const results: RegistryResult[] = [];

    // Collect results, log errors
    if (ascapResults.status === "fulfilled") {
        results.push(...ascapResults.value);
    } else {
        errors.push(`ASCAP: ${ascapResults.reason}`);
    }

    if (bmiResults.status === "fulfilled") {
        results.push(...bmiResults.value);
    } else {
        errors.push(`BMI: ${bmiResults.reason}`);
    }

    if (sesacResults.status === "fulfilled") {
        results.push(...sesacResults.value);
    } else {
        errors.push(`SESAC: ${sesacResults.reason}`);
    }

    if (copyrightResults.status === "fulfilled") {
        results.push(...copyrightResults.value);
    } else {
        errors.push(`Copyright Office: ${copyrightResults.reason}`);
    }

    return { results, errors, sourcesChecked };
}
