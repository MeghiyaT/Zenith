/**
 * Wallet Context — manages wallet connection state
 * Uses React context + useReducer as specified in PRD
 * Persists in sessionStorage, clears on disconnect/tab close
 *
 * IMPORTANT: @stellar/freighter-api v6 returns OBJECTS, not plain values.
 *   isConnected()     → { isConnected: boolean,  error?: ... }
 *   requestAccess()   → { address: string,        error?: ... }
 *   getAddress()      → { address: string,        error?: ... }
 *   getNetworkDetails() → { network, networkPassphrase, networkUrl, error?: ... }
 *   signTransaction() → { signedTxXdr, signerAddress, error?: ... }
 */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  requestAccess,
  getAddress,
  getNetworkDetails,
  isConnected,
  signTransaction,
} from '@stellar/freighter-api';
import { fetchAccount } from '../utils/stellar';
import { get as cacheGet, set as cacheSet } from '../lib/cache';

const WalletContext = createContext(null);

const SESSION_KEY = 'stellar_send_wallet';

const initialState = {
  connected: false,
  connecting: false,
  publicKey: null,
  network: null,
  accountInfo: null,
  balanceLoading: false,
  balanceError: null,
  error: null,
  freighterInstalled: null, // null = not checked yet
  isTestnet: false,
};

function walletReducer(state, action) {
  switch (action.type) {
    case 'SET_FREIGHTER_STATUS':
      return { ...state, freighterInstalled: action.payload };
    case 'CONNECT_START':
      return { ...state, connecting: true, error: null };
    case 'CONNECT_SUCCESS':
      return {
        ...state,
        connecting: false,
        connected: true,
        publicKey: action.payload.publicKey,
        network: action.payload.network,
        isTestnet: action.payload.isTestnet || false,
        error: null,
      };
    case 'CONNECT_ERROR':
      return { ...state, connecting: false, error: action.payload };
    case 'BALANCE_LOADING':
      return { ...state, balanceLoading: true, balanceError: null };
    case 'BALANCE_SUCCESS':
      return {
        ...state,
        balanceLoading: false,
        accountInfo: action.payload,
        balanceError: null,
      };
    case 'BALANCE_ERROR':
      return { ...state, balanceLoading: false, balanceError: action.payload };
    case 'DISCONNECT':
      return { ...initialState, freighterInstalled: state.freighterInstalled };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function WalletProvider({ children }) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Check if Freighter is installed
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const result = await isConnected();
        // v6: result is { isConnected: boolean }
        const installed = result?.isConnected !== undefined;
        dispatch({ type: 'SET_FREIGHTER_STATUS', payload: installed });
      } catch {
        dispatch({ type: 'SET_FREIGHTER_STATUS', payload: false });
      }
    };
    // Small delay for extension to inject
    const timer = setTimeout(checkFreighter, 300);
    return () => clearTimeout(timer);
  }, []);

  // Try to restore session
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (!stored) return;
        
        const { publicKey } = JSON.parse(stored);
        if (!publicKey) return;

        // Verify Freighter is still connected
        const connResult = await isConnected();
        if (!connResult?.isConnected) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const addrResult = await getAddress();
        if (addrResult?.error) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }
        const address = addrResult?.address;
        if (address !== publicKey) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const netResult = await getNetworkDetails();
        const networkPassphrase = netResult?.networkPassphrase || '';
        const isTestnet = networkPassphrase === 'Test SDF Network ; September 2015';
        
        dispatch({
          type: 'CONNECT_SUCCESS',
          payload: { publicKey: address, network: networkPassphrase, isTestnet },
        });
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };
    restore();
  }, []);

  // Fetch balance when connected on testnet
  useEffect(() => {
    if (!state.connected || !state.publicKey) return;
    loadBalance(state.publicKey);
  }, [state.connected, state.publicKey]);

  const loadBalance = useCallback(async (publicKey) => {
    dispatch({ type: 'BALANCE_LOADING' });
    try {
      const cached = cacheGet(`bal:${publicKey}`);
      let accountInfo;
      if (cached) {
        accountInfo = cached.value;
      } else {
        accountInfo = await fetchAccount(publicKey);
        cacheSet(`bal:${publicKey}`, accountInfo, 15_000);
      }
      dispatch({ type: 'BALANCE_SUCCESS', payload: accountInfo });
    } catch (err) {
      dispatch({
        type: 'BALANCE_ERROR',
        payload: err?.response?.status === 404
          ? 'Account not found on Stellar testnet. Fund it using the Account Creator on Stellar Laboratory first.'
          : 'Could not fetch account balance. Check your connection.',
      });
    }
  }, []);

  const connect = useCallback(async () => {
    dispatch({ type: 'CONNECT_START' });
    try {
      // Check if Freighter is available first
      const connCheck = await isConnected();
      if (!connCheck?.isConnected) {
        throw new Error('Freighter wallet not found. Please install and unlock it.');
      }

      // requestAccess v6: returns { address: string, error?: ... }
      const accessResult = await requestAccess();
      if (accessResult?.error) {
        throw new Error(typeof accessResult.error === 'string'
          ? accessResult.error
          : 'Wallet denied access.');
      }

      const publicKey = accessResult?.address;
      if (!publicKey) {
        throw new Error('Could not retrieve wallet address.');
      }

      // Get network details
      const netResult = await getNetworkDetails();
      if (netResult?.error) {
        throw new Error('Could not retrieve network from wallet.');
      }
      const networkPassphrase = netResult?.networkPassphrase || '';
      const isTestnet = networkPassphrase === 'Test SDF Network ; September 2015';

      // Reject if not on testnet
      if (!isTestnet) {
        throw new Error(
          'Freighter is connected to Mainnet. Please switch to Testnet in Freighter: Settings → Network → Test Net, then try again.'
        );
      }

      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ publicKey }));

      dispatch({
        type: 'CONNECT_SUCCESS',
        payload: { publicKey, network: networkPassphrase, isTestnet },
      });
    } catch (err) {
      dispatch({
        type: 'CONNECT_ERROR',
        payload: err?.message || 'Failed to connect wallet.',
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    dispatch({ type: 'DISCONNECT' });
  }, []);

  const refreshBalance = useCallback(() => {
    if (state.publicKey) {
      loadBalance(state.publicKey);
    }
  }, [state.publicKey, loadBalance]);

  const signTx = useCallback(async (xdr) => {
    try {
      const result = await signTransaction(xdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
      if (result?.error) {
        throw new Error(typeof result.error === 'string'
          ? result.error
          : 'Wallet rejected the transaction.');
      }
      return result?.signedTxXdr;
    } catch (err) {
      if (err?.message?.includes('User declined')) {
        throw new Error('Wallet rejected the transaction.');
      }
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    signTx,
    clearError,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
