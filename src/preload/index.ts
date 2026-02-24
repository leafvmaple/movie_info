import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { NfoData, AppSettings } from '../common/types'

// Custom APIs for renderer
const api = {
  // Video scanning
  scanVideos: (): Promise<void> => ipcRenderer.invoke('scan-videos'),
  removeAllScanListeners: (): void => {
    ipcRenderer.removeAllListeners('video-found')
    ipcRenderer.removeAllListeners('scan-complete')
  },
  onVideoFound: (callback: (file: unknown) => void): (() => void) => {
    const handler = (_event: unknown, file: unknown): void => callback(file)
    ipcRenderer.on('video-found', handler)
    return () => ipcRenderer.removeListener('video-found', handler)
  },
  onScanComplete: (callback: (stats?: unknown) => void): (() => void) => {
    const handler = (_event: unknown, stats?: unknown): void => callback(stats)
    ipcRenderer.on('scan-complete', handler)
    return () => ipcRenderer.removeListener('scan-complete', handler)
  },
  getFileSizes: (paths: string[]): Promise<{ path: string; size: number }[]> =>
    ipcRenderer.invoke('get-file-sizes', paths),
  getVideoMetadata: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke('get-video-metadata', filePath),
  checkFfprobe: (): Promise<boolean> => ipcRenderer.invoke('check-ffprobe'),

  // NFO operations
  readNfo: (nfoPath: string): Promise<unknown> => ipcRenderer.invoke('read-nfo', nfoPath),
  saveNfo: (nfoPath: string, data: NfoData): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-nfo', nfoPath, data),
  createEmptyNfo: (): Promise<NfoData> => ipcRenderer.invoke('create-empty-nfo'),
  getNfoPath: (videoPath: string, baseName?: string): Promise<string> =>
    ipcRenderer.invoke('get-nfo-path', videoPath, baseName),

  // Scan cache
  loadScanCache: (): Promise<unknown[] | null> => ipcRenderer.invoke('load-scan-cache'),
  saveScanCache: (files: unknown[]): Promise<void> => ipcRenderer.invoke('save-scan-cache', files),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-settings', settings),
  addDirectory: (dir: string): Promise<AppSettings> => ipcRenderer.invoke('add-directory', dir),
  removeDirectory: (dir: string): Promise<AppSettings> =>
    ipcRenderer.invoke('remove-directory', dir),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),

  // Poster
  findPoster: (dirPath: string, baseName: string): Promise<string | null> =>
    ipcRenderer.invoke('find-poster', dirPath, baseName),

  // App info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  // Shell operations
  openFile: (filePath: string): Promise<void> => ipcRenderer.invoke('open-file', filePath),
  showInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke('show-in-folder', filePath),
  deleteFolder: (folderPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('delete-folder', folderPath)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
