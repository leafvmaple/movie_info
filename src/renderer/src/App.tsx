import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Layout, Button, message, ConfigProvider, theme, Segmented, Typography } from 'antd'
import {
  ReloadOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import VideoList from './components/VideoList'
import PropertyPanel from './components/PropertyPanel'
import SettingsPanel from './components/SettingsModal'
import { I18nProvider, createT } from './i18n'
import type { Language } from './i18n'
import type { VideoFile, VideoMetadata, NfoData } from '../../common/types'

const { Header, Content } = Layout
const { Title, Paragraph } = Typography

export interface VideoFileWithMeta extends VideoFile {
  metadata?: VideoMetadata
}

/** A group of video files that represent the same movie (e.g. xxx-cd1, xxx-cd2) */
export interface VideoGroup {
  /** Unique key: baseName + dirPath */
  key: string
  /** Display name (baseName) */
  displayName: string
  /** Directory */
  dirPath: string
  /** All parts sorted by cdIndex */
  parts: VideoFileWithMeta[]
  /** Total size of all parts */
  totalSize: number
  /** Total duration of all parts */
  totalDuration: number
  /** Number of CDs/parts (1 = single file) */
  partCount: number
  /** NFO path (from first part that has one) */
  nfoPath: string | null
  /** Metadata from the first part (for codec/resolution display) */
  metadata?: VideoMetadata
  /** Primary file path (cd1 or single file) — used for NFO operations */
  primaryPath: string
  /** Primary baseName */
  baseName: string
}

/**
 * Group raw video files into VideoGroups by baseName+dirPath.
 */
function groupVideos(files: VideoFileWithMeta[]): VideoGroup[] {
  const map = new Map<string, VideoFileWithMeta[]>()

  for (const file of files) {
    const key = `${file.dirPath}|||${file.baseName}`
    const list = map.get(key)
    if (list) {
      list.push(file)
    } else {
      map.set(key, [file])
    }
  }

  const groups: VideoGroup[] = []
  for (const [key, parts] of map) {
    // Sort parts by cdIndex (0 = no suffix, treated as cd1)
    parts.sort((a, b) => (a.cdIndex || 0) - (b.cdIndex || 0))
    const primary = parts[0]
    const nfoPath = parts.find((p) => p.nfoPath)?.nfoPath || null

    groups.push({
      key,
      displayName: primary.baseName,
      dirPath: primary.dirPath,
      parts,
      totalSize: parts.reduce((sum, p) => sum + p.size, 0),
      totalDuration: parts.reduce((sum, p) => sum + (p.metadata?.duration || 0), 0),
      partCount: parts.length,
      nfoPath,
      metadata: primary.metadata,
      primaryPath: primary.path,
      baseName: primary.baseName
    })
  }

  groups.sort((a, b) => a.displayName.localeCompare(b.displayName))

  return groups
}

function App(): React.JSX.Element {
  const [rawFiles, setRawFiles] = useState<VideoFileWithMeta[]>([])
  const [selectedGroup, setSelectedGroup] = useState<VideoGroup | null>(null)
  const [nfoData, setNfoData] = useState<NfoData | null>(null)
  const [nfoMap, setNfoMap] = useState<Map<string, NfoData>>(new Map())
  const [activeTab, setActiveTab] = useState<'list' | 'settings' | 'about'>('list')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [nfoLoading, setNfoLoading] = useState(false)
  const [ffprobeAvailable, setFfprobeAvailable] = useState(true)
  const [language, setLanguage] = useState<Language>('zh')

  const t = useMemo(() => createT(language), [language])

  // Grouped videos — memoized from raw file list
  const videoGroups = useMemo(() => groupVideos(rawFiles), [rawFiles])

  // Load language from settings on mount
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      if (settings.language) {
        setLanguage(settings.language)
      }
    })
  }, [])

  // Check ffprobe availability on mount
  useEffect(() => {
    window.api.checkFfprobe().then((available) => {
      setFfprobeAvailable(available)
      if (!available) {
        message.warning(t('ffprobeNotFound'), 5)
      }
    })
  }, [])

  // Generation counter for cancelling stale scans
  const scanGenRef = useRef(0)

  // Scan videos — streams results incrementally so users see files as they are found
  const handleScan = useCallback(async () => {
    // Increment generation to cancel any in-progress scan
    const gen = ++scanGenRef.current

    setLoading(true)
    setSelectedGroup(null)
    setNfoData(null)
    setRawFiles([])
    setNfoMap(new Map())
    setLoadingStatus('')

    // Remove any stale listeners from a previous interrupted scan
    window.api.removeAllScanListeners()

    // Collect files as they stream in, dedup by path
    const collectedFiles: VideoFileWithMeta[] = []
    const seenPaths = new Set<string>()
    let updateTimer: ReturnType<typeof setTimeout> | null = null

    const removeFoundListener = window.api.onVideoFound((file: VideoFile) => {
      if (scanGenRef.current !== gen) return
      if (seenPaths.has(file.path)) return
      seenPaths.add(file.path)
      collectedFiles.push(file)
      // Throttle UI updates — batch every 200ms instead of per-file
      if (!updateTimer) {
        updateTimer = setTimeout(() => {
          updateTimer = null
          if (scanGenRef.current !== gen) return
          setRawFiles([...collectedFiles])
        }, 200)
      }
    })

    // Wait for scan completion or cancellation (gen change)
    let pollInterval: ReturnType<typeof setInterval> | null = null
    await new Promise<void>((resolve) => {
      const removeComplete = window.api.onScanComplete(() => {
        removeComplete()
        if (pollInterval) clearInterval(pollInterval)
        resolve()
      })

      window.api.scanVideos()

      // Poll to also resolve if scan was superseded by a newer one
      pollInterval = setInterval(() => {
        if (scanGenRef.current !== gen) {
          clearInterval(pollInterval!)
          pollInterval = null
          removeComplete()
          resolve()
        }
      }, 200)
    })

    removeFoundListener()
    if (updateTimer) clearTimeout(updateTimer)

    // Bail out if this scan was superseded
    if (scanGenRef.current !== gen) return

    setRawFiles([...collectedFiles])

    if (collectedFiles.length === 0) {
      message.info(t('noVideosFound'))
      setLoading(false)
      return
    }

    setLoading(false)

    // Fetch metadata in background (non-blocking) if ffprobe is available
    if (ffprobeAvailable) {
      setLoadingStatus('metadata')
      const BATCH_SIZE = 10
      for (let i = 0; i < collectedFiles.length; i += BATCH_SIZE) {
        if (scanGenRef.current !== gen) return
        const batch = collectedFiles.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(
          batch.map((f) => window.api.getVideoMetadata(f.path))
        )

        if (scanGenRef.current !== gen) return
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            collectedFiles[i + idx] = {
              ...collectedFiles[i + idx],
              metadata: result.value as VideoMetadata
            }
          }
        })

        setRawFiles([...collectedFiles])
      }
    }

    if (scanGenRef.current !== gen) return

    // Batch-load all NFO data for search (in background)
    setLoadingStatus('nfo')
    const finalGroups = groupVideos(collectedFiles)
    const map = new Map<string, NfoData>()
    const NFO_BATCH = 20
    const groupsWithNfo = finalGroups.filter((g) => g.nfoPath)
    for (let i = 0; i < groupsWithNfo.length; i += NFO_BATCH) {
      if (scanGenRef.current !== gen) return
      const batch = groupsWithNfo.slice(i, i + NFO_BATCH)
      const results = await Promise.allSettled(
        batch.map((g) => window.api.readNfo(g.nfoPath!))
      )
      if (scanGenRef.current !== gen) return
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          map.set(batch[idx].key, result.value as NfoData)
        }
      })
    }

    if (scanGenRef.current !== gen) return
    setNfoMap(map)
    setLoadingStatus('')

    // Save scan results to cache for next launch
    window.api.saveScanCache(collectedFiles)
  }, [ffprobeAvailable, t])

  // Load cached scan results on mount, or show empty state
  useEffect(() => {
    window.api.loadScanCache().then(async (cached) => {
      if (cached && cached.length > 0) {
        const files = cached as VideoFileWithMeta[]
        setRawFiles(files)

        // Batch-load NFO data for search
        const groups = groupVideos(files)
        const map = new Map<string, NfoData>()
        const groupsWithNfo = groups.filter((g) => g.nfoPath)
        const NFO_BATCH = 20
        for (let i = 0; i < groupsWithNfo.length; i += NFO_BATCH) {
          const batch = groupsWithNfo.slice(i, i + NFO_BATCH)
          const results = await Promise.allSettled(
            batch.map((g) => window.api.readNfo(g.nfoPath!))
          )
          results.forEach((result, idx) => {
            if (result.status === 'fulfilled' && result.value) {
              map.set(batch[idx].key, result.value as NfoData)
            }
          })
        }
        setNfoMap(map)
      }
    })
  }, [])

  // Handle group selection — load NFO for the group
  const handleSelectGroup = useCallback(async (group: VideoGroup) => {
    setSelectedGroup(group)
    setNfoLoading(true)

    try {
      if (group.nfoPath) {
        const data = await window.api.readNfo(group.nfoPath)
        setNfoData(data as NfoData | null)
      } else {
        const emptyNfo = await window.api.createEmptyNfo()
        setNfoData(emptyNfo)
      }
    } catch (err) {
      message.error(t('nfoReadError') + String(err))
      setNfoData(null)
    } finally {
      setNfoLoading(false)
    }
  }, [])

  // Handle NFO save — uses baseName for the NFO path
  const handleSaveNfo = useCallback(
    async (data: NfoData) => {
      if (!selectedGroup) return

      try {
        // Use group's existing nfoPath, or derive from baseName
        const nfoPath =
          selectedGroup.nfoPath ||
          (await window.api.getNfoPath(
            selectedGroup.primaryPath,
            selectedGroup.partCount > 1 ? selectedGroup.baseName : undefined
          ))
        const result = await window.api.saveNfo(nfoPath, data)

        if (result.success) {
          message.success(t('nfoSaveSuccess'))

          // Update nfoPath for all parts in the group if it was newly created
          if (!selectedGroup.nfoPath) {
            setRawFiles((prev) =>
              prev.map((v) =>
                v.baseName === selectedGroup.baseName && v.dirPath === selectedGroup.dirPath
                  ? { ...v, nfoPath }
                  : v
              )
            )
            setSelectedGroup((prev) => (prev ? { ...prev, nfoPath } : prev))
          }

          // Update nfoMap with saved data
          setNfoMap((prev) => {
            const next = new Map(prev)
            next.set(selectedGroup.key, data)
            return next
          })

          setNfoData(data)
        } else {
          message.error(t('nfoSaveFailed') + (result.error || ''))
        }
      } catch (err) {
        message.error(t('nfoSaveError') + String(err))
      }
    },
    [selectedGroup, t]
  )

  // Handle scan button — switch to list tab and scan
  const handleScanClick = useCallback(() => {
    setActiveTab('list')
    handleScan()
  }, [handleScan])

  // Handle settings save — switch to list tab and rescan only if dirs changed
  const handleSettingsSave = useCallback(
    (dirsChanged: boolean) => {
      setActiveTab('list')
      if (dirsChanged) handleScan()
    },
    [handleScan]
  )

  const handleSettingsClose = useCallback(() => {
    setActiveTab('list')
  }, [])

  return (
    <I18nProvider value={t}>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer: '#1a1a2e',
          colorBgElevated: '#16213e',
          colorBgLayout: '#0f0f1a',
          colorBorder: '#2a2a3e',
          colorText: '#e0e0e0',
          colorTextSecondary: '#999'
        }
      }}
    >
    <Layout>
      <Header className="app-header">
        <Segmented
          value={activeTab}
          options={[
            { label: t('tabList'), value: 'list', icon: <UnorderedListOutlined /> },
            { label: t('tabSettings'), value: 'settings', icon: <SettingOutlined /> },
            { label: t('tabAbout'), value: 'about', icon: <InfoCircleOutlined /> }
          ]}
          onChange={(val) => setActiveTab(val as 'list' | 'settings' | 'about')}
        />
        <div className="header-actions">
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleScanClick}
            loading={loading}
          >
            {t('scan')}
          </Button>
        </div>
      </Header>
      <Content className="main-content">
        <div className="video-list-panel">
          {activeTab === 'list' && (
            <VideoList
              groups={videoGroups}
              nfoMap={nfoMap}
              selectedGroup={selectedGroup}
              onSelect={handleSelectGroup}
              loading={loading}
              loadingStatus={loadingStatus}
              rawFileCount={rawFiles.length}
              onDeleteGroup={(groupKey) => {
                setRawFiles((prev) => {
                  const group = videoGroups.find((g) => g.key === groupKey)
                  if (!group) return prev
                  const pathsToRemove = new Set(group.parts.map((p) => p.path))
                  return prev.filter((f) => !pathsToRemove.has(f.path))
                })
                if (selectedGroup?.key === groupKey) {
                  setSelectedGroup(null)
                }
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel
              language={language}
              onLanguageChange={setLanguage}
              onSave={handleSettingsSave}
              onClose={handleSettingsClose}
            />
          )}

          {activeTab === 'about' && (
            <div className="about-panel">
              <Title level={3} style={{ marginTop: 0 }}>
                {t('appTitle')}
              </Title>
              <Paragraph type="secondary">{t('aboutDescription')}</Paragraph>
            </div>
          )}
        </div>
        <div className="property-panel">
          {activeTab === 'list' && (
            <PropertyPanel
              group={selectedGroup}
              nfoData={nfoData}
              loading={nfoLoading}
              onSave={handleSaveNfo}
            />
          )}
        </div>
      </Content>
    </Layout>
    </ConfigProvider>
    </I18nProvider>
  )
}

export default App
