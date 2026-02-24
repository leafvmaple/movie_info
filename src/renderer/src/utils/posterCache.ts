/**
 * Shared poster cache — avoids duplicate IPC calls across VideoList and CollectionView.
 * Call `clearPosterCache()` on rescan to discard stale data.
 */

const cache = new Map<string, string | null>()
const loading = new Set<string>()

/** Check if a poster is already cached */
export function hasPoster(key: string): boolean {
  return cache.has(key)
}

/** Get a cached poster URI (may be null = no poster found) */
export function getPoster(key: string): string | null {
  return cache.get(key) ?? null
}

/** Returns true if a load is already in-flight for this key */
export function isLoading(key: string): boolean {
  return loading.has(key)
}

/** Mark a key as being loaded */
export function markLoading(key: string): void {
  loading.add(key)
}

/** Store a poster URI (or null) in the cache */
export function setPoster(key: string, uri: string | null): void {
  cache.set(key, uri)
  loading.delete(key)
}

/** Clear all cached posters and loading state (call on rescan) */
export function clearPosterCache(): void {
  cache.clear()
  loading.clear()
}
