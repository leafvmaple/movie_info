import type { TranslationKeys } from './zh'

const ja: Record<TranslationKeys, string> = {
  // App header
  appTitle: 'Movie Info Manager',
  scan: 'スキャン',
  settings: '設定',

  // Scanning status
  scanning: 'スキャン中... {count} 件の動画ファイルが見つかりました',
  loadingMetadata: '動画情報を読み込み中... {count} 本',
  loadingNfo: 'NFOデータを読み込み中... {count} 本',
  totalMovies: '合計 {count} 本（{files} ファイル）',
  searchResult: '{found} / {total} 本が見つかりました',
  noVideosFound: '動画ファイルが見つかりません。設定でスキャンディレクトリを追加してください。',
  scanFailed: 'スキャンに失敗しました: ',
  ffprobeNotFound: 'ffprobeが見つかりません。動画の技術情報は利用できません。ffmpegをインストールしてください。',

  // Search
  searchPlaceholder: 'ファイル名、タイトル、俳優、スタジオで検索...',

  // Table columns
  colFileName: 'ファイル名',
  colCodec: 'コーデック',
  colResolution: '解像度',
  colDuration: '再生時間',
  colBitrate: 'ビットレート',
  colSize: 'サイズ',
  colNfo: 'NFO',
  nfoYes: 'あり',
  nfoNo: 'なし',
  filterHasNfo: 'NFOあり',
  filterNoNfo: 'NFOなし',

  // Context menu
  play: '再生',
  openFolder: 'フォルダを開く',
  deleteFolder: 'フォルダを削除',
  deleteConfirmTitle: '削除の確認',
  deleteConfirmContent: '以下のフォルダを削除してもよろしいですか？\n\n{path}\n\nこの操作は元に戻せません！',
  deleteSuccess: 'フォルダを削除しました',
  deleteFailed: '削除に失敗しました: ',

  // Property panel
  selectVideo: 'リストから動画を選択してください',
  loadingNfoTip: 'NFO読み込み中...',
  edit: '編集',
  cancel: 'キャンセル',
  confirm: 'OK',
  noNfoInfo: 'NFO情報がありません',
  createNfo: 'NFOを作成',
  editProperties: 'プロパティを編集',
  newNfo: '新規NFO',
  saveNfo: 'NFOを保存',
  nfoSaveSuccess: 'NFOを保存しました',
  nfoSaveFailed: '保存に失敗しました: ',
  nfoSaveError: 'NFOの保存に失敗しました: ',
  nfoReadError: 'NFOの読み込みに失敗しました: ',

  // Property labels
  labelOriginalTitle: '原題',
  labelYear: '年',
  labelPremiered: '公開日',
  labelRuntime: '再生時間',
  labelMinutes: '分',
  labelMpaa: 'レーティング',
  labelRating: '評価',
  labelPlot: 'あらすじ',
  labelOutline: '概要',
  labelTagline: 'タグライン',
  labelGenres: 'ジャンル',
  labelDirectors: '監督',
  labelStudios: 'スタジオ',
  labelCountries: '国/地域',
  labelTags: 'タグ',
  labelActors: '出演者',
  labelTrailer: '予告編',

  // Form placeholders
  phTitle: '映画タイトル',
  phOriginalTitle: '原題',
  phYear: '2024',
  phPremiered: '2024-01-15',
  phRuntime: '120',
  phMpaa: 'PG-13',
  phRating: '1-10',
  phPlot: '映画のあらすじ...',
  phOutline: '一行の概要',
  phTagline: '映画のタグライン',
  phGenres: 'ジャンルを追加（例：アクション、コメディ）',
  phDirectors: '監督を追加',
  phStudios: 'スタジオを追加',
  phCountries: '国を追加',
  phTags: 'タグを追加',
  phTrailer: 'https://...',
  phActorName: '俳優名',
  phActorRole: '役名',

  // Form labels (edit mode)
  formTitle: 'タイトル',
  formOriginalTitle: '原題',
  formYear: '年',
  formPremiered: '公開日',
  formRuntime: '再生時間（分）',
  formMpaa: 'レーティング',
  formRating: '評価',
  formPlot: 'あらすじ',
  formOutline: '概要',
  formTagline: 'タグライン',
  formGenres: 'ジャンル',
  formDirectors: '監督',
  formStudios: 'スタジオ',
  formCountries: '国/地域',
  formTags: 'タグ',
  formTrailer: '予告編URL',
  formActors: '出演者',
  addActor: '出演者を追加',

  // Settings
  settingsTitle: '設定',
  settingsScanDirs: 'スキャンディレクトリ',
  settingsLanguage: '表示言語',
  addScanDir: 'スキャンディレクトリを追加',
  noDirsHint: 'スキャンディレクトリがありません。上のボタンをクリックして追加してください。',
  dirAdded: 'ディレクトリを追加しました',
  dirRemoved: 'ディレクトリを削除しました',
  addDirFailed: 'ディレクトリの追加に失敗しました: ',
  removeDirFailed: 'ディレクトリの削除に失敗しました: ',
  loadSettingsFailed: '設定の読み込みに失敗しました: ',
  remove: '削除',
  close: '閉じる',

  // Tabs
  tabList: 'リスト',
  tabSettings: '設定',
  tabAbout: 'について',

  // View mode
  viewList: 'リスト',
  viewGrid: 'サムネイル',

  // Common
  save: '保存',

  // About
  aboutDescription: '動画ファイルNFO情報管理ツール'
}

export default ja
