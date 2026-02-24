import { useMemo, useState, useCallback } from 'react'
import { Button, Checkbox, Select, Modal, message, Tag, Empty, Space, Typography } from 'antd'
import {
  DeleteOutlined,
  ClearOutlined,
  ArrowLeftOutlined,
  FolderOpenOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import type { VideoFileWithMeta } from '../App'
import { useT } from '../i18n'

const { Text } = Typography

/** Codec quality ranking — higher = newer/better */
const CODEC_RANK: Record<string, number> = {
  av1: 5,
  hevc: 4,
  h265: 4,
  vp9: 3,
  h264: 2,
  mpeg4: 1,
  mpeg2video: 0,
  mpeg1video: 0
}

function getCodecRank(codec: string | undefined): number {
  if (!codec) return -1
  return CODEC_RANK[codec.toLowerCase()] ?? 0
}

function getResolution(file: VideoFileWithMeta): number {
  return (file.metadata?.width ?? 0) * (file.metadata?.height ?? 0)
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface DuplicateGroup {
  baseName: string
  files: VideoFileWithMeta[]
}

interface DuplicateFinderProps {
  files: VideoFileWithMeta[]
  onFilesDeleted: (deletedPaths: string[]) => void
  onClose: () => void
}

export default function DuplicateFinder({
  files,
  onFilesDeleted,
  onClose
}: DuplicateFinderProps): React.JSX.Element {
  const t = useT()
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  // Find duplicate groups, respecting CD parts:
  // - cd1 vs cd2 are different files, NOT duplicates
  // - two cd1 files (different dirs) ARE duplicates
  // - xxx (no cd) alongside xxx-cdX ARE duplicates (full vs split)
  const dupGroups = useMemo(() => {
    const sortByQuality = (arr: VideoFileWithMeta[]): void => {
      arr.sort((a, b) => {
        const resDiff = getResolution(b) - getResolution(a)
        if (resDiff !== 0) return resDiff
        return b.size - a.size
      })
    }

    // Step 1: group by baseName
    const baseMap = new Map<string, VideoFileWithMeta[]>()
    for (const file of files) {
      const key = file.baseName.toLowerCase()
      const list = baseMap.get(key)
      if (list) list.push(file)
      else baseMap.set(key, [file])
    }

    const groups: DuplicateGroup[] = []

    for (const [, baseFiles] of baseMap) {
      // Step 2: sub-group by cdIndex
      const cdMap = new Map<number, VideoFileWithMeta[]>()
      for (const file of baseFiles) {
        const idx = file.cdIndex || 0
        const list = cdMap.get(idx)
        if (list) list.push(file)
        else cdMap.set(idx, [file])
      }

      const cdIndices = Array.from(cdMap.keys()).filter((k) => k > 0)
      const hasCdParts = cdIndices.length > 0
      const noCdFiles = cdMap.get(0) || []

      if (hasCdParts && noCdFiles.length > 0) {
        // Non-cd files coexist with cd parts → merge non-cd into the lowest cd group
        const lowestCd = Math.min(...cdIndices)
        const lowestCdFiles = cdMap.get(lowestCd) || []
        const merged = [...lowestCdFiles, ...noCdFiles]
        if (merged.length > 1) {
          sortByQuality(merged)
          groups.push({ baseName: baseFiles[0].baseName, files: merged })
        }
        // Other cd indices as separate dup groups
        for (const idx of cdIndices) {
          if (idx === lowestCd) continue
          const cdFiles = cdMap.get(idx)!
          if (cdFiles.length > 1) {
            sortByQuality(cdFiles)
            groups.push({ baseName: `${baseFiles[0].baseName}-cd${idx}`, files: cdFiles })
          }
        }
      } else {
        // No mixing: each cdIndex group independently
        for (const [idx, cdFiles] of cdMap) {
          if (cdFiles.length > 1) {
            sortByQuality(cdFiles)
            const suffix = idx > 0 ? `-cd${idx}` : ''
            groups.push({ baseName: baseFiles[0].baseName + suffix, files: cdFiles })
          }
        }
      }
    }

    groups.sort((a, b) => a.baseName.localeCompare(b.baseName))
    return groups
  }, [files])

  const toggleFile = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  /** Smart select: in each group, select all files EXCEPT the best one */
  const handleSmartSelect = useCallback(
    (strategy: 'lowres' | 'oldcodec' | 'smaller') => {
      const newSelected = new Set<string>()
      for (const group of dupGroups) {
        // Find the best file in the group (the one to KEEP)
        let bestIdx = 0
        for (let i = 1; i < group.files.length; i++) {
          const curr = group.files[i]
          const best = group.files[bestIdx]
          if (strategy === 'lowres') {
            // Keep highest resolution
            if (getResolution(curr) > getResolution(best)) bestIdx = i
            else if (getResolution(curr) === getResolution(best) && curr.size > best.size)
              bestIdx = i
          } else if (strategy === 'oldcodec') {
            // Keep newest codec
            if (getCodecRank(curr.metadata?.videoCodec) > getCodecRank(best.metadata?.videoCodec))
              bestIdx = i
            else if (
              getCodecRank(curr.metadata?.videoCodec) === getCodecRank(best.metadata?.videoCodec) &&
              getResolution(curr) > getResolution(best)
            )
              bestIdx = i
          } else {
            // Keep largest file
            if (curr.size > best.size) bestIdx = i
          }
        }
        // Select all others (the ones to DELETE)
        for (let i = 0; i < group.files.length; i++) {
          if (i !== bestIdx) {
            newSelected.add(group.files[i].path)
          }
        }
      }
      setSelectedPaths(newSelected)
    },
    [dupGroups]
  )

  const handleClearSelection = useCallback(() => {
    setSelectedPaths(new Set())
  }, [])

  const handleDeleteSelected = useCallback(() => {
    const paths = Array.from(selectedPaths)
    if (paths.length === 0) return

    Modal.confirm({
      title: t('toolDupDeleteConfirmTitle'),
      content: (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto' }}>
          {t('toolDupDeleteConfirmContent', { count: paths.length })}
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            {paths.map((p) => (
              <div key={p}>{p}</div>
            ))}
          </div>
        </div>
      ),
      okText: t('confirm'),
      cancelText: t('cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        const results = await window.api.deleteFiles(paths)
        const deleted = results.filter((r) => r.success).map((r) => r.path)
        const failed = results.filter((r) => !r.success)

        if (deleted.length > 0) {
          message.success(t('toolDupDeleteSuccess', { count: deleted.length }))
          onFilesDeleted(deleted)
          setSelectedPaths((prev) => {
            const next = new Set(prev)
            for (const p of deleted) next.delete(p)
            return next
          })
        }
        if (failed.length > 0) {
          message.error(t('toolDupDeleteFailed'))
        }
      }
    })
  }, [selectedPaths, t, onFilesDeleted])

  const renderCodecTag = (codec: string | undefined): React.ReactNode => {
    if (!codec || codec === 'unknown') return '-'
    const colorMap: Record<string, string> = {
      h264: 'blue',
      hevc: 'green',
      h265: 'green',
      av1: 'purple',
      vp9: 'orange',
      mpeg4: 'red'
    }
    return (
      <Tag color={colorMap[codec.toLowerCase()] || 'default'} style={{ textTransform: 'uppercase' }}>
        {codec}
      </Tag>
    )
  }

  if (files.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onClose} type="text" style={{ marginBottom: 16 }}>
          {t('toolBack')}
        </Button>
        <Empty description={t('toolDupNeedScan')} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onClose} type="text">
          {t('toolBack')}
        </Button>

        <Text type="secondary" style={{ marginRight: 8 }}>
          {dupGroups.length === 0
            ? t('toolNoDuplicates')
            : t('toolDupGroups', { count: dupGroups.length })}
        </Text>

        {dupGroups.length > 0 && (
          <>
            <Select
              placeholder={t('toolDupSelectLowRes')}
              style={{ width: 180 }}
              size="small"
              value={null}
              onChange={(val) => {
                if (val) handleSmartSelect(val as 'lowres' | 'oldcodec' | 'smaller')
              }}
              options={[
                { value: 'lowres', label: t('toolDupSelectLowRes') },
                { value: 'oldcodec', label: t('toolDupSelectOldCodec') },
                { value: 'smaller', label: t('toolDupSelectSmaller') }
              ]}
            />

            <Button size="small" icon={<ClearOutlined />} onClick={handleClearSelection}>
              {t('toolDupClearSelection')}
            </Button>

            <span style={{ marginLeft: 'auto', color: '#888', fontSize: 13 }}>
              {selectedPaths.size > 0 && t('toolDupSelected', { count: selectedPaths.size })}
            </span>

            <Button
              size="small"
              danger
              type="primary"
              icon={<DeleteOutlined />}
              disabled={selectedPaths.size === 0}
              onClick={handleDeleteSelected}
            >
              {t('toolDupDeleteSelected')} {selectedPaths.size > 0 && `(${selectedPaths.size})`}
            </Button>
          </>
        )}
      </div>

      {/* Duplicate groups list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {dupGroups.length === 0 ? (
          <Empty description={t('toolNoDuplicates')} style={{ marginTop: 60 }} />
        ) : (
          dupGroups.map((group) => (
            <div key={group.baseName} className="dup-group">
              <div className="dup-group-header">
                <Text strong>{group.baseName}</Text>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  ({group.files.length} files)
                </Text>
              </div>
              <div className="dup-group-files">
                {group.files.map((file) => (
                  <div
                    key={file.path}
                    className={`dup-file-row${selectedPaths.has(file.path) ? ' dup-file-selected' : ''}`}
                  >
                    <Checkbox
                      checked={selectedPaths.has(file.path)}
                      onChange={() => toggleFile(file.path)}
                    />
                    <div className="dup-file-info">
                      <div className="dup-file-name" title={file.path}>
                        {file.fileName}
                      </div>
                      <div className="dup-file-path">
                        {file.dirPath}
                      </div>
                    </div>
                    <div className="dup-file-meta">
                      {renderCodecTag(file.metadata?.videoCodec)}
                      <span className="dup-meta-item">
                        {file.metadata?.width && file.metadata?.height
                          ? `${file.metadata.width}×${file.metadata.height}`
                          : '-'}
                      </span>
                      <span className="dup-meta-item">
                        {formatDuration(file.metadata?.duration || 0)}
                      </span>
                      <span className="dup-meta-item">
                        {formatSize(file.size)}
                      </span>
                    </div>
                    <Space size={0}>
                      <Button
                        type="text"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => window.api.openFile(file.path)}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<FolderOpenOutlined />}
                        onClick={() => window.api.showInFolder(file.path)}
                      />
                    </Space>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
