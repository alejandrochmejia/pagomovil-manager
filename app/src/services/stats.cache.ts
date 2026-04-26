const DEFAULT_TTL_MS = 60_000;
const STORAGE_PREFIX = 'pagomovil_stats:';

interface Entry<T> {
  data: T | null;
  fetchedAt: number;
  inflight: Promise<T> | null;
  persist?: boolean;
}

interface PersistedShape<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, Entry<unknown>>();

function writePersisted(key: string, data: unknown, fetchedAt: number): void {
  try {
    const payload: PersistedShape<unknown> = { data, fetchedAt };
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch {
    // quota exceeded, private mode, or storage unavailable
  }
}

function removePersisted(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

function sweepPersisted(prefix?: string): void {
  try {
    const fullPrefix = STORAGE_PREFIX + (prefix ?? '');
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(fullPrefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

(function hydrate() {
  if (typeof localStorage === 'undefined') return;
  try {
    const expired: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (!fullKey?.startsWith(STORAGE_PREFIX)) continue;
      const key = fullKey.slice(STORAGE_PREFIX.length);
      const raw = localStorage.getItem(fullKey);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as PersistedShape<unknown>;
        if (Date.now() - parsed.fetchedAt > DEFAULT_TTL_MS) {
          expired.push(fullKey);
          continue;
        }
        cache.set(key, {
          data: parsed.data,
          fetchedAt: parsed.fetchedAt,
          inflight: null,
          persist: true,
        });
      } catch {
        expired.push(fullKey);
      }
    }
    for (const k of expired) localStorage.removeItem(k);
  } catch {
    // ignore
  }
})();

export function peekStats<T>(key: string): T | undefined {
  const entry = cache.get(key) as Entry<T> | undefined;
  if (!entry?.data) return undefined;
  if (Date.now() - entry.fetchedAt > DEFAULT_TTL_MS) return undefined;
  return entry.data;
}

export interface FetchStatsOptions {
  persist?: boolean;
}

export async function fetchStats<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: FetchStatsOptions = {},
): Promise<T> {
  const existing = cache.get(key) as Entry<T> | undefined;
  if (existing?.inflight) return existing.inflight;
  if (existing?.data && Date.now() - existing.fetchedAt < DEFAULT_TTL_MS) {
    return existing.data;
  }

  const persist = opts.persist ?? existing?.persist ?? false;

  const promise = fetcher()
    .then((data) => {
      const now = Date.now();
      cache.set(key, { data, fetchedAt: now, inflight: null, persist });
      if (persist) writePersisted(key, data, now);
      return data;
    })
    .catch((err) => {
      const e = cache.get(key) as Entry<T> | undefined;
      if (e) cache.set(key, { ...e, inflight: null });
      throw err;
    });

  cache.set(key, {
    data: existing?.data ?? null,
    fetchedAt: existing?.fetchedAt ?? 0,
    inflight: promise,
    persist,
  });
  return promise;
}

export function invalidateStats(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    sweepPersisted();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      const entry = cache.get(key);
      if (entry?.persist) removePersisted(key);
      cache.delete(key);
    }
  }
  sweepPersisted(prefix);
}
