const zh = {
  // App header
  appTitle: 'Movie Info Manager',
  scan: '扫描',
  settings: '设置',

  // Scanning status
  scanning: '正在扫描... 已找到 {count} 个视频文件',
  loadingMetadata: '正在读取视频信息... {count} 部影片',
  loadingNfo: '正在加载 NFO 数据... {count} 部影片',
  totalMovies: '共 {count} 部影片（{files} 个文件）',
  searchResult: '找到 {found} / {total} 部影片',
  noVideosFound: '未找到视频文件，请先在设置中添加扫描目录',
  scanFailed: '扫描视频文件失败: ',
  ffprobeNotFound: 'ffprobe 未找到，视频技术信息将不可用。请安装 ffmpeg。',

  // Search
  searchPlaceholder: '搜索文件名、影片名、演员、制片公司...',

  // Table columns
  colFileName: '文件名',
  colCodec: '编码',
  colResolution: '分辨率',
  colDuration: '时长',
  colBitrate: '码率',
  colSize: '大小',
  colNfo: 'NFO',
  nfoYes: '有',
  nfoNo: '无',
  filterHasNfo: '有 NFO',
  filterNoNfo: '无 NFO',

  // Context menu
  play: '播放',
  openFolder: '打开所在文件夹',
  deleteFolder: '删除文件夹',
  deleteConfirmTitle: '确认删除',
  deleteConfirmContent: '确定要删除以下文件夹吗？\n\n{path}\n\n此操作不可恢复！',
  deleteSuccess: '文件夹已删除',
  deleteFailed: '删除失败: ',

  // Property panel
  selectVideo: '请在左侧列表中选择一个视频文件',
  loadingNfoTip: '加载 NFO...',
  edit: '编辑',
  cancel: '取消',
  confirm: '确定',
  noNfoInfo: '暂无 NFO 信息',
  createNfo: '创建 NFO',
  editProperties: '编辑属性',
  newNfo: '新建 NFO',
  saveNfo: '保存 NFO',
  nfoSaveSuccess: 'NFO 保存成功',
  nfoSaveFailed: '保存失败: ',
  nfoSaveError: '保存 NFO 失败: ',
  nfoReadError: '读取 NFO 失败: ',

  // Property labels
  labelOriginalTitle: '原始标题',
  labelYear: '年份',
  labelPremiered: '上映日期',
  labelRuntime: '时长',
  labelMinutes: '分钟',
  labelMpaa: '分级',
  labelRating: '评分',
  labelPlot: '简介',
  labelOutline: '概要',
  labelTagline: '标语',
  labelGenres: '类型',
  labelDirectors: '导演',
  labelStudios: '制片公司',
  labelCountries: '国家/地区',
  labelTags: '标签',
  labelActors: '演员',
  labelTrailer: '预告片',

  // Form placeholders
  phTitle: '电影标题',
  phOriginalTitle: '原始标题',
  phYear: '2024',
  phPremiered: '2024-01-15',
  phRuntime: '120',
  phMpaa: 'PG-13',
  phRating: '1-10',
  phPlot: '电影简介...',
  phOutline: '一句话概要',
  phTagline: '电影标语',
  phGenres: '添加类型（如 动作、喜剧）',
  phDirectors: '添加导演',
  phStudios: '添加制片公司',
  phCountries: '添加国家',
  phTags: '添加标签',
  phTrailer: 'https://...',
  phActorName: '演员姓名',
  phActorRole: '角色',

  // Form labels (edit mode)
  formTitle: '标题',
  formOriginalTitle: '原始标题',
  formYear: '年份',
  formPremiered: '上映日期',
  formRuntime: '时长 (分钟)',
  formMpaa: '分级',
  formRating: '评分',
  formPlot: '简介',
  formOutline: '概要',
  formTagline: '标语',
  formGenres: '类型',
  formDirectors: '导演',
  formStudios: '制片公司',
  formCountries: '国家/地区',
  formTags: '标签',
  formTrailer: '预告片地址',
  formActors: '演员',
  addActor: '添加演员',

  // Settings
  settingsTitle: '设置',
  settingsScanDirs: '扫描目录',
  settingsLanguage: '界面语言',
  addScanDir: '添加扫描目录',
  noDirsHint: '暂无扫描目录，请点击上方按钮添加',
  dirAdded: '目录已添加',
  dirRemoved: '目录已移除',
  addDirFailed: '添加目录失败: ',
  removeDirFailed: '移除目录失败: ',
  loadSettingsFailed: '加载设置失败: ',
  remove: '移除',
  close: '关闭',

  // Tabs
  tabList: '列表',
  tabCollections: '合集',
  tabSettings: '设置',
  tabAbout: '关于',

  // View mode
  viewList: '列表',
  viewGrid: '缩略图',

  // Common
  save: '保存',

  // About
  aboutDescription: '视频文件 NFO 信息管理工具',
  aboutVersion: '版本',
  aboutAuthor: '作者',
  aboutHomepage: '项目主页',
  aboutTechStack: '技术栈',
  aboutLicense: '许可证',
  aboutElectron: 'Electron',
  aboutChrome: 'Chrome',
  aboutNode: 'Node.js',
  aboutFeedback: '问题反馈',
  aboutFeedbackDesc: '如果您在使用中遇到问题或有功能建议，请通过 GitHub Issues 提交。',
  aboutChangelog: '更新日志',
  aboutChangelogV011: '修复 Windows 构建错误',
  aboutChangelogV010: '项目初始版本发布',

  // Collections
  collectionActors: '演员',
  collectionStudios: '制片公司',
  collectionMovieCount: '{count} 部影片',
  collectionBack: '返回合集列表',
  collectionEmpty: '暂无合集数据，请先扫描视频文件并确保 NFO 文件包含演员或制片公司信息。',
  collectionSearch: '搜索合集...'
} as const

export type TranslationKeys = keyof typeof zh
export default zh
