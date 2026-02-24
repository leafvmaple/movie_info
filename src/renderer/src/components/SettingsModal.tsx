import { useState, useEffect, useCallback } from 'react'
import { List, Button, message, Empty, Select, Divider, Space } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOpenOutlined, SaveOutlined, ClearOutlined } from '@ant-design/icons'
import { useT } from '../i18n'
import type { Language } from '../i18n'

interface SettingsPanelProps {
  language: Language
  onLanguageChange: (lang: Language) => void
  onSave: (dirsChanged: boolean) => void
  onClose: () => void
}

export default function SettingsPanel({
  language,
  onLanguageChange,
  onSave,
  onClose
}: SettingsPanelProps): React.JSX.Element {
  const [directories, setDirectories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [dirsChanged, setDirsChanged] = useState(false)
  const t = useT()

  const loadSettings = useCallback(async () => {
    try {
      const settings = await window.api.getSettings()
      setDirectories(settings.directories)
    } catch (err) {
      message.error(t('loadSettingsFailed') + String(err))
    }
  }, [t])

  useEffect(() => {
    loadSettings()
    setDirsChanged(false)
  }, [loadSettings])

  const handleAddDirectory = async (): Promise<void> => {
    try {
      const dir = await window.api.selectDirectory()
      if (dir) {
        setLoading(true)
        const settings = await window.api.addDirectory(dir)
        setDirectories(settings.directories)
        setDirsChanged(true)
        message.success(t('dirAdded'))
      }
    } catch (err) {
      message.error(t('addDirFailed') + String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDirectory = async (dir: string): Promise<void> => {
    try {
      const settings = await window.api.removeDirectory(dir)
      setDirectories(settings.directories)
      setDirsChanged(true)
      message.success(t('dirRemoved'))
    } catch (err) {
      message.error(t('removeDirFailed') + String(err))
    }
  }

  const handleLanguageChange = async (lang: Language): Promise<void> => {
    onLanguageChange(lang)
    try {
      const settings = await window.api.getSettings()
      await window.api.saveSettings({ ...settings, language: lang })
    } catch {
      // ignore save error
    }
  }

  return (
    <div className="settings-panel">
      <div style={{ marginBottom: 8 }}>
        <strong>{t('settingsLanguage')}</strong>
      </div>
      <Select
        value={language}
        onChange={handleLanguageChange}
        style={{ width: 200, marginBottom: 16 }}
        options={[
          { value: 'zh', label: '中文' },
          { value: 'en', label: 'English' },
          { value: 'ja', label: '日本語' }
        ]}
      />

      <Divider />

      <div style={{ marginBottom: 8 }}>
        <strong>{t('settingsScanDirs')}</strong>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddDirectory}
          loading={loading}
          block
        >
          <FolderOpenOutlined /> {t('addScanDir')}
        </Button>
      </div>

      <div className="settings-dir-list">
        {directories.length === 0 ? (
          <Empty description={t('noDirsHint')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={directories}
            renderItem={(dir) => (
              <List.Item
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveDirectory(dir)}
                  >
                    {t('remove')}
                  </Button>
                ]}
              >
                <span className="dir-path">{dir}</span>
              </List.Item>
            )}
          />
        )}
      </div>

      <Divider />

      <div style={{ marginBottom: 8 }}>
        <strong>{t('clearCache')}</strong>
      </div>
      <Button
        icon={<ClearOutlined />}
        danger
        onClick={async () => {
          try {
            await window.api.clearCache()
            message.success(t('clearCacheSuccess'))
          } catch (err) {
            message.error(t('clearCacheFailed') + String(err))
          }
        }}
      >
        {t('clearCache')}
      </Button>

      <div className="settings-actions">
        <Space>
          <Button onClick={onClose}>{t('close')}</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave(dirsChanged)}>
            {t('save')}
          </Button>
        </Space>
      </div>
    </div>
  )
}
