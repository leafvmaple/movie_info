import { useEffect, useState } from 'react'
import {
  Form,
  Input,
  Button,
  Select,
  Spin,
  Typography,
  Divider,
  Space,
  Tag
} from 'antd'
import {
  PlusOutlined,
  MinusCircleOutlined,
  SaveOutlined,
  EditOutlined,
  CloseOutlined
} from '@ant-design/icons'
import type { NfoData, NfoActor } from '../../../common/types'
import type { VideoGroup } from '../App'
import { useT } from '../i18n'

const { TextArea } = Input
const { Title, Text } = Typography

interface PropertyPanelProps {
  group: VideoGroup | null
  nfoData: NfoData | null
  loading: boolean
  onSave: (data: NfoData) => Promise<void>
  onClose?: () => void
}

/** Read-only field display */
function ReadOnlyField({
  label,
  value
}: {
  label: string
  value: string | undefined
}): React.JSX.Element | null {
  if (!value) return null
  return (
    <div className="readonly-field">
      <span className="readonly-label">{label}</span>
      <span className="readonly-value">{value}</span>
    </div>
  )
}

/** Read-only tag list display */
function ReadOnlyTags({
  label,
  values
}: {
  label: string
  values: string[] | undefined
}): React.JSX.Element | null {
  if (!values || values.length === 0) return null
  return (
    <div className="readonly-field">
      <span className="readonly-label">{label}</span>
      <span className="readonly-value">
        {values.map((v) => (
          <Tag key={v} style={{ marginBottom: 4 }}>
            {v}
          </Tag>
        ))}
      </span>
    </div>
  )
}

export default function PropertyPanel({
  group,
  nfoData,
  loading,
  onSave,
  onClose
}: PropertyPanelProps): React.JSX.Element {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [posterUri, setPosterUri] = useState<string | null>(null)
  const t = useT()

  // Load poster image when group changes
  useEffect(() => {
    setPosterUri(null)
    if (group) {
      window.api.findPoster(group.dirPath, group.baseName).then((uri) => {
        if (uri) setPosterUri(uri)
      })
    }
  }, [group])

  // Reset form and exit edit mode when group/nfoData changes
  useEffect(() => {
    setEditing(false)
    if (nfoData) {
      form.setFieldsValue({
        title: nfoData.title,
        originaltitle: nfoData.originaltitle,
        year: nfoData.year,
        premiered: nfoData.premiered,
        plot: nfoData.plot,
        outline: nfoData.outline,
        tagline: nfoData.tagline,
        runtime: nfoData.runtime,
        mpaa: nfoData.mpaa,
        genres: nfoData.genres,
        directors: nfoData.directors,
        studios: nfoData.studios,
        countries: nfoData.countries,
        tags: nfoData.tags,
        actors: nfoData.actors.length > 0 ? nfoData.actors : [],
        userrating: nfoData.userrating,
        trailer: nfoData.trailer
      })
    } else {
      form.resetFields()
    }
  }, [nfoData, form])

  const closeButton = onClose ? (
    <div className="property-panel-header">
      <Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />
    </div>
  ) : null

  if (!group) {
    return (
      <>
        {closeButton}
        <div className="panel-placeholder">
          <Text type="secondary">{t('selectVideo')}</Text>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        {closeButton}
        <div className="panel-placeholder">
          <Spin tip={t('loadingNfoTip')} />
        </div>
      </>
    )
  }

  const handleSave = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const data: NfoData = {
        ...nfoData!,
        title: values.title || '',
        originaltitle: values.originaltitle || '',
        sorttitle: nfoData?.sorttitle || '',
        year: values.year || '',
        premiered: values.premiered || '',
        plot: values.plot || '',
        outline: values.outline || '',
        tagline: values.tagline || '',
        runtime: values.runtime || '',
        mpaa: values.mpaa || '',
        genres: values.genres || [],
        directors: values.directors || [],
        credits: nfoData?.credits || [],
        studios: values.studios || [],
        countries: values.countries || [],
        tags: values.tags || [],
        actors: (values.actors || []).map((a: NfoActor, i: number) => ({
          name: a.name || '',
          role: a.role || '',
          order: i,
          thumb: a.thumb
        })),
        ratings: nfoData?.ratings || [],
        userrating: values.userrating || '',
        uniqueids: nfoData?.uniqueids || {},
        poster: nfoData?.poster || '',
        fanart: nfoData?.fanart || '',
        trailer: values.trailer || ''
      }

      await onSave(data)
      setEditing(false)
    } catch {
      // validation error — form will show inline errors
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = (): void => {
    // Reset form to original nfoData values
    if (nfoData) {
      form.setFieldsValue({
        title: nfoData.title,
        originaltitle: nfoData.originaltitle,
        year: nfoData.year,
        premiered: nfoData.premiered,
        plot: nfoData.plot,
        outline: nfoData.outline,
        tagline: nfoData.tagline,
        runtime: nfoData.runtime,
        mpaa: nfoData.mpaa,
        genres: nfoData.genres,
        directors: nfoData.directors,
        studios: nfoData.studios,
        countries: nfoData.countries,
        tags: nfoData.tags,
        actors: nfoData.actors.length > 0 ? nfoData.actors : [],
        userrating: nfoData.userrating,
        trailer: nfoData.trailer
      })
    }
    setEditing(false)
  }

  // ===== Read-only view =====
  if (!editing) {
    return (
      <div className="property-form">
        <div className="panel-header">
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
              {nfoData?.title || group.displayName}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {group.displayName}
              {group.partCount > 1 && ` (${group.partCount} CD)`}
            </Text>
          </div>
          <Space size={4}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
            >
              {t('edit')}
            </Button>
            {onClose && <Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />}
          </Space>
        </div>

        {posterUri && (
          <div className="poster-container">
            <img src={posterUri} alt="poster" className="poster-image" />
          </div>
        )}

        {nfoData && (
          <div className="readonly-content">
            <ReadOnlyField label={t('labelOriginalTitle')} value={nfoData.originaltitle} />

            <div className="readonly-row">
              <ReadOnlyField label={t('labelYear')} value={nfoData.year} />
              <ReadOnlyField label={t('labelPremiered')} value={nfoData.premiered} />
            </div>

            <div className="readonly-row">
              <ReadOnlyField label={t('labelRuntime')} value={nfoData.runtime ? `${nfoData.runtime} ${t('labelMinutes')}` : ''} />
              <ReadOnlyField label={t('labelMpaa')} value={nfoData.mpaa} />
              <ReadOnlyField label={t('labelRating')} value={nfoData.userrating} />
            </div>

            {nfoData.plot && (
              <div className="readonly-field">
                <span className="readonly-label">{t('labelPlot')}</span>
                <span className="readonly-value readonly-plot">{nfoData.plot}</span>
              </div>
            )}

            <ReadOnlyField label={t('labelOutline')} value={nfoData.outline} />
            <ReadOnlyField label={t('labelTagline')} value={nfoData.tagline} />

            <Divider style={{ margin: '8px 0' }} />

            <ReadOnlyTags label={t('labelGenres')} values={nfoData.genres} />
            <ReadOnlyTags label={t('labelDirectors')} values={nfoData.directors} />
            <ReadOnlyTags label={t('labelStudios')} values={nfoData.studios} />
            <ReadOnlyTags label={t('labelCountries')} values={nfoData.countries} />
            <ReadOnlyTags label={t('labelTags')} values={nfoData.tags} />

            {nfoData.actors.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <div className="readonly-field">
                  <span className="readonly-label">{t('labelActors')}</span>
                  <div className="readonly-actors">
                    {nfoData.actors.map((actor, i) => (
                      <span key={i} className="readonly-actor">
                        {actor.name}
                        {actor.role && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {' '}
                            ({actor.role})
                          </Text>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <ReadOnlyField label={t('labelTrailer')} value={nfoData.trailer} />
          </div>
        )}

        {!nfoData?.title && !nfoData?.plot && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Text type="secondary">{t('noNfoInfo')}</Text>
            <br />
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
              style={{ marginTop: 8 }}
            >
              {t('createNfo')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ===== Edit mode =====
  return (
    <div className="property-form">
      <div className="panel-header">
        <div>
          <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            {group.nfoPath ? t('editProperties') : t('newNfo')}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {group.displayName}
            {group.partCount > 1 && ` (${group.partCount} CD)`}
          </Text>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={handleCancelEdit}>
          {t('cancel')}
        </Button>
      </div>

      <Form form={form} layout="vertical" size="small">
        <Form.Item label={t('formTitle')} name="title">
          <Input placeholder={t('phTitle')} />
        </Form.Item>

        <Form.Item label={t('formOriginalTitle')} name="originaltitle">
          <Input placeholder={t('phOriginalTitle')} />
        </Form.Item>

        <Space style={{ width: '100%' }} size={8}>
          <Form.Item label={t('formYear')} name="year" style={{ width: 120 }}>
            <Input placeholder={t('phYear')} />
          </Form.Item>

          <Form.Item label={t('formPremiered')} name="premiered" style={{ flex: 1 }}>
            <Input placeholder={t('phPremiered')} />
          </Form.Item>
        </Space>

        <Form.Item label={t('formRuntime')} name="runtime">
          <Input placeholder={t('phRuntime')} />
        </Form.Item>

        <Form.Item label={t('formMpaa')} name="mpaa">
          <Input placeholder={t('phMpaa')} />
        </Form.Item>

        <Form.Item label={t('formRating')} name="userrating">
          <Input placeholder={t('phRating')} />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Form.Item label={t('formPlot')} name="plot">
          <TextArea rows={4} placeholder={t('phPlot')} />
        </Form.Item>

        <Form.Item label={t('formOutline')} name="outline">
          <Input placeholder={t('phOutline')} />
        </Form.Item>

        <Form.Item label={t('formTagline')} name="tagline">
          <Input placeholder={t('phTagline')} />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Form.Item label={t('formGenres')} name="genres">
          <Select
            mode="tags"
            placeholder={t('phGenres')}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item label={t('formDirectors')} name="directors">
          <Select mode="tags" placeholder={t('phDirectors')} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={t('formStudios')} name="studios">
          <Select mode="tags" placeholder={t('phStudios')} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={t('formCountries')} name="countries">
          <Select mode="tags" placeholder={t('phCountries')} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={t('formTags')} name="tags">
          <Select mode="tags" placeholder={t('phTags')} style={{ width: '100%' }} />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Form.Item label={t('formTrailer')} name="trailer">
          <Input placeholder={t('phTrailer')} />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* Actors list */}
        <Title level={5}>{t('formActors')}</Title>
        <Form.List name="actors">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <div key={field.key} className="actor-item">
                  <Form.Item {...field} name={[field.name, 'name']} noStyle>
                    <Input placeholder={t('phActorName')} style={{ flex: 1 }} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'role']} noStyle>
                    <Input placeholder={t('phActorRole')} style={{ flex: 1 }} />
                  </Form.Item>
                  <MinusCircleOutlined
                    onClick={() => remove(field.name)}
                    style={{ color: '#ff4d4f' }}
                  />
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ name: '', role: '' })}
                block
                icon={<PlusOutlined />}
                style={{ marginBottom: 16 }}
              >
                {t('addActor')}
              </Button>
            </>
          )}
        </Form.List>

        <div className="save-bar">
          <Button onClick={handleCancelEdit}>{t('cancel')}</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            {t('saveNfo')}
          </Button>
        </div>
      </Form>
    </div>
  )
}
