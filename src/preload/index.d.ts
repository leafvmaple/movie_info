import { ElectronAPI } from '@electron-toolkit/preload'
import type { VideoFile, VideoMetadata, NfoData, AppSettings } from '../common/types'

interface CustomAPI {
  // Video scanning
  scanVideos: () => Promise<void>
  removeAllScanListeners: () => void
  onVideoFound: (callback: (file: VideoFile) => void) => () => void
  onScanComplete: (callback: () => void) => () => void
  getVideoMetadata: (filePath: string) => Promise<VideoMetadata | null>
  checkFfprobe: () => Promise<boolean>

  // NFO operations
  readNfo: (nfoPath: string) => Promise<NfoData | null>
  saveNfo: (nfoPath: string, data: NfoData) => Promise<{ success: boolean; error?: string }>
  createEmptyNfo: () => Promise<NfoData>
  getNfoPath: (videoPath: string, baseName?: string) => Promise<string>

  // Scan cache
  loadScanCache: () => Promise<VideoFile[] | null>
  saveScanCache: (files: VideoFile[]) => Promise<void>

  // Settings
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean }>
  addDirectory: (dir: string) => Promise<AppSettings>
  removeDirectory: (dir: string) => Promise<AppSettings>
  selectDirectory: () => Promise<string | null>

  // Poster
  findPoster: (dirPath: string, baseName: string) => Promise<string | null>

  // Shell operations
  openFile: (filePath: string) => Promise<void>
  showInFolder: (filePath: string) => Promise<void>
  deleteFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
