/**
 * TransactionHistory — shows recent payment operations
 * Fetches from Horizon, displays as a clean list
 */
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { fetchPaymentHistory, truncateAddress, formatXLM, getExplorerUrl } from '../utils/stellar';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function TransactionHistory() {
  const { publicKey, connected } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const history = await fetchPaymentHistory(publicKey, 10);
      setTransactions(history);
    } catch (err) {
      if (err?.response?.status === 404) {
        setTransactions([]);
      } else {
        setError('Could not load transaction history.');
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      loadHistory();
    }
  }, [connected, publicKey, loadHistory]);

  // Listen for custom event dispatched after a successful send
  useEffect(() => {
    const handler = () => loadHistory();
    window.addEventListener('stellar-tx-success', handler);
    return () => window.removeEventListener('stellar-tx-success', handler);
  }, [loadHistory]);

  return (
    <div className="card tx-history" id="transaction-history">
      <div className="tx-history-header">
        <h2 className="tx-history-title">Recent Activity</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={loadHistory}
          disabled={loading}
          title="Refresh"
          id="refresh-history-btn"
        >
          {loading ? (
            <span className="spinner spinner-sm" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          )}
        </button>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="tx-history-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="tx-history-item">
              <div className="tx-history-row">
                <div className="skeleton" style={{ width: 120, height: 16 }} />
                <div className="skeleton" style={{ width: 80, height: 16 }} />
              </div>
              <div className="tx-history-row" style={{ marginTop: 6 }}>
                <div className="skeleton" style={{ width: 90, height: 14 }} />
                <div className="skeleton" style={{ width: 50, height: 14 }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="tx-history-empty">
          <p className="tx-history-empty-text">{error}</p>
          <button className="btn btn-ghost btn-sm" onClick={loadHistory}>Try again</button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="tx-history-empty">
          <p className="tx-history-empty-text">No transactions yet</p>
          <p className="tx-history-empty-sub">Your payment history will appear here.</p>
        </div>
      ) : (
        <div className="tx-history-list">
          {transactions.map(tx => (
            <a
              key={tx.id}
              href={getExplorerUrl(tx.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-history-item tx-history-link"
              title={`View on Stellar Expert`}
            >
              <div className="tx-history-row">
                <div className="tx-history-info">
                  <span className={`tx-history-direction ${tx.isIncoming ? 'tx-incoming' : 'tx-outgoing'}`}>
                    {tx.isIncoming ? '↓' : '↑'}
                  </span>
                  <div>
                    <span className="tx-history-label">
                      {tx.isIncoming ? 'Received from' : 'Sent to'}
                    </span>
                    <span className="tx-history-address">
                      {truncateAddress(tx.isIncoming ? tx.from : tx.to)}
                    </span>
                  </div>
                </div>
                <div className="tx-history-amount-col">
                  <span className={`tx-history-amount ${tx.isIncoming ? 'tx-amount-in' : 'tx-amount-out'}`}>
                    {tx.isIncoming ? '+' : '−'}{formatXLM(tx.amount, 2)} {tx.asset}
                  </span>
                  <span className="tx-history-time">{timeAgo(tx.createdAt)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
