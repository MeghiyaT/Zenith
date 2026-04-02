/**
 * format.test.ts — PRD v1.2 section D.2 Test 3
 *
 * Tests: formatXLM() from src/utils/format.js
 *
 * Required cases (all must pass):
 *  1. 10000000 stroops formats to "1.0000000 XLM"
 *  2. 0 formats to "0.0000000 XLM"
 *  3. Values above 7 decimal places are truncated, not rounded
 *  4. Output never uses scientific notation for any valid stroop value
 */

import { describe, it, expect } from 'vitest';
import { formatXLM } from '../utils/format.js';

describe('formatXLM', () => {
  it('10000000 stroops formats to "1.0000000 XLM"', () => {
    expect(formatXLM(10_000_000)).toBe('1.0000000 XLM');
  });

  it('0 stroops formats to "0.0000000 XLM"', () => {
    expect(formatXLM(0)).toBe('0.0000000 XLM');
  });

  it('truncates, not rounds, beyond 7 decimal places', () => {
    // 1 stroop is exactly 0.0000001 XLM — no truncation needed
    expect(formatXLM(1)).toBe('0.0000001 XLM');

    // 15000000 stroops = 1.5000000 XLM exactly
    expect(formatXLM(15_000_000)).toBe('1.5000000 XLM');

    // 12345678 stroops = 1.2345678 XLM — 8 digits, truncated to 7
    expect(formatXLM(12_345_678)).toBe('1.2345678 XLM');

    // 99999999 stroops = 9.9999999 XLM — exactly 7 decimal places
    expect(formatXLM(99_999_999)).toBe('9.9999999 XLM');
  });

  it('never uses scientific notation for any valid stroop value', () => {
    // Very large value: 1 billion XLM in stroops
    const largeStroops = 1_000_000_000 * 10_000_000; // 10^16
    const result = formatXLM(largeStroops);
    expect(result).not.toMatch(/e/i); // no scientific notation
    expect(result).toContain('XLM');

    // Very small value: 1 stroop
    const smallResult = formatXLM(1);
    expect(smallResult).not.toMatch(/e/i);
    expect(smallResult).toContain('XLM');
  });
});
