import type { TranslationKeys } from './zh'

const en: Record<TranslationKeys, string> = {
  // App header
  appTitle: 'Movie Info Manager',
  scan: 'Scan',
  settings: 'Settings',

  // Scanning status
  scanning: 'Scanning... found {count} video files',
  loadingMetadata: 'Loading video info... {count} movies',
  loadingNfo: 'Loading NFO data... {count} movies',
  totalMovies: '{count} movies ({files} files)',
  searchResult: 'Found {found} / {total} movies',
  noVideosFound: 'No video files found. Please add scan directories in settings.',
  scanFailed: 'Scan failed: ',
  ffprobeNotFound: 'ffprobe not found. Video technical info will not be available. Please install ffmpeg.',

  // Search
  searchPlaceholder: 'Search filename, title, actors, studios...',

  // Table columns
  colFileName: 'Filename',
  colCodec: 'Codec',
  colResolution: 'Resolution',
  colDuration: 'Duration',
  colBitrate: 'Bitrate',
  colSize: 'Size',
  colNfo: 'NFO',
  nfoYes: 'Yes',
  nfoNo: 'No',
  filterHasNfo: 'Has NFO',
  filterNoNfo: 'No NFO',

  // Context menu
  play: 'Play',
  openFolder: 'Open in folder',
  deleteFolder: 'Delete folder',
  deleteConfirmTitle: 'Confirm Delete',
  deleteConfirmContent: 'Are you sure you want to delete the following folder?\n\n{path}\n\nThis action cannot be undone!',
  deleteSuccess: 'Folder deleted',
  deleteFailed: 'Delete failed: ',

  // Property panel
  selectVideo: 'Select a video from the list',
  loadingNfoTip: 'Loading NFO...',
  edit: 'Edit',
  cancel: 'Cancel',
  confirm: 'OK',
  noNfoInfo: 'No NFO information',
  createNfo: 'Create NFO',
  editProperties: 'Edit Properties',
  newNfo: 'New NFO',
  saveNfo: 'Save NFO',
  nfoSaveSuccess: 'NFO saved successfully',
  nfoSaveFailed: 'Save failed: ',
  nfoSaveError: 'Failed to save NFO: ',
  nfoReadError: 'Failed to read NFO: ',

  // Property labels
  labelOriginalTitle: 'Original Title',
  labelYear: 'Year',
  labelPremiered: 'Release Date',
  labelRuntime: 'Runtime',
  labelMinutes: 'min',
  labelMpaa: 'MPAA',
  labelRating: 'Rating',
  labelPlot: 'Plot',
  labelOutline: 'Outline',
  labelTagline: 'Tagline',
  labelGenres: 'Genres',
  labelDirectors: 'Directors',
  labelStudios: 'Studios',
  labelCountries: 'Countries',
  labelTags: 'Tags',
  labelActors: 'Actors',
  labelTrailer: 'Trailer',

  // Form placeholders
  phTitle: 'Movie title',
  phOriginalTitle: 'Original title',
  phYear: '2024',
  phPremiered: '2024-01-15',
  phRuntime: '120',
  phMpaa: 'PG-13',
  phRating: '1-10',
  phPlot: 'Movie synopsis...',
  phOutline: 'One-line summary',
  phTagline: 'Movie tagline',
  phGenres: 'Add genres (e.g. Action, Comedy)',
  phDirectors: 'Add directors',
  phStudios: 'Add studios',
  phCountries: 'Add countries',
  phTags: 'Add tags',
  phTrailer: 'https://...',
  phActorName: 'Actor name',
  phActorRole: 'Role',

  // Form labels (edit mode)
  formTitle: 'Title',
  formOriginalTitle: 'Original Title',
  formYear: 'Year',
  formPremiered: 'Release Date',
  formRuntime: 'Runtime (min)',
  formMpaa: 'MPAA Rating',
  formRating: 'Rating',
  formPlot: 'Plot',
  formOutline: 'Outline',
  formTagline: 'Tagline',
  formGenres: 'Genres',
  formDirectors: 'Directors',
  formStudios: 'Studios',
  formCountries: 'Countries',
  formTags: 'Tags',
  formTrailer: 'Trailer URL',
  formActors: 'Actors',
  addActor: 'Add Actor',

  // Settings
  settingsTitle: 'Settings',
  settingsScanDirs: 'Scan Directories',
  settingsLanguage: 'Language',
  addScanDir: 'Add scan directory',
  noDirsHint: 'No scan directories. Click the button above to add one.',
  dirAdded: 'Directory added',
  dirRemoved: 'Directory removed',
  addDirFailed: 'Failed to add directory: ',
  removeDirFailed: 'Failed to remove directory: ',
  loadSettingsFailed: 'Failed to load settings: ',
  remove: 'Remove',
  close: 'Close',

  // Tabs
  tabList: 'List',
  tabSettings: 'Settings',
  tabAbout: 'About',

  // View mode
  viewList: 'List',
  viewGrid: 'Grid',

  // Common
  save: 'Save',

  // About
  aboutDescription: 'Video file NFO information manager',
  aboutVersion: 'Version',
  aboutAuthor: 'Author',
  aboutHomepage: 'Homepage',
  aboutTechStack: 'Tech Stack',
  aboutLicense: 'License',
  aboutElectron: 'Electron',
  aboutChrome: 'Chrome',
  aboutNode: 'Node.js',
  aboutFeedback: 'Feedback',
  aboutFeedbackDesc: 'If you encounter issues or have feature requests, please submit them via GitHub Issues.',
  aboutChangelog: 'Changelog',
  aboutChangelogV011: 'Fixed Windows build error',
  aboutChangelogV010: 'Initial project release'
}

export default en
