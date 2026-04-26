const STALE_MS = 30_000;

interface Entry<T> {
  data: T | null;
  fetchedAt: number;
  inflight: Promise<T> | null;
}

const cache = new Map<string, Entry<unknown>>();

export function peekStats<T>(key: string): T | undefined {
  const entry = cache.get(key) as Entry<T> | undefined;
  if (!entry?.data) return undefined;
  if (Date.now() - entry.fetchedAt > STALE_MS) return undefined;
  return entry.data;
}

export async function fetchStats<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = cache.get(key) as Entry<T> | undefined;
  if (existing?.inflight) return existing.inflight;
  if (existing?.data && Date.now() - existing.fetchedAt < STALE_MS) {
    return existing.data;
  }

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, fetchedAt: Date.now(), inflight: null });
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
  });
  return promise;
}

export function invalidateStats(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
