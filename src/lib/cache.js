/**
 * cache.js — in-memory cache with TTL
 *
 * A minimal, isolated utility. No external libraries, no localStorage.
 * Conforms to PRD v1.2 section C.3.
 *
 * Exports:
 *   get(key)                   → CacheEntry | null
 *   set(key, value, ttlMs)     → void
 *   invalidate(key)            → void
 */

/** @type {Map<string, { value: unknown, fetchedAt: number, ttlMs: number }>} */
const store = new Map();

/**
 * Retrieve a cached entry if it exists and has not expired.
 * @param {string} key
 * @returns {{ value: unknown, fetchedAt: number } | null}
 */
export function get(key) {
  const entry = store.get(key);
  if (!entry) return null;

  // TTL of 0 or Infinity means cache indefinitely
  if (entry.ttlMs > 0 && entry.ttlMs !== Infinity) {
    const elapsed = Date.now() - entry.fetchedAt;
    if (elapsed > entry.ttlMs) {
      store.delete(key);
      return null;
    }
  }

  return { value: entry.value, fetchedAt: entry.fetchedAt };
}

/**
 * Store a value under the given key.
 * A second set() on the same key overwrites the first.
 * @param {string} key
 * @param {unknown} value
 * @param {number} ttlMs  Milliseconds until expiry. Pass Infinity for no expiry.
 */
export function set(key, value, ttlMs) {
  store.set(key, { value, fetchedAt: Date.now(), ttlMs });
}

/**
 * Remove a key immediately, regardless of TTL.
 * The next get() for this key will return null.
 * @param {string} key
 */
export function invalidate(key) {
  store.delete(key);
}

// Expose for tests / debug only — not part of the public surface
export function _getStore() {
  return store;
}

export function _clear() {
  store.clear();
}
