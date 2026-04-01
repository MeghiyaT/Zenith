/**
 * Success View — shown after a successful transaction
 */
import { truncateAddress, getExplorerUrl } from '../utils/stellar';
import { CheckCircleIcon, ArrowUpRightIcon } from './Icons';
import CopyButton from './CopyButton';

export default function SuccessView({ hash, amount, recipient, onSendAnother }) {
  return (
    <div className="card success-view fade-in" id="success-view">
      <div className="success-icon">
        <CheckCircleIcon size={32} />
      </div>

      <h2 className="success-title">Payment Sent</h2>
      <p className="success-subtitle">
        {amount} XLM sent to {truncateAddress(recipient)}
      </p>

      <div className="success-hash-row" id="tx-hash-display">
        <span className="success-hash" title={hash}>
          {truncateAddress(hash)}
        </span>
        <CopyButton text={hash} size={14} />
      </div>

      <a
        href={getExplorerUrl(hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="success-explorer"
        id="explorer-link"
      >
        View on Stellar Expert <ArrowUpRightIcon size={14} />
      </a>

      <div className="success-actions">
        <button
          className="btn btn-primary btn-full"
          onClick={onSendAnother}
          id="send-another-button"
        >
          Send another
        </button>
      </div>
    </div>
  );
}
