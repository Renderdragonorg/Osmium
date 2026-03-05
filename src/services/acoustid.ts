import { fetchJSON } from "../utils/http.js";
import type { AcoustIDResult } from "../types/index.js";

const ACOUSTID_API_BASE = "https://api.acoustid.org/v2";

interface AcoustIDResponse {
    status: string;
    results: AcoustIDResult[];
}

/**
 * Look up a track by its audio fingerprint using AcoustID.
 *
 * NOTE: Full fingerprinting requires the `fpcalc` binary installed locally.
 * This function wraps the API lookup assuming you already have
 * a fingerprint + duration. For preview-URL-based workflows,
 * the preview must be downloaded and fingerprinted externally.
 */
export async function lookupFingerprint(
    apiKey: string,
    fingerprint: string,
    duration: number
): Promise<AcoustIDResult[]> {
    const params = new URLSearchParams({
        client: apiKey,
        fingerprint,
        duration: Math.round(duration).toString(),
        meta: "recordings releasegroups",
    });

    const data = await fetchJSON<AcoustIDResponse>(
        `${ACOUSTID_API_BASE}/lookup?${params.toString()}`
    );

    if (data.status !== "ok") {
        throw new Error(`AcoustID lookup failed: status ${data.status}`);
    }

    return data.results ?? [];
}

/**
 * Look up a track by preview URL.
 * Downloads the preview and submits to AcoustID.
 *
 * NOTE: This is a simplified version. Full implementation would require
 * fpcalc to generate the fingerprint from the downloaded audio.
 * For now, this returns an empty result when fpcalc is unavailable.
 */
export async function lookupByPreviewUrl(
    apiKey: string,
    previewUrl: string
): Promise<AcoustIDResult[]> {
    // In a full implementation, this would:
    // 1. Download the preview MP3
    // 2. Run fpcalc on it: `fpcalc -json <file>`
    // 3. Extract { fingerprint, duration } from fpcalc output
    // 4. Call lookupFingerprint()

    // For now, we note that fpcalc is required for this step
    console.warn(
        "AcoustID lookup requires fpcalc binary. " +
        "Install Chromaprint: https://acoustid.org/chromaprint"
    );

    void apiKey;
    void previewUrl;

    return [];
}
