/**
 * validation.js — standalone Stellar address validation
 *
 * Isolated from stellar.js so it can be unit-tested in a Node/Vitest
 * environment without importing the full @stellar/stellar-sdk bundle.
 *
 * A valid Stellar public key (G-address):
 *  - Starts with the letter 'G'
 *  - Is exactly 56 characters long
 *  - Contains only base-32 characters: A–Z and 2–7
 *
 * This is a pure-JS implementation consistent with the SDK's
 * StrKey.isValidEd25519PublicKey checks for the address format.
 */

const STELLAR_ADDRESS_LENGTH = 56;
const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

/**
 * Returns true if the provided string is a syntactically valid Stellar
 * G-address (Ed25519 public key encoded in base32).
 *
 * @param {string} address
 * @returns {boolean}
 */
export function isValidStellarAddress(address) {
  if (!address || typeof address !== 'string') return false;
  if (address.length !== STELLAR_ADDRESS_LENGTH) return false;
  return STELLAR_ADDRESS_REGEX.test(address);
}
