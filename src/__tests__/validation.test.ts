/**
 * validation.test.ts — PRD v1.2 section D.2 Test 1
 *
 * Tests: isValidStellarAddress() from src/utils/validation.js
 *
 * Required cases (all must pass):
 *  1. Valid G-address (56 chars) returns true
 *  2. Empty string returns false
 *  3. Address with invalid characters returns false
 *  4. Address that is 55 characters (one short) returns false
 *  5. Address starting with a non-G character returns false
 */

import { describe, it, expect } from 'vitest';
import { isValidStellarAddress } from '../utils/validation.js';

// Valid G-address: starts with G, exactly 56 chars, only A–Z and 2–7
// (contract signer pubkey from soroban.js, known to be a real Stellar address)
const VALID_ADDRESS = 'GDQK7PDQQIDV25QN6XDEGFD3SADJCXIT5KAJ566OBGUBGWA74MPUTQUK';

describe('isValidStellarAddress', () => {
  it('returns true for a valid 56-char G-address', () => {
    expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidStellarAddress('')).toBe(false);
  });

  it('returns false for an address containing invalid characters (lowercase)', () => {
    // Replace one char with a lowercase letter — not in base-32 alphabet
    const invalid = VALID_ADDRESS.slice(0, 10) + 'a' + VALID_ADDRESS.slice(11);
    expect(isValidStellarAddress(invalid)).toBe(false);
  });

  it('returns false for an address that is 55 characters (one short)', () => {
    const oneShort = VALID_ADDRESS.slice(0, 55); // 55 chars
    expect(oneShort.length).toBe(55);
    expect(isValidStellarAddress(oneShort)).toBe(false);
  });

  it('returns false for an address starting with a non-G character', () => {
    // Same length, same chars, but first char replaced with 'A'
    const nonG = 'A' + VALID_ADDRESS.slice(1);
    expect(isValidStellarAddress(nonG)).toBe(false);
  });
});
