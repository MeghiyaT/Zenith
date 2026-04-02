/**
 * usePaymentTracker — manages real-time payment tracking via Horizon SSE
 *
 * Features:
 * - Opens SSE stream per tracked address for real-time status updates
 * - Polls Horizon payments endpoint on initial connect
 * - Handles PENDING → CONFIRMED / FAILED transitions
 * - Session-scoped persistence via sessionStorage
 * - 15-second timeout detection for network errors
 * - Capped at 20 entries, 5 watch addresses
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const SESSION_PAYMENTS_KEY = 'zenith_tracker_payments';
const SESSION_ADDRESSES_KEY = 'zenith_tracker_addresses';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const MAX_PAYMENTS = 20;
const MAX_WATCH_ADDRESSES = 5;
const NETWORK_TIMEOUT_MS = 15000;

/** Payment status constants */
export const STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
};

/** Error type constants */
export const ERROR_TYPES = {
  REJECTED: 'REJECTED',
  NO_DESTINATION: 'NO_DESTINATION',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
};

const ERROR_MESSAGES = {
  [ERROR_TYPES.REJECTED]: 'Rejected by wallet',
  [ERROR_TYPES.NO_DESTINATION]: 'Recipient account does not exist',
  [ERROR_TYPES.NETWORK_TIMEOUT]: 'Network timeout — transaction status unknown',
};

function loadFromSession(key, fallback) {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage full or unavailable
  }
}

function clearTrackerSession() {
  sessionStorage.removeItem(SESSION_PAYMENTS_KEY);
  sessionStorage.removeItem(SESSION_ADDRESSES_KEY);
}

export default function usePaymentTracker(publicKey, connected) {
  const [payments, setPayments] = useState(() =>
    loadFromSession(SESSION_PAYMENTS_KEY, [])
  );
  const [watchAddresses, setWatchAddresses] = useState(() =>
    loadFromSession(SESSION_ADDRESSES_KEY, [])
  );

  // SSE connections map: address -> EventSource
  const sseRefs = useRef({});
  // Timeout timers map: address -> timeoutId
  const timeoutRefs = useRef({});
  // Track whether the SSE for an address has received at least one event
  const sseAliveRefs = useRef({});

  // SSE Stream state tracking (CONNECTING, LIVE, DISCONNECTED)
  const [streamState, setStreamState] = useState('DISCONNECTED');
  const reconnectAttempts = useRef({});
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Persist payments to sessionStorage on change
  useEffect(() => {
    saveToSession(SESSION_PAYMENTS_KEY, payments);
  }, [payments]);

  // Persist watch addresses
  useEffect(() => {
    saveToSession(SESSION_ADDRESSES_KEY, watchAddresses);
  }, [watchAddresses]);

  // Clear session on disconnect
  useEffect(() => {
    if (!connected) {
      closeAllSSE();
      clearTrackerSession();
      setPayments([]);
      setWatchAddresses([]);
    }
  }, [connected]);

  // --- SSE Management ---

  const closeSSE = useCallback((address) => {
    if (sseRefs.current[address]) {
      sseRefs.current[address].close();
      delete sseRefs.current[address];
    }
    if (timeoutRefs.current[address]) {
      clearTimeout(timeoutRefs.current[address]);
      delete timeoutRefs.current[address];
    }
    delete sseAliveRefs.current[address];
  }, []);

  const closeAllSSE = useCallback(() => {
    Object.keys(sseRefs.current).forEach(addr => closeSSE(addr));
  }, [closeSSE]);

  const openSSE = useCallback((address) => {
    // Close existing connection for this address first
    closeSSE(address);

    const url = `${HORIZON_URL}/accounts/${address}/payments?cursor=now&order=asc`;

    try {
      const es = new EventSource(url);
      sseRefs.current[address] = es;
      sseAliveRefs.current[address] = false;

      // Start network timeout
      timeoutRefs.current[address] = setTimeout(() => {
        if (!sseAliveRefs.current[address]) {
          setStreamState('DISCONNECTED');
          // Mark all PENDING payments for this address as timed out
          setPayments(prev => prev.map(p => {
            if (p.recipient === address && p.status === STATUS.PENDING) {
              return {
                ...p,
                status: STATUS.FAILED,
                errorType: ERROR_TYPES.NETWORK_TIMEOUT,
                errorMessage: ERROR_MESSAGES[ERROR_TYPES.NETWORK_TIMEOUT],
              };
            }
            return p;
          }));
        }
      }, NETWORK_TIMEOUT_MS);

      es.onopen = () => {
        setStreamState('LIVE');
      };

      es.onmessage = (event) => {
        sseAliveRefs.current[address] = true;

        // Clear timeout on first message
        if (timeoutRefs.current[address]) {
          clearTimeout(timeoutRefs.current[address]);
          delete timeoutRefs.current[address];
        }

        try {
          const data = JSON.parse(event.data);

          if (data.type === 'payment' || data.type === 'create_account') {
            const isOutgoing = data.type === 'payment'
              ? data.from === address
              : data.source_account === address;

            if (isOutgoing) {
              // Update matching PENDING payment to CONFIRMED
              setPayments(prev => {
                const recipient = data.type === 'payment' ? data.to : data.account;
                const amount = data.type === 'payment' ? data.amount : data.starting_balance;

                // Find matching pending payment
                const updated = prev.map(p => {
                  if (
                    p.status === STATUS.PENDING &&
                    p.recipient === recipient &&
                    p.senderAddress === address
                  ) {
                    return {
                      ...p,
                      status: STATUS.CONFIRMED,
                      txHash: data.transaction_hash,
                      horizonId: data.id,
                      confirmedAt: data.created_at,
                    };
                  }
                  return p;
                });

                return updated;
              });
            } else {
              // Incoming payment — if this is a watched address, add to tracker
              const sender = data.type === 'payment' ? data.from : data.source_account;
              const amount = data.type === 'payment' ? data.amount : data.starting_balance;

              setPayments(prev => {
                const newPayment = {
                  id: `sse-${data.id}`,
                  senderAddress: sender,
                  recipient: address,
                  amount,
                  status: STATUS.CONFIRMED,
                  timestamp: data.created_at,
                  confirmedAt: data.created_at,
                  txHash: data.transaction_hash,
                  horizonId: data.id,
                  isWatched: true,
                };
                const updated = [newPayment, ...prev].slice(0, MAX_PAYMENTS);
                return updated;
              });
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        // If SSE connection drops, start retry detection
        console.warn(`[SSE] Stream error for ${address}. Attempting reconnect...`);
        
        // Track attempts per address
        const attempts = (reconnectAttempts.current[address] || 0) + 1;
        reconnectAttempts.current[address] = attempts;

        if (attempts <= MAX_RECONNECT_ATTEMPTS) {
          setStreamState('CONNECTING');
          const delay = Math.min(1000 * Math.pow(2, attempts), 5000); // Max 5s backoff
          
          // Use setTimeout for retry
          setTimeout(() => {
            if (connected && (address === publicKey || watchAddresses.includes(address))) {
               openSSE(address);
            }
          }, delay);
        } else {
          setStreamState('DISCONNECTED');
          // If we hit max retries, mark pending ones as timeout
          if (!timeoutRefs.current[address]) {
            timeoutRefs.current[address] = setTimeout(() => {
              setPayments(prev => prev.map(p => {
                if (p.senderAddress === address && p.status === STATUS.PENDING) {
                  return {
                    ...p,
                    status: STATUS.FAILED,
                    errorType: ERROR_TYPES.NETWORK_TIMEOUT,
                    errorMessage: ERROR_MESSAGES[ERROR_TYPES.NETWORK_TIMEOUT],
                  };
                }
                return p;
              }));
            }, 1000);
          }
        }
      };
    } catch {
      // EventSource not supported or URL invalid
    }
  }, [closeSSE]);

  // Open SSE streams for user address + watch addresses when connected
  useEffect(() => {
    if (!connected || !publicKey) {
      setStreamState('DISCONNECTED');
      return;
    }

    setStreamState('CONNECTING');
    // Open SSE for user's own address
    openSSE(publicKey);

    // Open SSE for each watch address
    watchAddresses.forEach(addr => openSSE(addr));

    return () => {
      closeAllSSE();
    };
  }, [connected, publicKey]); // intentionally exclude watchAddresses to avoid re-opening all

  // Open/close SSE when watch addresses change
  useEffect(() => {
    if (!connected) return;

    // Close SSE for addresses no longer in the list
    Object.keys(sseRefs.current).forEach(addr => {
      if (addr !== publicKey && !watchAddresses.includes(addr)) {
        closeSSE(addr);
      }
    });

    // Open SSE for new addresses
    watchAddresses.forEach(addr => {
      if (!sseRefs.current[addr]) {
        openSSE(addr);
      }
    });
  }, [watchAddresses, connected, publicKey, openSSE, closeSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return () => closeAllSSE();
  }, [closeAllSSE]);

  // --- Public API ---

  /**
   * Add a payment entry to the tracker (called after broadcast)
   */
  const addPayment = useCallback((paymentData) => {
    const entry = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderAddress: paymentData.sender,
      recipient: paymentData.recipient,
      amount: paymentData.amount,
      status: STATUS.PENDING,
      timestamp: new Date().toISOString(),
      txHash: paymentData.txHash || null,
      contractPaymentId: paymentData.contractPaymentId || null,
      errorType: null,
      errorMessage: null,
      isWatched: false,
    };

    setPayments(prev => [entry, ...prev].slice(0, MAX_PAYMENTS));
    return entry.id;
  }, []);

  /**
   * Mark a payment as confirmed (for immediate confirmation from Horizon response)
   */
  const confirmPayment = useCallback((paymentId, txHash) => {
    setPayments(prev => prev.map(p =>
      p.id === paymentId
        ? { ...p, status: STATUS.CONFIRMED, txHash, confirmedAt: new Date().toISOString() }
        : p
    ));
  }, []);

  /**
   * Mark a payment as failed with a specific error type
   */
  const failPayment = useCallback((paymentId, errorType) => {
    setPayments(prev => prev.map(p =>
      p.id === paymentId
        ? {
          ...p,
          status: STATUS.FAILED,
          errorType,
          errorMessage: ERROR_MESSAGES[errorType] || 'Transaction failed',
        }
        : p
    ));
  }, []);

  /**
   * Update the contract payment ID for a tracker entry
   */
  const setContractId = useCallback((paymentId, contractPaymentId) => {
    setPayments(prev => prev.map(p =>
      p.id === paymentId
        ? { ...p, contractPaymentId }
        : p
    ));
  }, []);

  /**
   * Add a watch address (max 5)
   */
  const addWatchAddress = useCallback((address) => {
    setWatchAddresses(prev => {
      if (prev.length >= MAX_WATCH_ADDRESSES) return prev;
      if (prev.includes(address)) return prev;
      if (address === publicKey) return prev; // already tracked
      return [...prev, address];
    });
  }, [publicKey]);

  /**
   * Remove a watch address and close its SSE
   */
  const removeWatchAddress = useCallback((address) => {
    closeSSE(address);
    setWatchAddresses(prev => prev.filter(a => a !== address));
    // Remove payments from this watched address
    setPayments(prev => prev.filter(p =>
      !(p.isWatched && (p.recipient === address || p.senderAddress === address))
    ));
  }, [closeSSE]);

  /**
   * Retry SSE stream for a specific address
   */
  const retryStream = useCallback((address) => {
    // Reset timeout errors for this address
    setPayments(prev => prev.map(p => {
      if (p.senderAddress === address && p.errorType === ERROR_TYPES.NETWORK_TIMEOUT) {
        return { ...p, status: STATUS.PENDING, errorType: null, errorMessage: null };
      }
      return p;
    }));
    setStreamState('CONNECTING');
    openSSE(address);
  }, [openSSE]);

  const retryAllStreams = useCallback(() => {
    setStreamState('CONNECTING');
    if (publicKey) openSSE(publicKey);
    watchAddresses.forEach(addr => openSSE(addr));
  }, [publicKey, watchAddresses, openSSE]);

  return {
    payments,
    watchAddresses,
    streamState,
    addPayment,
    confirmPayment,
    failPayment,
    setContractId,
    addWatchAddress,
    removeWatchAddress,
    retryStream,
    retryAllStreams,
  };
}
