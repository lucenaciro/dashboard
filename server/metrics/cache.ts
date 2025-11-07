const METRICS_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number | null;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function getCachedMetric<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCachedMetric<T>(key: string, value: T, ttlMs: number = METRICS_CACHE_TTL_MS): void {
  cache.set(key, {
    value,
    expiresAt: ttlMs === 0 ? null : Date.now() + ttlMs,
  });
}

export function invalidateMetricsCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function metricsCacheKey(name: string, payload: unknown = {}): string {
  if (payload === null || typeof payload !== "object") {
    return `${name}:${String(payload)}`;
  }

  const entries = Object.entries(payload as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return `${name}:${JSON.stringify(entries)}`;
}
