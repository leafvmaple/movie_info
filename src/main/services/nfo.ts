import { readFile, writeFile, copyFile } from 'fs/promises'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { NfoData, NfoActor, NfoRating } from '../../common/types'

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  trimValues: true,
  isArray: (name: string): boolean => {
    // These tags can appear multiple times
    return [
      'genre',
      'director',
      'credits',
      'studio',
      'country',
      'tag',
      'actor',
      'rating',
      'thumb',
      'uniqueid'
    ].includes(name)
  }
}

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: false,
  suppressBooleanAttributes: false
}

/**
 * Read and parse an NFO file (Kodi XML format).
 */
export async function readNfo(nfoPath: string): Promise<NfoData> {
  const content = await readFile(nfoPath, 'utf-8')
  const parser = new XMLParser(parserOptions)
  const parsed = parser.parse(content)

  const movie = parsed.movie || {}

  return normalizeNfoData(movie)
}

/**
 * Save NFO data back to file (creates backup first).
 */
export async function saveNfo(nfoPath: string, data: NfoData): Promise<void> {
  // Backup original file
  try {
    await copyFile(nfoPath, `${nfoPath}.bak`)
  } catch {
    // File might not exist yet (creating new NFO)
  }

  const movieObj = denormalizeNfoData(data)
  const builder = new XMLBuilder(builderOptions)
  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    builder.build({ movie: movieObj })

  await writeFile(nfoPath, xml, 'utf-8')
}

/**
 * Normalize raw parsed XML data into our NfoData structure.
 */
function normalizeNfoData(movie: Record<string, unknown>): NfoData {
  return {
    title: getString(movie.title),
    originaltitle: getString(movie.originaltitle),
    sorttitle: getString(movie.sorttitle),
    year: getString(movie.year),
    premiered: getString(movie.premiered),
    plot: getString(movie.plot),
    outline: getString(movie.outline),
    tagline: getString(movie.tagline),
    runtime: getString(movie.runtime),
    mpaa: getString(movie.mpaa),
    genres: toStringArray(movie.genre),
    directors: toStringArray(movie.director),
    credits: toStringArray(movie.credits),
    studios: toStringArray(movie.studio),
    countries: toStringArray(movie.country),
    tags: toStringArray(movie.tag),
    actors: parseActors(movie.actor),
    ratings: parseRatings(movie.ratings),
    userrating: getString(movie.userrating),
    uniqueids: parseUniqueIds(movie.uniqueid),
    poster: parsePosterThumb(movie.thumb),
    fanart: parseFanart(movie.fanart),
    trailer: getString(movie.trailer)
  }
}

/**
 * Convert NfoData back to XML-compatible object structure.
 */
function denormalizeNfoData(data: NfoData): Record<string, unknown> {
  const movie: Record<string, unknown> = {}

  if (data.title) movie.title = data.title
  if (data.originaltitle) movie.originaltitle = data.originaltitle
  if (data.sorttitle) movie.sorttitle = data.sorttitle
  if (data.year) movie.year = data.year
  if (data.premiered) movie.premiered = data.premiered
  if (data.plot) movie.plot = data.plot
  if (data.outline) movie.outline = data.outline
  if (data.tagline) movie.tagline = data.tagline
  if (data.runtime) movie.runtime = data.runtime
  if (data.mpaa) movie.mpaa = data.mpaa
  if (data.userrating) movie.userrating = data.userrating
  if (data.trailer) movie.trailer = data.trailer

  // Multi-value fields
  if (data.genres.length) movie.genre = data.genres
  if (data.directors.length) movie.director = data.directors
  if (data.credits.length) movie.credits = data.credits
  if (data.studios.length) movie.studio = data.studios
  if (data.countries.length) movie.country = data.countries
  if (data.tags.length) movie.tag = data.tags

  // Actors
  if (data.actors.length) {
    movie.actor = data.actors.map((a) => {
      const actorObj: Record<string, unknown> = { name: a.name }
      if (a.role) actorObj.role = a.role
      if (a.order !== undefined) actorObj.order = a.order
      if (a.thumb) actorObj.thumb = a.thumb
      return actorObj
    })
  }

  // Ratings
  if (data.ratings.length) {
    movie.ratings = {
      rating: data.ratings.map((r) => ({
        '@_name': r.name,
        '@_max': r.max,
        '@_default': r.default,
        value: r.value,
        votes: r.votes
      }))
    }
  }

  // Unique IDs
  const uidEntries = Object.entries(data.uniqueids)
  if (uidEntries.length) {
    movie.uniqueid = uidEntries.map(([type, value]) => ({
      '@_type': type,
      '#text': value
    }))
  }

  return movie
}

// --- Helpers ---

function getString(val: unknown): string {
  if (val === undefined || val === null) return ''
  return String(val)
}

function toStringArray(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(String)
  return [String(val)]
}

function parseActors(val: unknown): NfoActor[] {
  if (!val) return []
  const arr = Array.isArray(val) ? val : [val]
  return arr.map((a: Record<string, unknown>) => ({
    name: getString(a.name),
    role: getString(a.role),
    order: typeof a.order === 'number' ? a.order : undefined,
    thumb: getString(a.thumb) || undefined
  }))
}

function parseRatings(val: unknown): NfoRating[] {
  if (!val) return []
  const ratings = (val as Record<string, unknown>).rating
  if (!ratings) return []
  const arr = Array.isArray(ratings) ? ratings : [ratings]
  return arr.map((r: Record<string, unknown>) => ({
    name: getString(r['@_name']),
    value: Number(r.value) || 0,
    votes: Number(r.votes) || 0,
    max: Number(r['@_max']) || 10,
    default: Boolean(r['@_default'])
  }))
}

function parseUniqueIds(val: unknown): Record<string, string> {
  if (!val) return {}
  const arr = Array.isArray(val) ? val : [val]
  const result: Record<string, string> = {}
  for (const uid of arr) {
    if (typeof uid === 'object' && uid !== null) {
      const obj = uid as Record<string, unknown>
      const type = getString(obj['@_type']) || 'default'
      result[type] = getString(obj['#text'])
    }
  }
  return result
}

function parsePosterThumb(val: unknown): string {
  if (!val) return ''
  if (Array.isArray(val)) {
    // Find poster aspect
    const poster = val.find(
      (t: Record<string, unknown>) =>
        t['@_aspect'] === 'poster' || typeof t === 'string'
    )
    if (poster) {
      return typeof poster === 'string' ? poster : getString(poster['#text'])
    }
    return ''
  }
  if (typeof val === 'string') return val
  return getString((val as Record<string, unknown>)['#text'])
}

function parseFanart(val: unknown): string {
  if (!val) return ''
  const fanart = val as Record<string, unknown>
  const thumb = fanart.thumb
  if (Array.isArray(thumb) && thumb.length > 0) {
    const first = thumb[0]
    return typeof first === 'string' ? first : getString(first['#text'])
  }
  if (typeof thumb === 'string') return thumb
  if (thumb && typeof thumb === 'object') {
    return getString((thumb as Record<string, unknown>)['#text'])
  }
  return ''
}

/**
 * Create a default empty NfoData object.
 */
export function createEmptyNfo(): NfoData {
  return {
    title: '',
    originaltitle: '',
    sorttitle: '',
    year: '',
    premiered: '',
    plot: '',
    outline: '',
    tagline: '',
    runtime: '',
    mpaa: '',
    genres: [],
    directors: [],
    credits: [],
    studios: [],
    countries: [],
    tags: [],
    actors: [],
    ratings: [],
    userrating: '',
    uniqueids: {},
    poster: '',
    fanart: '',
    trailer: ''
  }
}
