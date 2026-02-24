/** Shared types between main and renderer processes */

export interface VideoFile {
  /** Full file path */
  path: string
  /** File name (with extension) */
  fileName: string
  /** Directory containing the video */
  dirPath: string
  /** File size in bytes */
  size: number
  /** Path to corresponding .nfo file (if exists) */
  nfoPath: string | null
  /** Video technical metadata from ffprobe */
  metadata?: VideoMetadata
  /** Base name without -cdN suffix and extension, used for grouping multi-part videos */
  baseName: string
  /** CD/part index (1, 2, 3...), 0 if not a multi-part file */
  cdIndex: number
}

export interface VideoMetadata {
  /** Video codec name, e.g. h264, hevc */
  videoCodec: string
  /** Video width in pixels */
  width: number
  /** Video height in pixels */
  height: number
  /** Duration in seconds */
  duration: number
  /** Overall bitrate in bits/sec */
  bitrate: number
  /** Frame rate string, e.g. "23.976" */
  frameRate: string
  /** Audio codec name, e.g. aac, ac3 */
  audioCodec: string
  /** Number of audio channels */
  audioChannels: number
}

export interface NfoActor {
  name: string
  role: string
  order?: number
  thumb?: string
}

export interface NfoRating {
  name: string
  value: number
  votes: number
  max: number
  default: boolean
}

export interface NfoData {
  title: string
  originaltitle: string
  sorttitle: string
  year: string
  premiered: string
  plot: string
  outline: string
  tagline: string
  runtime: string
  mpaa: string
  genres: string[]
  directors: string[]
  credits: string[]
  studios: string[]
  countries: string[]
  tags: string[]
  actors: NfoActor[]
  ratings: NfoRating[]
  userrating: string
  uniqueids: Record<string, string>
  /** Poster thumb URL */
  poster: string
  /** Fanart thumb URL */
  fanart: string
  /** Trailer URL */
  trailer: string
  /** Raw fields we don't explicitly handle — preserved on save */
  [key: string]: unknown
}

export interface AppSettings {
  /** List of directories to scan for videos */
  directories: string[]
  /** UI language */
  language?: 'zh' | 'en' | 'ja'
  /** Title column width in list view (pixels) */
  titleColumnWidth?: number
  /** Actors column width in list view (pixels) */
  actorsColumnWidth?: number
}

export const VIDEO_EXTENSIONS = [
  '.mp4',
  '.mkv',
  '.avi',
  '.wmv',
  '.mov',
  '.webm',
  '.flv',
  '.f4v',
  '.mpg',
  '.mpeg',
  '.m4v',
  '.ts',
  '.mts',
  '.m2ts',
  '.vob',
  '.3gp',
  '.ogv',
  '.rmvb',
  '.rm'
]

/** Statistics returned after a scan completes */
export interface ScanStats {
  /** Total scan time in milliseconds */
  elapsed: number
  /** Number of directories that required readdir (cache miss) */
  readdirCount: number
  /** Number of directories served from cache (cache hit) */
  cacheHits: number
  /** Total video files found */
  videoCount: number
  /** Total subdirectories traversed */
  dirCount: number
}
