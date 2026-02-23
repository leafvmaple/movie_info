import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { AppSettings } from '../../common/types'

const configDir = app.getPath('userData')
const configFile = join(configDir, 'settings.json')

function readStore(): AppSettings {
  try {
    if (existsSync(configFile)) {
      const raw = readFileSync(configFile, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // corrupted file — return defaults
  }
  return { directories: [] }
}

function writeStore(settings: AppSettings): void {
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  writeFileSync(configFile, JSON.stringify(settings, null, 2), 'utf-8')
}

export function getSettings(): AppSettings {
  return readStore()
}

export function saveSettings(settings: AppSettings): void {
  writeStore(settings)
}

export function addDirectory(dir: string): AppSettings {
  const settings = readStore()
  if (!settings.directories.includes(dir)) {
    settings.directories.push(dir)
    writeStore(settings)
  }
  return settings
}

export function removeDirectory(dir: string): AppSettings {
  const settings = readStore()
  settings.directories = settings.directories.filter((d) => d !== dir)
  writeStore(settings)
  return settings
}
