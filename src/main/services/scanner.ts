import { readdir, stat, access } from 'fs/promises'
import { join, extname, basename } from 'path'
import { VIDEO_EXTENSIONS, VideoFile } from '../../common/types'

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
 * Calls onFound for each video file discovered.
 */
export async function scanDirectory(dir: string, onFound: OnVideoFound): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, onFound)
      } else if (VIDEO_EXTENSIONS.includes(extname(entry.name).toLowerCase())) {
        const fileStat = await stat(fullPath)
        const { baseName, cdIndex } = parseCdInfo(entry.name)
        const nfoPath = await findNfoFile(fullPath, baseName)

        onFound({
          path: fullPath,
          fileName: entry.name,
          dirPath: dir,
          size: fileStat.size,
          nfoPath,
          baseName,
          cdIndex
        })
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dir}:`, err)
  }
}

/**
 * Scan multiple directories for video files.
 * Calls onFound for each video file discovered.
 */
export async function scanDirectories(dirs: string[], onFound: OnVideoFound): Promise<void> {
  for (const dir of dirs) {
    await scanDirectory(dir, onFound)
  }
}

/**
 * Find the corresponding .nfo file for a video file.
 * Checks for <baseName>.nfo first (for multi-part grouping), then <videoname>.nfo.
 */
async function findNfoFile(videoPath: string, baseName: string): Promise<string | null> {
  const dir = join(videoPath, '..')
  const videoName = basename(videoPath, extname(videoPath))

  // Try base name NFO first (handles multi-part: xxx.nfo for xxx-cd1.mkv)
  const baseNfoPath = join(dir, `${baseName}.nfo`)
  try {
    await access(baseNfoPath)
    return baseNfoPath
  } catch {
    // not found
  }

  // Fall back to exact video name NFO (only if different from base)
  if (videoName !== baseName) {
    const exactNfoPath = join(dir, `${videoName}.nfo`)
    try {
      await access(exactNfoPath)
      return exactNfoPath
    } catch {
      // not found
    }
  }

  // Fall back to movie.nfo (common output from scraping tools)
  const movieNfoPath = join(dir, 'movie.nfo')
  try {
    await access(movieNfoPath)
    return movieNfoPath
  } catch {
    // not found
  }

  return null
}
