/**
 * Parse a Spotify track input (URL, URI, or bare ID) and extract the track ID.
 *
 * Supported formats:
 *  - https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b
 *  - https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b?si=...
 *  - spotify:track:0VjIjW4GlUZAMYd2vXMi3b
 *  - 0VjIjW4GlUZAMYd2vXMi3b  (bare 22-char base62 ID)
 */
export function parseTrackInput(input: string): string {
    const trimmed = input.trim();

    // Spotify URL: https://open.spotify.com/track/{id}
    const urlMatch = trimmed.match(
        /https?:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/
    );
    if (urlMatch) return urlMatch[1];

    // Spotify URI: spotify:track:{id}
    const uriMatch = trimmed.match(/^spotify:track:([A-Za-z0-9]{22})$/);
    if (uriMatch) return uriMatch[1];

    // Bare track ID (22 base-62 chars)
    if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;

    throw new Error(
        `Invalid Spotify track input: "${trimmed}"\n` +
        `Supported formats:\n` +
        `  • Spotify URL:  https://open.spotify.com/track/<id>\n` +
        `  • Spotify URI:  spotify:track:<id>\n` +
        `  • Bare ID:      <22-character base-62 ID>`
    );
}

/**
 * Validate ISRC format: 2-char country + 3-char registrant + 7-digit designation.
 * Example: USRC17607839
 */
export function isValidISRC(isrc: string): boolean {
    return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc);
}

/**
 * Validate Spotify base-62 ID (22 characters).
 */
export function isValidSpotifyId(id: string): boolean {
    return /^[A-Za-z0-9]{22}$/.test(id);
}

/**
 * Parse a Spotify playlist input (URL, URI, or bare ID) and extract the playlist ID.
 *
 * Supported formats:
 *  - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *  - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
 *  - spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 *  - 37i9dQZF1DXcBWIGoYBM5M  (bare 22-char base62 ID)
 */
export function parsePlaylistInput(input: string): string {
    const trimmed = input.trim();

    // Spotify URL: https://open.spotify.com/playlist/{id}
    const urlMatch = trimmed.match(
        /https?:\/\/open\.spotify\.com\/playlist\/([A-Za-z0-9]{22})/
    );
    if (urlMatch) return urlMatch[1];

    // Spotify URI: spotify:playlist:{id}
    const uriMatch = trimmed.match(/^spotify:playlist:([A-Za-z0-9]{22})$/);
    if (uriMatch) return uriMatch[1];

    // Bare playlist ID (22 base-62 chars)
    if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;

    throw new Error(
        `Invalid Spotify playlist input: "${trimmed}"\n` +
        `Supported formats:\n` +
        `  • Spotify URL:  https://open.spotify.com/playlist/<id>\n` +
        `  • Spotify URI:  spotify:playlist:<id>\n` +
        `  • Bare ID:      <22-character base-62 ID>`
    );
}
