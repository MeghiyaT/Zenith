/**
 * cache.test.ts — PRD v1.2 section D.2 Test 2
 *
 * Tests: the cache module from src/lib/cache.js
 *
 * Required cases (all must pass):
 *  1. set() then get() returns the correct value before TTL expires
 *  2. get() returns null after TTL has elapsed (uses fake timers)
 *  3. invalidate() causes the next get() to return null immediately
 *  4. A second set() on the same key overwrites the first value
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get, set, invalidate, _clear } from '../lib/cache.js';

// Reset the in-memory store before each test so cases are independent
beforeEach(() => {
  _clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('cache', () => {
  it('set() then get() returns the correct value before TTL expires', () => {
    set('foo', { balance: '100' }, 15_000);

    // Simulate 7 seconds passing — still within the 15s TTL
    vi.advanceTimersByTime(7_000);

    const entry = get('foo');
    expect(entry).not.toBeNull();
    expect(entry?.value).toEqual({ balance: '100' });
  });

  it('get() returns null after TTL has elapsed', () => {
    set('bar', { exists: true }, 60_000);

    // Advance past the TTL
    vi.advanceTimersByTime(60_001);

    const entry = get('bar');
    expect(entry).toBeNull();
  });

  it('invalidate() causes the next get() to return null immediately', () => {
    set('baz', { paymentId: 42 }, Infinity);

    // Should be cached
    expect(get('baz')).not.toBeNull();

    invalidate('baz');

    // Should be gone
    expect(get('baz')).toBeNull();
  });

  it('a second set() on the same key overwrites the first value', () => {
    set('key', 'first', 30_000);
    set('key', 'second', 30_000);

    const entry = get('key');
    expect(entry?.value).toBe('second');
  });
});
