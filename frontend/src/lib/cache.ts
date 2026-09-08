/**
 * Business OS — Production In-Memory & Namespaced TTL Cache
 *
 * Provides tenant-isolated, low-latency caching for workspace configurations,
 * role permissions, and project metadata with explicit invalidation strategies.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tenantId: string;
  namespace: string;
}

class TenantCache {
  private store = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;

  private makeKey(tenantId: string, namespace: string, key: string): string {
    return `${tenantId}::${namespace}::${key}`;
  }

  private pruneExpired() {
    if (this.store.size < 500) return;
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  get<T>(tenantId: string, namespace: string, key: string): T | null {
    const fullKey = this.makeKey(tenantId, namespace, key);
    const entry = this.store.get(fullKey);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(fullKey);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  set<T>(tenantId: string, namespace: string, key: string, value: T, ttlSeconds = 300): void {
    this.pruneExpired();
    const fullKey = this.makeKey(tenantId, namespace, key);
    this.store.set(fullKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tenantId,
      namespace,
    });
  }

  /**
   * Fetch with fallback generator — gets from cache or computes and caches.
   */
  async wrap<T>(
    tenantId: string,
    namespace: string,
    key: string,
    fallback: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cached = this.get<T>(tenantId, namespace, key);
    if (cached !== null) return cached;

    const fresh = await fallback();
    this.set<T>(tenantId, namespace, key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Invalidate a single key.
   */
  invalidate(tenantId: string, namespace: string, key: string): void {
    this.store.delete(this.makeKey(tenantId, namespace, key));
  }

  /**
   * Invalidate all keys for a given namespace in a tenant.
   */
  invalidateNamespace(tenantId: string, namespace: string): void {
    const prefix = `${tenantId}::${namespace}::`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalidate all entries for an entire tenant/workspace.
   */
  invalidateTenant(tenantId: string): void {
    const prefix = `${tenantId}::`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Cache telemetry metrics.
   */
  getMetrics() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? Math.round((this.hits / totalRequests) * 100) : 0;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRatePercent: hitRate,
    };
  }
}

const globalCache = globalThis as unknown as { __appCache?: TenantCache };
export const cache = globalCache.__appCache ?? (globalCache.__appCache = new TenantCache());
