# Media Forge

A desktop video library manager — NFO metadata editing, dedup, batch operations. Built with Electron + React + TypeScript.

## Features

### Video Scanning & Management

- **Directory scanning** — configure multiple directories, recursively scan for video files
- **Scan cache** — results persist across sessions, available instantly on next launch
- **18 video formats supported** — `.mp4`, `.mkv`, `.avi`, `.wmv`, `.mov`, `.webm`, `.flv`, `.f4v`, `.mpg`, `.mpeg`, `.m4v`, `.ts`, `.mts`, `.m2ts`, `.vob`, `.3gp`, `.ogv`, `.rmvb`, `.rm`
- **Multi-part grouping** — automatically groups `-cd1`/`-cd2`, `_part1`/`_part2`, `-disc1`/`-disc2` etc. into a single movie entry

### Video Metadata (via ffprobe)

- Displays video codec, resolution, duration, bitrate, frame rate, audio codec, audio channels, file size
- Codec tags with color-coded badges (H.264, HEVC, AV1, VP9, etc.)
- Metadata fetched in background batches

### NFO Metadata Editing (Kodi-compatible XML)

- **View / Create / Edit** NFO sidecar files for any video
- Editable fields: Title, Original Title, Year, Release Date, Plot, Outline, Tagline, Runtime, MPAA, User Rating, Genres, Directors, Studios, Countries, Tags, Actors (name + role), Trailer
- Auto-discovery of existing NFO files
- Automatic backup (`.nfo.bak`) before overwriting
- Preserves unhandled fields (ratings, unique IDs, poster/fanart URLs, credits, etc.)

### List & Grid Views

- **List view** — sortable table by filename, codec, resolution, duration, bitrate, size; expandable rows for multi-part groups; pagination (50/100/200/500)
- **Grid view** — poster cards with movie title and NFO badge; lazy poster loading with IntersectionObserver
- **Search** — filter by filename, NFO title, original title, actor names, studio names
- **NFO filter** — show all / has NFO / no NFO

### Context Menu

- Play video in system default player
- Open file in OS file manager
- Delete video folder (with confirmation)

### Settings

- Manage scan directories (add/remove)
- Language selection

### Multi-Language

- 中文 (Chinese)
- English
- 日本語 (Japanese)

### UI

- Dark theme (Ant Design dark mode)
- 1400×900 default window, 1000×600 minimum

## Tech Stack

- **Electron 39** + **electron-vite 5**
- **React 19** + **TypeScript 5.9**
- **Ant Design 6**
- **fast-xml-parser** — NFO XML read/write
- **ffprobe** (system-installed) — video metadata extraction

## Getting Started

### Prerequisites

- Node.js 20+
- ffprobe (optional, for video metadata)

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```
