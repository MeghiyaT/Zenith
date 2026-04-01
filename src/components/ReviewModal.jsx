/**
 * Review Modal — transaction confirmation before signing
 */
import { truncateAddress, formatXLM } from '../utils/stellar';
import { XIcon } from './Icons';
import CopyButton from './CopyButton';

export default function ReviewModal({
  from,
  to,
  amount,
  memo,
  onConfirm,
  onCancel,
  isSubmitting,
  submitLabel,
  exiting,
}) {
  const fee = '0.00001';
  const totalDeducted = (parseFloat(amount) + parseFloat(fee)).toFixed(7);

  return (
    <div
      className={`modal-overlay ${exiting ? 'modal-exiting' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" id="review-modal-title">Review Transaction</h2>
          {!isSubmitting && (
            <button
              className="modal-close"
              onClick={onCancel}
              aria-label="Close"
              id="review-modal-close"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        <div className="modal-body">
          <div className="review-list">
            <div className="review-row">
              <span className="review-label">From</span>
              <span className="review-value review-value-mono review-value-address">
                <span title={from}>{truncateAddress(from)}</span>
                <CopyButton text={from} size={13} />
              </span>
            </div>

            <div className="review-row">
              <span className="review-label">To</span>
              <span className="review-value review-value-mono review-value-address">
                <span title={to}>{truncateAddress(to)}</span>
                <CopyButton text={to} size={13} />
              </span>
            </div>

            <div className="review-row">
              <span className="review-label">Amount</span>
              <span className="review-value">
                {formatXLM(amount)} XLM
              </span>
            </div>

            <div className="review-row">
              <span className="review-label">Network fee</span>
              <span className="review-value text-caption">{fee} XLM</span>
            </div>

            {memo && (
              <div className="review-row">
                <span className="review-label">Memo</span>
                <span className="review-value text-caption">{memo}</span>
              </div>
            )}

            <hr className="review-divider" />

            <div className="review-row">
              <span className="review-label">Total</span>
              <span className="review-value review-total">
                {formatXLM(totalDeducted)} XLM
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-primary btn-full"
            onClick={onConfirm}
            disabled={isSubmitting}
            id="confirm-send-button"
          >
            <span className="btn-inner">
              {isSubmitting ? (
                <>
                  <span className="spinner spinner-sm" />
                  <span>{submitLabel}</span>
                </>
              ) : (
                <span>Confirm and send</span>
              )}
            </span>
          </button>
          {!isSubmitting && (
            <button
              className="btn btn-secondary btn-full"
              onClick={onCancel}
              id="cancel-send-button"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
