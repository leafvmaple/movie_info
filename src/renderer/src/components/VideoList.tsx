import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Table, Tag, Spin, Input, Segmented, Modal, message } from 'antd'
import {
  LoadingOutlined,
  DownOutlined,
  RightOutlined,
  PlayCircleOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { VideoGroup, VideoFileWithMeta } from '../App'
import type { NfoData } from '../../../common/types'
import { useT } from '../i18n'

/** Shared poster cache across renders (module-level so it persists) */
const posterCacheMap = new Map<string, string | null>()
const posterLoadingSet = new Set<string>()

/** Grid card with IntersectionObserver-based lazy poster loading */
function GridCard({
  group,
  title,
  selected,
  onClick,
  onContextMenu
}: {
  group: VideoGroup
  title: string
  selected: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null)
  const [posterUri, setPosterUri] = useState<string | null | undefined>(
    posterCacheMap.has(group.key) ? posterCacheMap.get(group.key)! : undefined
  )

  useEffect(() => {
    // Already loaded from cache
    if (posterCacheMap.has(group.key)) {
      setPosterUri(posterCacheMap.get(group.key)!)
      return
    }

    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          if (posterLoadingSet.has(group.key)) return
          posterLoadingSet.add(group.key)

          window.api.findPoster(group.dirPath, group.baseName).then((uri) => {
            posterCacheMap.set(group.key, uri)
            setPosterUri(uri)
          })
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [group.key, group.dirPath, group.baseName])

  return (
    <div
      ref={cardRef}
      className={`grid-card${selected ? ' grid-card-selected' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="grid-card-poster">
        {posterUri ? (
          <img src={posterUri} alt={title} />
        ) : (
          <div className="grid-card-no-poster">
            <AppstoreOutlined style={{ fontSize: 32, color: '#555' }} />
          </div>
        )}
        {group.nfoPath && (
          <Tag color="green" className="grid-card-nfo-tag">NFO</Tag>
        )}
      </div>
      <div className="grid-card-title" title={title}>
        {title}
      </div>
    </div>
  )
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  file: VideoFileWithMeta | null
  group: VideoGroup | null
}

interface VideoListProps {
  groups: VideoGroup[]
  nfoMap: Map<string, NfoData>
  selectedGroup: VideoGroup | null
  onSelect: (group: VideoGroup) => void
  loading?: boolean
  loadingStatus?: string
  rawFileCount: number
  onDeleteGroup?: (groupKey: string) => void
}

/**
 * Format bytes to human-readable file size.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

/**
 * Format duration seconds to HH:MM:SS.
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Format bitrate to human readable (e.g., 5.2 Mbps).
 */
function formatBitrate(bps: number): string {
  if (!bps || bps <= 0) return '-'
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`
  }
  return `${(bps / 1000).toFixed(0)} Kbps`
}

function renderCodecTag(codec: string | undefined): React.ReactNode {
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
    <Tag color={colorMap[codec.toLowerCase()] || 'default'} className="codec-tag">
      {codec}
    </Tag>
  )
}

export default function VideoList({
  groups,
  nfoMap,
  selectedGroup,
  onSelect,
  loading,
  loadingStatus,
  rawFileCount,
  onDeleteGroup
}: VideoListProps): React.JSX.Element {
  const t = useT()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    file: null,
    group: null
  })

  // Filter groups by search keyword
  const filteredGroups = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase()
    if (!kw) return groups

    return groups.filter((g) => {
      // Match file names
      if (g.displayName.toLowerCase().includes(kw)) return true
      for (const part of g.parts) {
        if (part.fileName.toLowerCase().includes(kw)) return true
      }

      // Match NFO fields: title, originaltitle, actors, studios
      const nfo = nfoMap.get(g.key)
      if (nfo) {
        if (nfo.title.toLowerCase().includes(kw)) return true
        if (nfo.originaltitle.toLowerCase().includes(kw)) return true
        if (nfo.actors.some((a) => a.name.toLowerCase().includes(kw))) return true
        if (nfo.studios.some((s) => s.toLowerCase().includes(kw))) return true
      }

      return false
    })
  }, [groups, nfoMap, searchKeyword])

  // Close context menu on any click
  useEffect(() => {
    const handleClick = (): void => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [contextMenu.visible])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: VideoFileWithMeta, group: VideoGroup) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file, group })
    },
    []
  )

  const handlePlay = useCallback(() => {
    if (contextMenu.file) {
      window.api.openFile(contextMenu.file.path)
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [contextMenu.file])

  const handleShowInFolder = useCallback(() => {
    if (contextMenu.file) {
      window.api.showInFolder(contextMenu.file.path)
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [contextMenu.file])

  const handleDelete = useCallback(() => {
    const group = contextMenu.group
    if (!group) return
    setContextMenu((prev) => ({ ...prev, visible: false }))
    Modal.confirm({
      title: t('deleteConfirmTitle'),
      content: (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {t('deleteConfirmContent', { path: group.dirPath })}
        </div>
      ),
      okText: t('confirm'),
      cancelText: t('cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await window.api.deleteFolder(group.dirPath)
        if (result.success) {
          message.success(t('deleteSuccess'))
          onDeleteGroup?.(group.key)
        } else {
          message.error(t('deleteFailed') + (result.error || ''))
        }
      }
    })
  }, [contextMenu.group, t, onDeleteGroup])
  const columns: ColumnsType<VideoGroup> = useMemo(
    () => [
      {
        title: t('colFileName'),
        key: 'displayName',
        ellipsis: true,
        sorter: (a, b) => a.displayName.localeCompare(b.displayName),
        width: '30%',
        render: (_, record) => (
          <span>
            {record.displayName}
            {record.partCount > 1 && (
              <Tag color="cyan" style={{ marginLeft: 6 }}>
                {record.partCount} CD
              </Tag>
            )}
          </span>
        )
      },
      {
        title: t('colCodec'),
        key: 'codec',
        width: 90,
        render: (_, record) => renderCodecTag(record.metadata?.videoCodec),
        sorter: (a, b) =>
          (a.metadata?.videoCodec || '').localeCompare(b.metadata?.videoCodec || '')
      },
      {
        title: t('colResolution'),
        key: 'resolution',
        width: 110,
        render: (_, record) => {
          const m = record.metadata
          if (!m || !m.width) return '-'
          return `${m.width}×${m.height}`
        },
        sorter: (a, b) => (a.metadata?.width || 0) - (b.metadata?.width || 0)
      },
      {
        title: t('colDuration'),
        key: 'duration',
        width: 90,
        render: (_, record) =>
          formatDuration(record.totalDuration || record.metadata?.duration || 0),
        sorter: (a, b) => (a.totalDuration || 0) - (b.totalDuration || 0)
      },
      {
        title: t('colBitrate'),
        key: 'bitrate',
        width: 100,
        render: (_, record) => formatBitrate(record.metadata?.bitrate || 0),
        sorter: (a, b) => (a.metadata?.bitrate || 0) - (b.metadata?.bitrate || 0)
      },
      {
        title: t('colSize'),
        key: 'size',
        width: 90,
        render: (_, record) => (
          <span className="file-size">{formatSize(record.totalSize)}</span>
        ),
        sorter: (a, b) => a.totalSize - b.totalSize
      },
      {
        title: t('colNfo'),
        key: 'nfo',
        width: 70,
        render: (_, record) =>
          record.nfoPath ? <Tag color="green">{t('nfoYes')}</Tag> : <Tag color="default">{t('nfoNo')}</Tag>,
        filters: [
          { text: t('filterHasNfo'), value: 'yes' },
          { text: t('filterNoNfo'), value: 'no' }
        ],
        onFilter: (value, record) =>
          value === 'yes' ? !!record.nfoPath : !record.nfoPath
      }
    ],
    [t]
  )

  /** Columns for the expanded child table (individual CD parts) */
  const childColumns: ColumnsType<VideoFileWithMeta> = useMemo(
    () => [
      {
        title: t('colFileName'),
        key: 'fileName',
        dataIndex: 'fileName',
        ellipsis: { showTitle: false },
        width: '30%',
        render: (_, record) => (
          <span title={record.path}>{record.fileName}</span>
        )
      },
      {
        title: t('colCodec'),
        key: 'codec',
        width: 90,
        render: (_, record) => renderCodecTag(record.metadata?.videoCodec)
      },
      {
        title: t('colResolution'),
        key: 'resolution',
        width: 110,
        render: (_, record) => {
          const m = record.metadata
          if (!m || !m.width) return '-'
          return `${m.width}×${m.height}`
        }
      },
      {
        title: t('colDuration'),
        key: 'duration',
        width: 90,
        render: (_, record) => formatDuration(record.metadata?.duration || 0)
      },
      {
        title: t('colBitrate'),
        key: 'bitrate',
        width: 100,
        render: (_, record) => formatBitrate(record.metadata?.bitrate || 0)
      },
      {
        title: t('colSize'),
        key: 'size',
        width: 90,
        render: (_, record) => (
          <span className="file-size">{formatSize(record.size)}</span>
        )
      },
      {
        title: t('colNfo'),
        key: 'nfo',
        width: 70,
        render: () => null
      }
    ],
    [t]
  )

  return (
    <>
      <div className="toolbar">
        <Input
          prefix={<SearchOutlined style={{ color: '#666' }} />}
          placeholder={t('searchPlaceholder')}
          allowClear
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ width: 320 }}
          size="small"
        />
        <Segmented
          size="small"
          value={viewMode}
          options={[
            { value: 'list', icon: <UnorderedListOutlined /> },
            { value: 'grid', icon: <AppstoreOutlined /> }
          ]}
          onChange={(val) => setViewMode(val as 'list' | 'grid')}
        />
        <span className="video-count">
          {loading ? (
            <>
              <Spin indicator={<LoadingOutlined spin />} size="small" /> {t('scanning', { count: rawFileCount })}
            </>
          ) : loadingStatus ? (
            <>
              <Spin indicator={<LoadingOutlined spin />} size="small" />{' '}
              {loadingStatus === 'metadata'
                ? t('loadingMetadata', { count: groups.length })
                : t('loadingNfo', { count: groups.length })}
            </>
          ) : (
            <>
              {searchKeyword.trim()
                ? t('searchResult', { found: filteredGroups.length, total: groups.length })
                : t('totalMovies', { count: groups.length, files: rawFileCount })}
            </>
          )}
        </span>
      </div>

      {viewMode === 'list' ? (
        <div className="video-list-table-wrap">
        <Table<VideoGroup>
        columns={columns}
        dataSource={filteredGroups}
        rowKey="key"
        size="small"
        pagination={{
          pageSize: 100,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200', '500']
        }}
        scroll={{ y: 'calc(100vh - 230px)' }}
        onRow={(record) => ({
          onClick: () => onSelect(record),
          onContextMenu: (e) => {
            // For single-file groups, show context menu directly
            if (record.partCount === 1) {
              handleContextMenu(e, record.parts[0], record)
            }
          },
          className: selectedGroup?.key === record.key ? 'selected-row' : ''
        })}
        expandable={{
          expandedRowRender: (record) => (
            <Table<VideoFileWithMeta>
              columns={childColumns}
              dataSource={record.parts}
              rowKey="path"
              size="small"
              pagination={false}
              showHeader={false}
              className="cd-parts-table"
              onRow={(file) => ({
                onContextMenu: (e) => handleContextMenu(e, file, record)
              })}
            />
          ),
          rowExpandable: (record) => record.partCount > 1,
          expandIcon: ({ expanded, onExpand, record }) =>
            record.partCount > 1 ? (
              <span
                className="expand-icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onExpand(record, e)
                }}
              >
                {expanded ? <DownOutlined /> : <RightOutlined />}
              </span>
            ) : (
              <span className="expand-icon-placeholder" />
            )
        }}
      />
      </div>
      ) : (
        <div className="grid-view">
          {filteredGroups.map((group) => {
            const nfo = nfoMap.get(group.key)
            const title = nfo?.title || group.displayName
            return (
              <GridCard
                key={group.key}
                group={group}
                title={title}
                selected={selectedGroup?.key === group.key}
                onClick={() => onSelect(group)}
                onContextMenu={(e) => {
                  if (group.partCount === 1) {
                    handleContextMenu(e, group.parts[0], group)
                  }
                }}
              />
            )
          })}
        </div>
      )}

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="context-menu-item" onClick={handlePlay}>
            <PlayCircleOutlined /> {t('play')}
          </div>
          <div className="context-menu-item" onClick={handleShowInFolder}>
            <FolderOpenOutlined /> {t('openFolder')}
          </div>
          <div className="context-menu-item context-menu-item-danger" onClick={handleDelete}>
            <DeleteOutlined /> {t('deleteFolder')}
          </div>
        </div>
      )}
    </>
  )
}
