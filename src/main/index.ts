import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, extname, basename } from 'path'
import { readFile, rm } from 'fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { scanDirectories } from './services/scanner'
import { getVideoMetadata, checkFfprobe } from './services/ffprobe'
import { readNfo, saveNfo, createEmptyNfo } from './services/nfo'
import { getSettings, saveSettings, addDirectory, removeDirectory } from './services/settings'
import { NfoData, AppSettings } from '../common/types'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// === Register IPC Handlers ===

function registerIpcHandlers(): void {
  // Scan all configured directories for video files (streams results incrementally)
  ipcMain.handle('scan-videos', async (event) => {
    const settings = getSettings()
    const sender = event.sender
    await scanDirectories(settings.directories, (file) => {
      sender.send('video-found', file)
    })
    sender.send('scan-complete')
  })

  // Get video metadata via ffprobe
  ipcMain.handle('get-video-metadata', async (_event, filePath: string) => {
    try {
      return await getVideoMetadata(filePath)
    } catch (err) {
      console.error('ffprobe error:', err)
      return null
    }
  })

  // Check if ffprobe is available
  ipcMain.handle('check-ffprobe', async () => {
    return checkFfprobe()
  })

  // Read NFO file
  ipcMain.handle('read-nfo', async (_event, nfoPath: string) => {
    try {
      return await readNfo(nfoPath)
    } catch (err) {
      console.error('Error reading NFO:', err)
      return null
    }
  })

  // Save NFO file
  ipcMain.handle(
    'save-nfo',
    async (_event, nfoPath: string, data: NfoData) => {
      try {
        await saveNfo(nfoPath, data)
        return { success: true }
      } catch (err) {
        console.error('Error saving NFO:', err)
        return { success: false, error: String(err) }
      }
    }
  )

  // Create empty NFO
  ipcMain.handle('create-empty-nfo', () => {
    return createEmptyNfo()
  })

  // Get NFO path for a video file (derive from video path)
  ipcMain.handle('get-nfo-path', (_event, videoPath: string, useBaseName?: string) => {
    const dir = join(videoPath, '..')
    const name = useBaseName || basename(videoPath, extname(videoPath))
    return join(dir, `${name}.nfo`)
  })

  // Scan cache
  const cacheFile = join(app.getPath('userData'), 'scan-cache.json')

  ipcMain.handle('load-scan-cache', () => {
    try {
      if (existsSync(cacheFile)) {
        const raw = readFileSync(cacheFile, 'utf-8')
        return JSON.parse(raw)
      }
    } catch {
      // corrupted cache
    }
    return null
  })

  ipcMain.handle('save-scan-cache', (_event, files: unknown[]) => {
    try {
      writeFileSync(cacheFile, JSON.stringify(files), 'utf-8')
    } catch (err) {
      console.error('Error saving scan cache:', err)
    }
  })

  // Settings
  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('save-settings', (_event, settings: AppSettings) => {
    saveSettings(settings)
    return { success: true }
  })

  ipcMain.handle('add-directory', (_event, dir: string) => {
    return addDirectory(dir)
  })

  ipcMain.handle('remove-directory', (_event, dir: string) => {
    return removeDirectory(dir)
  })

  // Shell operations
  ipcMain.handle('open-file', (_event, filePath: string) => {
    shell.openPath(filePath)
  })

  ipcMain.handle('show-in-folder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('delete-folder', async (_event, folderPath: string) => {
    try {
      await rm(folderPath, { recursive: true, force: true })
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Find poster image for a video directory
  ipcMain.handle('find-poster', async (_event, dirPath: string, baseName: string) => {
    const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']
    const candidates = [
      ...IMAGE_EXTS.map((ext) => `${baseName}-poster${ext}`),
      ...IMAGE_EXTS.map((ext) => `${baseName}${ext}`),
      ...IMAGE_EXTS.map((ext) => `poster${ext}`),
      ...IMAGE_EXTS.map((ext) => `folder${ext}`)
    ]

    for (const name of candidates) {
      const filePath = join(dirPath, name)
      if (existsSync(filePath)) {
        try {
          const buf = await readFile(filePath)
          const ext = extname(name).slice(1).toLowerCase()
          const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
          return `data:${mime};base64,${buf.toString('base64')}`
        } catch {
          continue
        }
      }
    }
    return null
  })

  // Open directory picker dialog
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}

// === App Lifecycle ===

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.movie-info')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
