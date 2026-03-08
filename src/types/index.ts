// ──────────────────────────────────────────────
//  Spotify Types
// ──────────────────────────────────────────────

export interface SpotifyToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    expiresAt: number;
}

export interface SpotifyUserToken extends SpotifyToken {
    refresh_token: string;
    scope: string;
}

export interface SpotifyCopyright {
    text: string;
    type: "C" | "P"; // C = ©, P = ℗
}

export interface SpotifyArtist {
    id: string;
    name: string;
    uri: string;
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    label: string;
    release_date: string;
    copyrights: SpotifyCopyright[];
    artists: SpotifyArtist[];
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    external_ids: { isrc?: string; ean?: string; upc?: string };
    preview_url: string | null;
    uri: string;
    duration_ms: number;
}

// ──────────────────────────────────────────────
//  Credits Types
// ──────────────────────────────────────────────

export interface CreditEntry {
    name: string;
    role: string;
    subroles?: string[];
}

export interface ParsedCredits {
    writers: CreditEntry[];
    producers: CreditEntry[];
    publishers: string[];
    proAffiliations: string[];
    rawCredits?: unknown;
}

// ──────────────────────────────────────────────
//  Registry Types
// ──────────────────────────────────────────────

export interface RegistryWriter {
    name: string;
    role?: string;
    sharePercentage?: number;
    ipiNumber?: string;
}

export interface RegistryResult {
    source: "ASCAP" | "BMI" | "SESAC" | "COPYRIGHT_OFFICE" | "OTHER";
    workTitle: string;
    workId?: string;
    writers: RegistryWriter[];
    publishers: string[];
    iswc?: string;
    registrationDate?: string;
    status?: string;
}

// ──────────────────────────────────────────────
//  MusicBrainz Types
// ──────────────────────────────────────────────

export interface MusicBrainzRelease {
    id: string;
    title: string;
    date?: string;
    country?: string;
    labelInfo?: Array<{
        catalogNumber?: string;
        label?: { id: string; name: string };
    }>;
}

export interface MusicBrainzRecording {
    id: string;
    title: string;
    artistCredit?: Array<{ name: string; artist: { id: string; name: string } }>;
    releases?: MusicBrainzRelease[];
}

export interface MusicBrainzResult {
    recordings: MusicBrainzRecording[];
    isrc: string;
    label?: string;
    mbid?: string;
}

// ──────────────────────────────────────────────
//  Audio Fingerprint Types
// ──────────────────────────────────────────────

export interface AcoustIDResult {
    id: string;
    score: number;
    recordings?: Array<{
        id: string;
        title: string;
        artists?: Array<{ id: string; name: string }>;
    }>;
}

export interface FingerprintResult {
    acoustid?: AcoustIDResult;
    matchConfidence: number;
    alternateRegistrations?: string[];
}

// ──────────────────────────────────────────────
//  Discogs Types
// ──────────────────────────────────────────────

export interface DiscogsRelease {
    id: number;
    title: string;
    year?: number;
    labels?: Array<{ id: number; name: string; catno: string }>;
    artists?: Array<{ id: number; name: string }>;
    formats?: Array<{ name: string; descriptions?: string[] }>;
}

export interface DiscogsResult {
    releases: DiscogsRelease[];
    label?: string;
    catalogNumber?: string;
}

// ──────────────────────────────────────────────
//  Sample Detection Types
// ──────────────────────────────────────────────

export interface SampleInfo {
    originalTrack: string;
    originalArtist: string;
    sampleType: "sample" | "interpolation" | "cover" | "remix";
    year?: number;
    cleared?: boolean;
}

// ──────────────────────────────────────────────
//  AI Summary Types
// ──────────────────────────────────────────────

export interface WebSearchSource {
    title: string;
    url: string;
    snippet: string;
}

export interface AISummary {
    isCopyrighted: "yes" | "no" | "unclear";
    requiresLicense: "yes" | "no" | "depends";
    masterRightsHolder: string;
    labelType: "major" | "indie" | "self-released" | "unknown";
    labelInfo: string;
    licensingVerdict: string;
    licensingUrl?: string;
    explanation: string;
    actionableSteps: string[];
    webSearchSources: WebSearchSource[];
}

// ──────────────────────────────────────────────
//  Copyright Verdict (Final Output)
// ──────────────────────────────────────────────

export interface RightsHolder {
    name: string;
    role: string;
    source: string;
}

export interface CopyrightVerdict {
    track: {
        name: string;
        artists: string[];
        isrc: string;
        spotifyId: string;
        releaseDate: string;
        duration: number;
    };
    masterRights: {
        holder: string;
        label: string;
        confirmed: boolean;
        sources: string[];
    };
    compositionRights: {
        writers: RightsHolder[];
        publishers: string[];
        proRegistrations: Array<{
            pro: string;
            workId?: string;
            status: string;
        }>;
    };
    samples: {
        detected: boolean;
        details: SampleInfo[];
        riskLevel: "none" | "low" | "medium" | "high";
    };
    copyrightType:
    | "original"
    | "cover"
    | "sample"
    | "interpolation"
    | "remix"
    | "public_domain"
    | "unknown";
    riskLevel: "low" | "medium" | "high" | "critical";
    confidence: number; // 0-100
    licensingPath: string;
    discrepancies: string[];
    dataSources: string[];
    aiSummary?: AISummary;
    generatedAt: string;
}

// ──────────────────────────────────────────────
//  Pipeline Types
// ──────────────────────────────────────────────

export type PipelineStepName =
    | "track-resolution"
    | "credits-parsing"
    | "registry-lookup"
    | "musicbrainz-lookup"
    | "fingerprint-check"
    | "sample-detection"
    | "ai-synthesis"
    | "risk-assessment"
    | "ai-summary";

export type PipelineStepStatus =
    | "pending"
    | "in_progress"
    | "completed"
    | "failed"
    | "skipped";

export interface PipelineEvent {
    step: number;
    name: PipelineStepName;
    status: PipelineStepStatus;
    message?: string;
    data?: unknown;
    error?: string;
}

export interface PipelineConfig {
    verbose: boolean;
    outputFile?: string;
}

// ──────────────────────────────────────────────
//  Config Types
// ──────────────────────────────────────────────

export interface AppConfig {
    spotify: {
        clientId: string;
        clientSecret: string;
    };
    nocodeSpotify: {
        cloudName: string;
        token: string;
    };
    openrouter: {
        apiKey: string;
        model: string;
        baseURL: string;
        defaultHeaders: Record<string, string>;
    };
    groq?: {
        apiKey: string;
        model: string;
        baseURL: string;
    };
    acoustid: {
        apiKey?: string;
    };
    discogs: {
        token?: string;
    };
    tavily: {
        apiKey?: string;
    };
}
