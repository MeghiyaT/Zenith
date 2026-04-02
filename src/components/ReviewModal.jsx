/**
 * Review Modal — transaction confirmation before signing
 * Shows 3-step progress pill row during submission: Contract → Sign → Broadcast
 *
 * v1.2: Redesigned StepIndicator to horizontal pill-shaped items per PRD B.3.
 * Button loading: spinner replaces label entirely per PRD B.2.
 */
import { truncateAddress, formatXLM } from '../utils/stellar';
import { XIcon, CheckIcon } from './Icons';
import CopyButton from './CopyButton';

/**
 * Horizontal 3-step progress indicator — pill-shaped items
 *
 * States per step:
 *  - inactive: secondary text, border bg
 *  - active:   accent text, accent border, spinner left of label
 *  - completed: success text, success bg, ✓ replacing spinner
 *  - failed:   error text, error bg, × replacing spinner
 */
function StepIndicator({ currentStep, contractStatus }) {
  if (currentStep === 0) return null;

  const steps = [
    { num: 1, label: 'Recording on contract...' },
    { num: 2, label: 'Waiting for wallet signature...' },
    { num: 3, label: 'Broadcasting to Stellar network...' },
  ];

  return (
    <div className="step-pills" id="send-step-indicator">
      {steps.map((step) => {
        const isActive = currentStep === step.num;
        const isDone = currentStep > step.num;
        const isFailed =
          step.num === 1 &&
          contractStatus === 'failed' &&
          currentStep > 1;

        let pillClass = 'step-pill step-pill-inactive';
        if (isFailed) pillClass = 'step-pill step-pill-failed';
        else if (isDone || (step.num === 1 && contractStatus === 'confirmed' && currentStep > 1))
          pillClass = 'step-pill step-pill-done';
        else if (isActive) pillClass = 'step-pill step-pill-active';

        const showSpinner =
          isActive && !(step.num === 1 && contractStatus === 'failed');
        const showCheck =
          isDone ||
          (step.num === 1 && contractStatus === 'confirmed' && currentStep > 1);
        const showX = isFailed;

        return (
          <div key={step.num} className={pillClass}>
            {showSpinner && <span className="step-pill-spinner" />}
            {showCheck && <span className="step-pill-icon">✓</span>}
            {showX && <span className="step-pill-icon">×</span>}
            <span className="step-pill-label">
              {isActive
                ? `Step ${step.num} of 3: ${step.label}`
                : step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReviewModal({
  from,
  to,
  amount,
  memo,
  onConfirm,
  onCancel,
  isSubmitting,
  exiting,
  sendStep = 0,
  contractStatus = null,
}) {
  const fee = '0.00001';
  const totalDeducted = (parseFloat(amount) + parseFloat(fee)).toFixed(7);

  // Button content per PRD B.2:
  // "Confirm and send" → spinner only (label hidden)
  // After wallet prompt → "Waiting for wallet…"
  // After wallet approves → "Broadcasting…"
  // Contract call in progress → spinner only
  let buttonContent;
  if (!isSubmitting) {
    buttonContent = <span>Confirm and send</span>;
  } else if (sendStep === 1) {
    // Contract call in progress → spinner only
    buttonContent = <span className="spinner spinner-btn" />;
  } else if (sendStep === 2) {
    // Waiting for wallet
    buttonContent = (
      <>
        <span className="spinner spinner-btn" />
        <span>Waiting for wallet…</span>
      </>
    );
  } else if (sendStep === 3) {
    // Broadcasting
    buttonContent = (
      <>
        <span className="spinner spinner-btn" />
        <span>Broadcasting…</span>
      </>
    );
  } else {
    // Fallback: spinner only
    buttonContent = <span className="spinner spinner-btn" />;
  }

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

          {/* 3-step progress pill row during submission */}
          {isSubmitting && (
            <StepIndicator
              currentStep={sendStep}
              contractStatus={contractStatus}
            />
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-primary btn-full"
            onClick={onConfirm}
            disabled={isSubmitting}
            id="confirm-send-button"
          >
            <span className="btn-inner">
              {buttonContent}
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
