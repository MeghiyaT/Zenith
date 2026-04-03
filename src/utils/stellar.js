/**
 * Stellar utility functions
 * Address validation, formatting, and Horizon API interactions
 */
import * as StellarSdk from '@stellar/stellar-sdk';
import { isValidStellarAddress } from './validation';

export { isValidStellarAddress };

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const BASE_RESERVE = 1; // 1 XLM
const SUBENTRY_RESERVE = 0.5; // 0.5 XLM per subentry
const BASE_FEE = '100'; // 100 stroops = 0.00001 XLM
const TX_TIMEOUT_SECONDS = 300;

/**
 * Truncate an address to first 4 + last 4 chars
 */
export function truncateAddress(address) {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Format XLM amount with comma separators
 */
export function formatXLM(amount, decimals = 7) {
  if (amount === null || amount === undefined) return '0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  
  const parts = num.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Remove trailing zeros but keep at least 2 decimals
  let decimal = parts[1];
  if (decimal) {
    decimal = decimal.replace(/0+$/, '');
    if (decimal.length < 2) decimal = decimal.padEnd(2, '0');
  }
  
  return `${parts[0]}.${decimal}`;
}

/**
 * Calculate minimum reserve for an account
 */
export function calculateReserve(subentryCount = 0) {
  return BASE_RESERVE + (subentryCount * SUBENTRY_RESERVE);
}

/**
 * Calculate available (spendable) balance
 */
export function calculateAvailableBalance(totalBalance, subentryCount = 0) {
  const reserve = calculateReserve(subentryCount);
  const fee = 0.00001;
  const available = parseFloat(totalBalance) - reserve - fee;
  return Math.max(0, available);
}

/**
 * Fetch account info from Horizon
 */
export async function fetchAccount(publicKey) {
  const server = new StellarSdk.Horizon.Server(HORIZON_URL);
  const account = await server.accounts().accountId(publicKey).call();
  
  const nativeBalance = account.balances.find(b => b.asset_type === 'native');
  const totalBalance = nativeBalance ? nativeBalance.balance : '0';
  const subentryCount = account.subentry_count || 0;
  
  return {
    publicKey,
    totalBalance,
    subentryCount,
    availableBalance: calculateAvailableBalance(totalBalance, subentryCount),
    reserve: calculateReserve(subentryCount),
    sequence: account.sequence,
  };
}

/**
 * Check if a destination account exists on Stellar
 */
export async function checkAccountExists(publicKey) {
  const server = new StellarSdk.Horizon.Server(HORIZON_URL);
  try {
    await server.accounts().accountId(publicKey).call();
    return true;
  } catch (err) {
    if (err?.response?.status === 404) return false;
    throw err;
  }
}

/**
 * Build a payment transaction
 */
export async function buildPaymentTransaction(senderPublicKey, recipientPublicKey, amount, memo) {
  const server = new StellarSdk.Horizon.Server(HORIZON_URL);
  const senderAccount = await server.loadAccount(senderPublicKey);
  
  const recipientExists = await checkAccountExists(recipientPublicKey);
  
  const operation = recipientExists
    ? StellarSdk.Operation.payment({
        destination: recipientPublicKey,
        asset: StellarSdk.Asset.native(),
        amount: parseFloat(amount).toFixed(7),
      })
    : StellarSdk.Operation.createAccount({
        destination: recipientPublicKey,
        startingBalance: parseFloat(amount).toFixed(7),
      });

  const builder = new StellarSdk.TransactionBuilder(senderAccount, {
    fee: BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  });

  builder.addOperation(operation);

  if (memo && memo.trim()) {
    builder.addMemo(StellarSdk.Memo.text(memo.trim()));
  }

  builder.setTimeout(TX_TIMEOUT_SECONDS);
  
  const transaction = builder.build();
  return transaction;
}

/**
 * Submit a signed transaction to Horizon
 */
export async function submitTransaction(signedXDR) {
  const server = new StellarSdk.Horizon.Server(HORIZON_URL);
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXDR,
    StellarSdk.Networks.TESTNET
  );
  const result = await server.submitTransaction(transaction);
  return result;
}

/**
 * Parse Horizon error into human-readable message
 */
export function parseHorizonError(error) {
  const extras = error?.response?.data?.extras;
  
  if (!extras) {
    if (error?.message?.includes('timeout') || error?.message?.includes('network')) {
      return 'Could not reach the Stellar network. Check your connection and try again.';
    }
    return error?.message || 'Transaction failed. Please try again.';
  }
  
  const resultCodes = extras.result_codes;
  
  if (resultCodes?.transaction === 'tx_bad_auth') {
    return 'Wallet rejected the transaction.';
  }
  
  if (resultCodes?.operations) {
    const opCode = resultCodes.operations[0];
    const opMessages = {
      'op_underfunded': 'Insufficient balance for this payment.',
      'op_no_destination': 'Recipient account does not exist on Stellar. They must be funded first.',
      'op_line_full': 'Recipient trustline is full.',
      'op_low_reserve': 'Transaction would leave your account below the minimum reserve.',
    };
    if (opMessages[opCode]) return opMessages[opCode];
  }

  if (resultCodes?.transaction === 'tx_too_late') {
    return 'Transaction expired before ledger inclusion. Please try again.';
  }

  return `Transaction failed: ${resultCodes?.transaction || 'unknown error'}. Please try again.`;
}

/**
 * Validate amount
 * Returns { valid: boolean, error?: string, truncated?: string }
 */
export function validateAmount(amount, availableBalance) {
  if (!amount || amount.trim() === '') {
    return { valid: false, error: null };
  }

  const cleaned = amount.replace(/,/g, '');

  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') {
    return { valid: false, error: 'Enter a valid number' };
  }

  const num = parseFloat(cleaned);

  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  // Truncate to 7 decimal places
  const parts = cleaned.split('.');
  let truncated = cleaned;
  if (parts[1] && parts[1].length > 7) {
    truncated = `${parts[0]}.${parts[1].slice(0, 7)}`;
  }

  if (num > availableBalance) {
    return { valid: false, error: 'Exceeds available balance', truncated };
  }

  return { valid: true, truncated };
}

/**
 * Get the explorer URL for a transaction
 */
export function getExplorerUrl(hash) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

/**
 * Fetch recent payment history for an account
 * Returns normalized array of payment objects
 */
export async function fetchPaymentHistory(publicKey, limit = 20) {
  const server = new StellarSdk.Horizon.Server(HORIZON_URL);
  const operations = await server
    .operations()
    .forAccount(publicKey)
    .limit(limit)
    .order('desc')
    .call();

  return operations.records
    .filter(r => 
      r.type === 'payment' || 
      r.type === 'create_account'
    )
    .map(record => {
      const isPayment = record.type === 'payment';
      const isIncoming = isPayment
        ? record.to === publicKey
        : record.account === publicKey && record.source_account !== publicKey;

      return {
        id: record.id,
        type: record.type,
        from: isPayment ? record.from : record.source_account,
        to: isPayment ? record.to : record.account,
        amount: isPayment ? record.amount : (record.starting_balance || '0'),
        asset: isPayment ? (record.asset_type === 'native' ? 'XLM' : record.asset_code) : 'XLM',
        createdAt: record.created_at,
        hash: record.transaction_hash,
        isIncoming,
        isContractCall: false,
      };
    });
}
