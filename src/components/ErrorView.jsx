/**
 * Error View — shown within the modal or inline when a transaction fails
 */
import { XCircleIcon } from './Icons';

export default function ErrorView({ title, message, onRetry, onDismiss, retryLabel = 'Try again' }) {
  return (
    <div className="error-view fade-in" id="error-view">
      <div className="error-icon">
        <XCircleIcon size={28} />
      </div>
      <h2 className="error-title">{title || 'Transaction Failed'}</h2>
      <p className="error-message">{message}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {onRetry && (
          <button
            className="btn btn-primary btn-full"
            onClick={onRetry}
            id="error-retry-button"
          >
            {retryLabel}
          </button>
        )}
        {onDismiss && (
          <button
            className="btn btn-secondary btn-full"
            onClick={onDismiss}
            id="error-dismiss-button"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
