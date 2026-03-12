# Osmium Desktop

**Osmium** is a music copyright checker by Renderdragon. A native desktop app that orchestrates a sophisticated multi-agent AI pipeline to resolve track ownership and licensing requirements.

---

## Features

- **Native Desktop App**: Modern Electron app for Windows, macOS, and Linux
- **Spotify Integration**: Search tracks directly or paste Spotify URLs/IDs
- **AI-Powered Analysis**: Multi-agent pipeline synthesizes data from multiple sources
- **Real-Time Progress**: Watch each pipeline step as it runs
- **Risk Assessment**: Clear confidence scores and risk levels (LOW, MEDIUM, HIGH, CRITICAL)
- **Licensing Guidance**: AI-generated summary with actionable steps to obtain licenses
- **Check History**: Sidebar keeps track of all your previous checks

---

## Data Sources

Osmium consults multiple authoritative sources:

- **Spotify**: Track metadata, ISRCs, labels, and album copyrights
- **PRO Registries**: ASCAP, BMI, SESAC for composition rights
- **US Copyright Office**: Official copyright registrations
- **MusicBrainz & Discogs**: Cross-referenced label and release data
- **AcoustID**: Audio fingerprinting for alternate registrations
- **Sample Databases**: Detection of samples, interpolations, and covers

---

## The Pipeline

When you check a track, Osmium runs a 9-step orchestrated pipeline:

1. **Track Resolution**: Fetches base metadata and ISRC from Spotify
2. **Credits Parsing**: Scrapes and parses artist, writer, and producer credits
3. **Registry Lookup**: Queries ASCAP, BMI, SESAC, and US Copyright Office
4. **MusicBrainz**: Resolves label data via ISRC
5. **Fingerprint Check**: Looks up audio duplicates via AcoustID
6. **Sample Detection**: Queries for samples and cover metadata
7. **AI Synthesis**: Resolves conflicting data across sources
8. **Risk Assessment**: Classifies usage risk and calculates data confidence
9. **AI Summary**: Generates licensing verdict with actionable steps

---

## Installation

Download the latest release for your platform:

- **Windows**: `.exe` installer or portable `.exe`
- **macOS**: `.dmg`
- **Linux**: `.AppImage` or `.deb`

Releases are available on the [GitHub Releases](https://github.com/Renderdragonorg/Osmium/releases) page.

---

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Renderdragonorg/Osmium.git
cd Osmium

# Install CLI dependencies (required for desktop app)
npm ci
npm run build

# Install desktop app dependencies
cd desktop-app
npm ci
```

### Run in Development

```bash
cd desktop-app
npm run dev
```

### Build for Production

```bash
cd desktop-app
npm run make
```

Outputs will be in `desktop-app/dist/`.

---

## License

MIT
