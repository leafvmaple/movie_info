import { execFile } from 'child_process'
import { VideoMetadata } from '../../common/types'

/**
 * Get video metadata using ffprobe (must be installed on the system).
 */
export function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath
      ],
      { maxBuffer: 1024 * 1024 * 10 },
      (err, stdout) => {
        if (err) {
          return reject(new Error(`ffprobe failed: ${err.message}`))
        }

        try {
          const data = JSON.parse(stdout)
          const videoStream = data.streams?.find(
            (s: Record<string, unknown>) => s.codec_type === 'video'
          )
          const audioStream = data.streams?.find(
            (s: Record<string, unknown>) => s.codec_type === 'audio'
          )
          const format = data.format || {}

          const metadata: VideoMetadata = {
            videoCodec: videoStream?.codec_name || 'unknown',
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            duration: parseFloat(format.duration || videoStream?.duration || '0'),
            bitrate: parseInt(format.bit_rate || '0', 10),
            frameRate: parseFrameRate(videoStream?.r_frame_rate || '0/1'),
            audioCodec: audioStream?.codec_name || 'unknown',
            audioChannels: audioStream?.channels || 0
          }

          resolve(metadata)
        } catch (parseErr) {
          reject(new Error(`Failed to parse ffprobe output: ${parseErr}`))
        }
      }
    )
  })
}

/**
 * Parse frame rate from ffprobe rational format (e.g. "24000/1001" -> "23.976")
 */
function parseFrameRate(rational: string): string {
  const parts = rational.split('/')
  if (parts.length === 2) {
    const num = parseInt(parts[0], 10)
    const den = parseInt(parts[1], 10)
    if (den > 0) {
      return (num / den).toFixed(3)
    }
  }
  return rational
}

/**
 * Check if ffprobe is available on the system.
 */
export function checkFfprobe(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('ffprobe', ['-version'], (err) => {
      resolve(!err)
    })
  })
}
