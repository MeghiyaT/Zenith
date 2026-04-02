/**
 * PaymentTracker — real-time outbound payment tracking panel
 *
 * Shows a live list of payments with SSE-based status updates.
 * Status badges: PENDING (amber), CONFIRMED (green), FAILED (red)
 * Supports manual watch addresses (up to 5)
 * Mobile: collapsible section with count badge
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { truncateAddress, formatXLM, isValidStellarAddress } from '../utils/stellar';
import { STATUS, ERROR_TYPES } from '../hooks/usePaymentTracker';
import CopyButton from './CopyButton';
import { ExternalLinkIcon, PlusIcon, XIcon, ChevronIcon, RefreshCWIcon } from './Icons';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAbsoluteTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
}

function getExplorerTxUrl(hash) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

function StatusBadge({ status }) {
  const classMap = {
    [STATUS.PENDING]: 'status-badge-pending',
    [STATUS.CONFIRMED]: 'status-badge-confirmed',
    [STATUS.FAILED]: 'status-badge-failed',
  };

  return (
    <span className={`status-badge ${classMap[status] || ''}`}>
      {status}
    </span>
  );
}

function TrackerRow({ payment, onRetryStream }) {
  const [timeDisplay, setTimeDisplay] = useState(timeAgo(payment.timestamp));

  // Update relative time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeDisplay(timeAgo(payment.timestamp));
    }, 30000);
    return () => clearInterval(interval);
  }, [payment.timestamp]);

  return (
    <div className="tracker-row fade-in-fast" id={`tracker-row-${payment.id}`}>
      <div className="tracker-row-main">
        <div className="tracker-row-left">
          <div className="tracker-row-address">
            <span className="tracker-address-text" title={payment.recipient}>
              {truncateAddress(payment.recipient)}
            </span>
            <CopyButton text={payment.recipient} size={12} />
          </div>
          <div className="tracker-row-meta">
            <span className="tracker-amount">
              {formatXLM(payment.amount)} XLM
            </span>
            <span className="tracker-separator">·</span>
            <span className="tracker-time" title={formatAbsoluteTime(payment.timestamp)}>
              {timeDisplay}
            </span>
            {payment.contractPaymentId != null && (
              <>
                <span className="tracker-separator">·</span>
                <span
                  className="tracker-contract-id"
                  title="Payment recorded on Soroban testnet contract"
                >
                  Contract ID: #{payment.contractPaymentId}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="tracker-row-right">
          <StatusBadge status={payment.status} />
          {payment.txHash && (
            <a
              href={getExplorerTxUrl(payment.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="tracker-explorer-link"
              title="View on Stellar Expert"
              aria-label="View on Stellar Expert"
            >
              <ExternalLinkIcon size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Error message below row */}
      {payment.status === STATUS.FAILED && payment.errorMessage && (
        <div className="tracker-error-msg">
          <span>{payment.errorMessage}</span>
          {payment.errorType === ERROR_TYPES.NETWORK_TIMEOUT && onRetryStream && (
            <button
              className="tracker-retry-link"
              onClick={() => onRetryStream(payment.senderAddress)}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PaymentTracker({
  payments,
  watchAddresses,
  streamState = 'DISCONNECTED',
  onAddWatchAddress,
  onRemoveWatchAddress,
  onRetryStream,
  onRetryAllStreams,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [watchInput, setWatchInput] = useState('');
  const [watchError, setWatchError] = useState(null);
  const inputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check viewport width
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Focus input when showing add watch
  useEffect(() => {
    if (showAddWatch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddWatch]);

  const handleAddWatch = useCallback(() => {
    const trimmed = watchInput.trim();
    if (!trimmed) {
      setWatchError('Enter an address');
      return;
    }
    if (!isValidStellarAddress(trimmed)) {
      setWatchError('Invalid Stellar address');
      return;
    }
    onAddWatchAddress(trimmed);
    setWatchInput('');
    setWatchError(null);
    setShowAddWatch(false);
  }, [watchInput, onAddWatchAddress]);

  const handleWatchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddWatch();
    }
    if (e.key === 'Escape') {
      setShowAddWatch(false);
      setWatchInput('');
      setWatchError(null);
    }
  }, [handleAddWatch]);

  const paymentCount = payments.length;

  // On mobile, render as collapsible
  const showCollapsible = isMobile;

  // SSE Indicator based on streamState per PRD B.4
  let sseDotClass = '';
  let sseLabel = '';
  let sseAction = null;

  if (streamState === 'CONNECTING') {
    sseDotClass = 'sse-dot-connecting';
    sseLabel = 'Connecting';
  } else if (streamState === 'LIVE') {
    sseDotClass = 'sse-dot-live';
    sseLabel = 'Live';
  } else {
    sseDotClass = 'sse-dot-disconnected';
    sseLabel = 'Disconnected — Retry';
    sseAction = onRetryAllStreams;
  }

  const sseIndicator = (
    <div className="tracker-sse-indicator">
      <span className={`sse-dot ${sseDotClass}`} />
      {sseAction ? (
        <button
          className="sse-label-btn"
          onClick={sseAction}
          id="sse-retry-btn"
        >
          {sseLabel}
        </button>
      ) : (
        <span className="sse-label">{sseLabel}</span>
      )}
    </div>
  );

  const trackerContent = (
    <>
      {/* Watch addresses bar */}
      {watchAddresses.length > 0 && (
        <div className="tracker-watch-bar">
          <span className="tracker-watch-label">Watching:</span>
          <div className="tracker-watch-list">
            {watchAddresses.map(addr => (
              <span key={addr} className="tracker-watch-tag">
                <span className="tracker-watch-tag-text" title={addr}>
                  {truncateAddress(addr)}
                </span>
                <button
                  className="tracker-watch-remove"
                  onClick={() => onRemoveWatchAddress(addr)}
                  aria-label={`Remove ${truncateAddress(addr)}`}
                >
                  <XIcon size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add watch address input */}
      {showAddWatch && (
        <div className="tracker-add-watch fade-in">
          <div className="tracker-add-watch-row">
            <input
              ref={inputRef}
              type="text"
              className={`input-field input-mono tracker-add-watch-input ${watchError ? 'input-error' : ''}`}
              placeholder="G... address to watch"
              value={watchInput}
              onChange={(e) => { setWatchInput(e.target.value); setWatchError(null); }}
              onKeyDown={handleWatchKeyDown}
              spellCheck={false}
              autoComplete="off"
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddWatch}>
              Add
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setShowAddWatch(false); setWatchInput(''); setWatchError(null); }}
            >
              Cancel
            </button>
          </div>
          {watchError && (
            <span className="input-error-message" style={{ marginTop: 4 }}>
              {watchError}
            </span>
          )}
        </div>
      )}

      {/* Payment list */}
      {payments.length === 0 ? (
        streamState === 'CONNECTING' ? (
          <div className="tracker-list">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="tracker-row tracker-row-skeleton"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="tracker-row-main">
                  <div className="tracker-row-left">
                    <div className="tracker-row-address">
                      <div className="skeleton" style={{ width: 160, height: 16 }} />
                    </div>
                    <div className="tracker-row-meta">
                      <div className="skeleton" style={{ width: 60, height: 16 }} />
                      <div className="skeleton" style={{ width: 80, height: 16, marginLeft: 6 }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tracker-empty">
            <p className="tracker-empty-text">
              No payments yet. Payments you send will appear here.
            </p>
          </div>
        )
      ) : (
        <div className="tracker-list">
          {payments.map(payment => (
            <TrackerRow
              key={payment.id}
              payment={payment}
              onRetryStream={onRetryStream}
            />
          ))}
        </div>
      )}
    </>
  );

  if (showCollapsible) {
    return (
      <div className="card tracker-card" id="payment-tracker">
        <button
          className="tracker-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          id="tracker-toggle-button"
        >
          <span className="tracker-toggle-label">
            Payments
            {paymentCount > 0 && (
              <span className="tracker-toggle-badge">({paymentCount})</span>
            )}
          </span>
          <ChevronIcon size={16} direction={collapsed ? 'down' : 'up'} />
        </button>
        {!collapsed && (
          <div className="tracker-collapsible-content fade-in">
            <div className="tracker-header-actions tracker-header-actions-mobile">
              {sseIndicator}
              {watchAddresses.length < 5 && !showAddWatch && (
                <button
                  className="tracker-add-btn"
                  onClick={() => setShowAddWatch(true)}
                >
                  <PlusIcon size={12} />
                  Watch address
                </button>
              )}
            </div>
            {trackerContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card tracker-card" id="payment-tracker">
      <div className="tracker-header">
        <h2 className="tracker-title">Payment Tracker</h2>
        <div className="tracker-header-actions">
          {sseIndicator}
          {watchAddresses.length < 5 && !showAddWatch && (
            <button
              className="tracker-add-btn"
              onClick={() => setShowAddWatch(true)}
              id="add-watch-address-button"
            >
              <PlusIcon size={12} />
              Watch address
            </button>
          )}
        </div>
      </div>
      {trackerContent}
    </div>
  );
}
