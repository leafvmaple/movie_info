import { useState } from 'react'
import { Card, Typography } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import DuplicateFinder from './DuplicateFinder'
import type { VideoFileWithMeta } from '../App'
import { useT } from '../i18n'

const { Text } = Typography

interface ToolsPanelProps {
  files: VideoFileWithMeta[]
  onFilesDeleted: (deletedPaths: string[]) => void
}

export default function ToolsPanel({ files, onFilesDeleted }: ToolsPanelProps): React.JSX.Element {
  const t = useT()
  const [activeTool, setActiveTool] = useState<string | null>(null)

  if (activeTool === 'duplicates') {
    return (
      <DuplicateFinder
        files={files}
        onFilesDeleted={onFilesDeleted}
        onClose={() => setActiveTool(null)}
      />
    )
  }

  return (
    <div className="tools-grid">
      <Card
        hoverable
        className="tool-card"
        onClick={() => setActiveTool('duplicates')}
      >
        <div className="tool-card-icon">
          <CopyOutlined style={{ fontSize: 28, color: '#1668dc' }} />
        </div>
        <div className="tool-card-content">
          <Text strong>{t('toolDuplicateFinder')}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('toolDuplicateFinderDesc')}
          </Text>
        </div>
      </Card>
    </div>
  )
}
