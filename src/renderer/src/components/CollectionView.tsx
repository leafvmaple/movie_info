import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Radio, Input, Tag, Typography, Button, Modal, message } from 'antd'
import {
  UserOutlined,
  BankOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  PlayCircleOutlined,
  FolderOpenOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import type { VideoGroup } from '../App'
import type { NfoData } from '../../../common/types'
import type { VideoFileWithMeta } from '../App'
import { useT } from '../i18n'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Collection {
  /** Actor name or Studio name */
  name: string
  /** 'actor' | 'studio' */
  type: 'actor' | 'studio'
  /** Video groups belonging to this collection */
  groups: VideoGroup[]
}

// ─── Poster cache (shared module-level) ─────────────────────────────────────

const posterCacheMap = new Map<string, string | null>()
const posterLoadingSet = new Set<string>()

// ─── CollectionCover: composite poster (up to 9) ───────────────────────────

function CollectionCover({
  collection,
  onClick
}: {
  collection: Collection
  onClick: () => void
}): React.JSX.Element {
  const t = useT()
  const containerRef = useRef<HTMLDivElement>(null)
  const [posters, setPosters] = useState<(string | null)[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load posters for up to 9 groups via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          const candidates = collection.groups.slice(0, 9)
          let remaining = candidates.length
          const results: (string | null)[] = new Array(candidates.length).fill(null)

          if (remaining === 0) {
            setLoaded(true)
            return
          }

          candidates.forEach((g, i) => {
            if (posterCacheMap.has(g.key)) {
              results[i] = posterCacheMap.get(g.key)!
              remaining--
              if (remaining === 0) {
                setPosters([...results])
                setLoaded(true)
              }
              return
            }

            if (posterLoadingSet.has(g.key)) {
              // already being loaded elsewhere; skip and fill null
              remaining--
              if (remaining === 0) {
                setPosters([...results])
                setLoaded(true)
              }
              return
            }
            posterLoadingSet.add(g.key)

            window.api.findPoster(g.dirPath, g.baseName).then((uri) => {
              posterCacheMap.set(g.key, uri)
              results[i] = uri
              remaining--
              if (remaining === 0) {
                setPosters([...results])
                setLoaded(true)
              }
            })
          })
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [collection])

  const validPosters = loaded ? posters.filter(Boolean) as string[] : []
  const count = validPosters.length

  // Determine grid layout class based on poster count
  const gridClass = count === 0
    ? 'composite-empty'
    : count === 1
      ? 'composite-1'
      : count <= 4
        ? 'composite-4'
        : 'composite-9'

  return (
    <div ref={containerRef} className="collection-card" onClick={onClick}>
      <div className={`collection-cover ${gridClass}`}>
        {count === 0 ? (
          <div className="collection-no-poster">
            {collection.type === 'actor'
              ? <UserOutlined style={{ fontSize: 36, color: '#555' }} />
              : <BankOutlined style={{ fontSize: 36, color: '#555' }} />}
          </div>
        ) : (
          validPosters.slice(0, 9).map((uri, i) => (
            <img key={i} src={uri} alt="" className="composite-img" />
          ))
        )}
        <div className="collection-count-badge">
          {t('collectionMovieCount', { count: collection.groups.length })}
        </div>
      </div>
      <div className="collection-card-title" title={collection.name}>
        {collection.type === 'actor'
          ? <UserOutlined style={{ marginRight: 4, fontSize: 11, color: '#888' }} />
          : <BankOutlined style={{ marginRight: 4, fontSize: 11, color: '#888' }} />}
        {collection.name}
      </div>
    </div>
  )
}

// ─── Inner grid card (same as VideoList GridCard but simplified) ────────────

function InnerGridCard({
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

// ─── Context menu state ─────────────────────────────────────────────────────

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  file: VideoFileWithMeta | null
  group: VideoGroup | null
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface CollectionViewProps {
  groups: VideoGroup[]
  nfoMap: Map<string, NfoData>
  selectedGroup: VideoGroup | null
  onSelect: (group: VideoGroup) => void
  onDeleteGroup?: (groupKey: string) => void
}

export default function CollectionView({
  groups,
  nfoMap,
  selectedGroup,
  onSelect,
  onDeleteGroup
}: CollectionViewProps): React.JSX.Element {
  const t = useT()
  const [categoryTab, setCategoryTab] = useState<'actor' | 'studio'>('actor')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [openCollection, setOpenCollection] = useState<Collection | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    file: null,
    group: null
  })

  // Build collections from nfoMap
  const { actorCollections, studioCollections } = useMemo(() => {
    const actorMap = new Map<string, Set<string>>()
    const studioMap = new Map<string, Set<string>>()

    for (const [key, nfo] of nfoMap) {
      for (const actor of nfo.actors) {
        const name = actor.name.trim()
        if (!name) continue
        if (!actorMap.has(name)) actorMap.set(name, new Set())
        actorMap.get(name)!.add(key)
      }
      for (const studio of nfo.studios) {
        const name = studio.trim()
        if (!name) continue
        if (!studioMap.has(name)) studioMap.set(name, new Set())
        studioMap.get(name)!.add(key)
      }
    }

    const groupMap = new Map(groups.map((g) => [g.key, g]))

    const toCollections = (
      map: Map<string, Set<string>>,
      type: 'actor' | 'studio'
    ): Collection[] => {
      const result: Collection[] = []
      for (const [name, keys] of map) {
        const matched = Array.from(keys)
          .map((k) => groupMap.get(k))
          .filter(Boolean) as VideoGroup[]
        if (matched.length > 0) {
          result.push({ name, type, groups: matched })
        }
      }
      // Sort by movie count descending, then by name
      result.sort((a, b) => b.groups.length - a.groups.length || a.name.localeCompare(b.name))
      return result
    }

    return {
      actorCollections: toCollections(actorMap, 'actor'),
      studioCollections: toCollections(studioMap, 'studio')
    }
  }, [groups, nfoMap])

  const collections = categoryTab === 'actor' ? actorCollections : studioCollections

  // Filter collections by search
  const filteredCollections = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase()
    if (!kw) return collections
    return collections.filter((c) => c.name.toLowerCase().includes(kw))
  }, [collections, searchKeyword])

  // Close context menu on click
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
    if (contextMenu.file) window.api.openFile(contextMenu.file.path)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [contextMenu.file])

  const handleShowInFolder = useCallback(() => {
    if (contextMenu.file) window.api.showInFolder(contextMenu.file.path)
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

  // ── Render: inside a collection (grid view of videos) ──

  if (openCollection) {
    return (
      <>
        <div className="toolbar">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => setOpenCollection(null)}
            size="small"
          >
            {t('collectionBack')}
          </Button>
          <Typography.Text strong style={{ fontSize: 15, marginLeft: 8 }}>
            {openCollection.type === 'actor'
              ? <UserOutlined style={{ marginRight: 4 }} />
              : <BankOutlined style={{ marginRight: 4 }} />}
            {openCollection.name}
          </Typography.Text>
          <span className="video-count">
            {t('collectionMovieCount', { count: openCollection.groups.length })}
          </span>
        </div>
        <div className="grid-view">
          {openCollection.groups.map((group) => {
            const nfo = nfoMap.get(group.key)
            const title = nfo?.title || group.displayName
            return (
              <InnerGridCard
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

  // ── Render: collection list ──

  const hasAny = actorCollections.length > 0 || studioCollections.length > 0

  return (
    <>
      <div className="toolbar">
        <Radio.Group
          value={categoryTab}
          onChange={(e) => {
            setCategoryTab(e.target.value as 'actor' | 'studio')
            setSearchKeyword('')
          }}
          optionType="button"
          buttonStyle="solid"
          size="small"
          className="collection-category-radio"
        >
          <Radio.Button value="actor">
            <UserOutlined style={{ marginRight: 4 }} />
            {t('collectionActors')}
          </Radio.Button>
          <Radio.Button value="studio">
            <BankOutlined style={{ marginRight: 4 }} />
            {t('collectionStudios')}
          </Radio.Button>
        </Radio.Group>
        <Input
          prefix={<SearchOutlined style={{ color: '#666' }} />}
          placeholder={t('collectionSearch')}
          allowClear
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ width: 240 }}
          size="small"
        />
        <span className="video-count">
          {filteredCollections.length} / {collections.length}
        </span>
      </div>

      {!hasAny ? (
        <div className="collection-empty">
          <Typography.Text type="secondary">{t('collectionEmpty')}</Typography.Text>
        </div>
      ) : (
        <div className="collection-grid">
          {filteredCollections.map((c) => (
            <CollectionCover
              key={`${c.type}:${c.name}`}
              collection={c}
              onClick={() => setOpenCollection(c)}
            />
          ))}
        </div>
      )}
    </>
  )
}
