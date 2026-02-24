import { readdir, stat } from 'fs/promises'
import { execFileSync } from 'child_process'
import { join, extname, basename } from 'path'
import { VIDEO_EXTENSIONS, VideoFile } from '../../common/types'

/**
 * Cache of drive letter → UNC path mappings (e.g. "Z:" → "\\\\10.0.0.1\\movie").
 * Built once per app session via `net use`.
 */
let driveMapCache: Map<string, string> | null = null

/**
 * Build a map of mapped network drives on Windows.
 * Returns empty map on non-Windows or if `net use` fails.
 */
function buildDriveMap(): Map<string, string> {
  if (driveMapCache) return driveMapCache
  driveMapCache = new Map()
  if (process.platform !== 'win32') return driveMapCache

  try {
    const output = execFileSync('net', ['use'], { encoding: 'utf-8', timeout: 5000 })
    // Each line: "Status  Local  Remote  Network"
    // e.g.      "OK     Z:     \\10.0.0.10\movie  Microsoft Windows Network"
    const regex = /\s+([A-Z]:)\s+(\\\\[^\s]+)/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(output)) !== null) {
      driveMapCache.set(match[1].toUpperCase(), match[2])
    }
  } catch {
    // net use not available or timed out — ignore
  }
  return driveMapCache
}

/**
 * Replace a mapped drive letter prefix with its UNC path.
 * e.g. "Z:\\movies\\foo.mp4" → "\\\\10.0.0.10\\movie\\movies\\foo.mp4"
 * Returns original path if no mapping found or not Windows.
 */
export function resolveUncPath(filePath: string): string {
  if (process.platform !== 'win32') return filePath
  const drive = filePath.slice(0, 2).toUpperCase() // "Z:"
  if (!/^[A-Z]:$/.test(drive)) return filePath

  const map = buildDriveMap()
  const unc = map.get(drive)
  if (!unc) return filePath
  return unc + filePath.slice(2) // replace "Z:" with UNC prefix
}

/**
 * Regex to match multi-part suffixes like -cd1, -cd2, _cd1, .cd1, -part1, -disc1, etc.
 * Requires an explicit separator (-, _, space, or .) before the keyword.
 * Case-insensitive.
 */
const CD_PATTERN = /[-_ .](cd|disc|disk|part)(\d+)$/i

/**
 * Parse a video filename to extract the base name and CD index.
 */
function parseCdInfo(fileName: string): { baseName: string; cdIndex: number } {
  const nameWithoutExt = basename(fileName, extname(fileName))
  const match = nameWithoutExt.match(CD_PATTERN)
  if (match) {
    const baseName = nameWithoutExt.slice(0, match.index!)
    const cdIndex = parseInt(match[2], 10)
    return { baseName, cdIndex }
  }
  return { baseName: nameWithoutExt, cdIndex: 0 }
}

/**
 * Callback invoked each time a video file is found during scanning.
 */
export type OnVideoFound = (file: VideoFile) => void

/**
 * Recursively scan a directory for video files.
 * Uses cached readdir + parallel stat to minimize network round-trips.
 */
export async function scanDirectory(dir: string, onFound: OnVideoFound): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    // Build a set of all filenames in this directory for fast NFO lookup
    const fileNamesInDir = new Set(
      entries.filter((e) => !e.isDirectory()).map((e) => e.name.toLowerCase())
    )

    // Separate subdirs and video files
    const subdirs: string[] = []
    const videoEntries: { entry: typeof entries[0]; fullPath: string }[] = []

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        subdirs.push(fullPath)
      } else if (VIDEO_EXTENSIONS.includes(extname(entry.name).toLowerCase())) {
        videoEntries.push({ entry, fullPath })
      }
    }

    // Process video files in parallel (stat calls are the bottleneck on remote)
    if (videoEntries.length > 0) {
      const PARALLEL = 20
      for (let i = 0; i < videoEntries.length; i += PARALLEL) {
        const batch = videoEntries.slice(i, i + PARALLEL)
        const results = await Promise.allSettled(
          batch.map(async ({ entry, fullPath }) => {
            const fileStat = await stat(fullPath)
            const { baseName, cdIndex } = parseCdInfo(entry.name)
            const nfoPath = findNfoFileFromCache(dir, baseName, entry.name, fileNamesInDir)
            return {
              path: fullPath,
              fileName: entry.name,
              dirPath: dir,
              size: fileStat.size,
              nfoPath,
              baseName,
              cdIndex
            } as VideoFile
          })
        )
        for (const r of results) {
          if (r.status === 'fulfilled') onFound(r.value)
        }
      }
    }

    // Recurse into subdirectories (parallel for remote performance)
    if (subdirs.length > 0) {
      const DIR_PARALLEL = 8
      for (let i = 0; i < subdirs.length; i += DIR_PARALLEL) {
        const batch = subdirs.slice(i, i + DIR_PARALLEL)
        await Promise.allSettled(batch.map((d) => scanDirectory(d, onFound)))
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dir}:`, err)
  }
}

/**
 * Scan multiple directories for video files.
 * Resolves mapped drive letters to UNC paths on Windows.
 */
export async function scanDirectories(dirs: string[], onFound: OnVideoFound): Promise<void> {
  // Reset drive map cache so it's rebuilt fresh each scan
  driveMapCache = null
  const resolved = dirs.map((d) => resolveUncPath(d))
  await Promise.allSettled(resolved.map((dir) => scanDirectory(dir, onFound)))
}

/**
 * Find NFO file using the cached directory listing (zero extra I/O).
 * Checks: <baseName>.nfo → <videoName>.nfo → movie.nfo
 */
function findNfoFileFromCache(
  dir: string,
  baseName: string,
  videoFileName: string,
  fileNamesInDir: Set<string>
): string | null {
  const videoName = basename(videoFileName, extname(videoFileName))

  // Try base name NFO first (handles multi-part: xxx.nfo for xxx-cd1.mkv)
  const baseNfo = `${baseName}.nfo`.toLowerCase()
  if (fileNamesInDir.has(baseNfo)) {
    return join(dir, `${baseName}.nfo`)
  }

  // Fall back to exact video name NFO (only if different from base)
  if (videoName !== baseName) {
    const exactNfo = `${videoName}.nfo`.toLowerCase()
    if (fileNamesInDir.has(exactNfo)) {
      return join(dir, `${videoName}.nfo`)
    }
  }

  // Fall back to movie.nfo
  if (fileNamesInDir.has('movie.nfo')) {
    return join(dir, 'movie.nfo')
  }

  return null
}
