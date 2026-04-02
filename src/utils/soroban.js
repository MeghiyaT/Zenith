/**
 * Soroban utility — frontend integration for the PaymentRecord contract
 *
 * Handles contract invocations via Soroban RPC on testnet.
 * Uses a funded testnet keypair for signing contract calls (no extra wallet popup).
 * The contract is a record-keeping layer only — it does not hold funds.
 *
 * CONTRACT STATUS: The source code is in /contracts/payment_record/.
 * To deploy: `soroban contract deploy --wasm target/wasm32-unknown-unknown/release/payment_record.wasm --network testnet`
 * The contract ID below should be updated after deployment.
 */
import * as StellarSdk from '@stellar/stellar-sdk';
import { get as cacheGet, set as cacheSet } from '../lib/cache';

// ─── Configuration ───────────────────────────────────────────
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const SorobanRpc = StellarSdk.rpc || StellarSdk.SorobanRpc;

/**
 * Contract ID on Soroban testnet.
 * Update this after deploying via `soroban contract deploy`.
 * The contract source is in /contracts/payment_record/src/lib.rs
 */
export const CONTRACT_ID = 'CDQK7PDQQIDV25QN6XDEGFD3SADJCXIT5KAJ566OBGUBGWA74MPUTQUK';

/**
 * Funded testnet keypair used for signing contract calls.
 * This keeps the UX seamless — no second wallet popup.
 * TESTNET ONLY. Never use real keys here.
 */
const CONTRACT_SIGNER_SECRET = 'SAI22C2Z2OK53VRGP4W5YNYPAR74YSSAMOFQOER2JYQF4NHPR5GVQUQA';

// Lazy-initialised — deferred until first call so the stellar-sdk and Buffer
// polyfill are fully ready in the browser context.
let _contractSignerKeypair = undefined; // undefined = not yet attempted
let _contractSignerInitError = null;

function getContractSignerKeypair() {
  if (_contractSignerKeypair !== undefined) return _contractSignerKeypair;
  try {
    // Prefer runtime-injected secret (Vite) and normalize accidental whitespace/newlines.
    const configuredSecret =
      (typeof import.meta !== 'undefined' ? import.meta?.env?.VITE_CONTRACT_SIGNER_SECRET : null) ||
      CONTRACT_SIGNER_SECRET;
    const secret = typeof configuredSecret === 'string' ? configuredSecret.trim() : '';

    if (!secret) {
      throw new Error('Missing signer secret (set VITE_CONTRACT_SIGNER_SECRET and restart the Vite dev server)');
    }

    if (!StellarSdk.StrKey.isValidEd25519SecretSeed(secret)) {
      throw new Error('Invalid Stellar secret seed format/checksum');
    }

    _contractSignerKeypair = StellarSdk.Keypair.fromSecret(secret);
  } catch (err) {
    _contractSignerInitError = err?.message || String(err);
    console.error('[Soroban] Could not initialize contract signer keypair:', err);
    _contractSignerKeypair = null;
  }
  return _contractSignerKeypair;
}

// ─── Helper: Get Soroban server ───────────────────────────────
function getSorobanServer() {
  if (!SorobanRpc?.Server) {
    throw new Error('Soroban RPC client not available in current @stellar/stellar-sdk build');
  }
  return new SorobanRpc.Server(SOROBAN_RPC_URL);
}

// ─── Helper: Convert XLM string to stroops (i128) ─────────────
function xlmToStroops(xlmAmount) {
  const num = parseFloat(xlmAmount);
  return Math.round(num * 10_000_000);
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Record a payment intent on the Soroban contract.
 *
 * This is a best-effort call — if it fails, the XLM send should not be blocked.
 *
 * @param {string} senderPublicKey - sender G-address
 * @param {string} recipientPublicKey - recipient G-address
 * @param {string} amount - XLM amount as string
 * @returns {Promise<{ paymentId: number | null, success: boolean, error?: string }>}
 */
export async function recordPaymentOnContract(senderPublicKey, recipientPublicKey, amount) {
  // If contract signer is not available, return graceful degradation
  const signerKeypair = getContractSignerKeypair();
  if (!signerKeypair) {
    return {
      paymentId: null,
      success: false,
      error: _contractSignerInitError || 'Contract signer not configured',
    };
  }

  try {
    const server = getSorobanServer();

    // Load the signer's account
    const signerPublicKey = signerKeypair.publicKey();
    const account = await server.getAccount(signerPublicKey);

    // Convert amount to stroops for i128
    const stroops = xlmToStroops(amount);

    // Build the contract call
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'record_payment',
          StellarSdk.nativeToScVal(senderPublicKey, { type: 'address' }),
          StellarSdk.nativeToScVal(recipientPublicKey, { type: 'address' }),
          StellarSdk.nativeToScVal(stroops, { type: 'i128' }),
        )
      )
      .setTimeout(30)
      .build();

    // Simulate the transaction first
    const simulated = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      const errMsg = simulated.error || 'Simulation failed';
      console.warn('[Soroban] Simulation error:', errMsg);
      return { paymentId: null, success: false, error: errMsg };
    }

    // Prepare the transaction with the simulation result
    const prepared = SorobanRpc.assembleTransaction(tx, simulated).build();

    // Sign with the app keypair
    prepared.sign(signerKeypair);

    // Submit
    const sendResponse = await server.sendTransaction(prepared);

    if (sendResponse.status === 'ERROR') {
      console.warn('[Soroban] Send error:', sendResponse.errorResult);
      return { paymentId: null, success: false, error: 'Transaction send failed' };
    }

    // Poll for result
    let getResponse;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      getResponse = await server.getTransaction(sendResponse.hash);

      if (getResponse.status === 'SUCCESS') {
        // Extract payment_id from return value
        const returnVal = getResponse.returnValue;
        const paymentId = returnVal ? Number(StellarSdk.scValToNative(returnVal)) : null;
        return { paymentId, success: true };
      }

      if (getResponse.status === 'FAILED') {
        console.warn('[Soroban] Transaction failed on-chain');
        return { paymentId: null, success: false, error: 'Contract transaction failed' };
      }

      // Still pending — wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    return { paymentId: null, success: false, error: 'Contract call timed out' };
  } catch (err) {
    console.warn('[Soroban] recordPaymentOnContract error:', err?.message || err);
    return { paymentId: null, success: false, error: err?.message || 'Contract call failed' };
  }
}

/**
 * Get a payment record from the contract by ID.
 *
 * @param {number} paymentId - the ID returned by record_payment
 * @returns {Promise<{ record: object | null, success: boolean, error?: string }>}
 */
export async function getPaymentFromContract(paymentId) {
  try {
    const cached = cacheGet(`contract:${paymentId}`);
    if (cached) {
      return { record: cached.value, success: true };
    }

    const server = getSorobanServer();
    const keypair = getContractSignerKeypair();
    const signerPublicKey = keypair?.publicKey();

    if (!signerPublicKey) {
      return {
        record: null,
        success: false,
        error: _contractSignerInitError || 'Contract signer not configured',
      };
    }

    const account = await server.getAccount(signerPublicKey);
    const contract = new StellarSdk.Contract(CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_payment',
          StellarSdk.nativeToScVal(paymentId, { type: 'u32' }),
        )
      )
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      return { record: null, success: false, error: simulated.error || 'Simulation failed' };
    }

    // Extract the return value from simulation
    const returnVal = simulated.result?.retval;
    if (returnVal) {
      const record = StellarSdk.scValToNative(returnVal);
      cacheSet(`contract:${paymentId}`, record, Infinity);
      return { record, success: true };
    }

    return { record: null, success: false, error: 'No return value' };
  } catch (err) {
    console.warn('[Soroban] getPaymentFromContract error:', err?.message || err);
    return { record: null, success: false, error: err?.message || 'Query failed' };
  }
}
