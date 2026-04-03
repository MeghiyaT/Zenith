/**
 * Send Form — the primary interaction surface
 * Handles recipient address, amount, memo with real-time validation
 * Triggers review modal, wallet signing, and broadcasting
 * Integrates with PaymentTracker for real-time status
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { get as cacheGet, set as cacheSet, invalidate as cacheInvalidate } from '../lib/cache';
import { useWallet } from '../context/WalletContext';
import {
  isValidStellarAddress,
  validateAmount,
  formatXLM,
  checkAccountExists,
  buildPaymentTransaction,
  submitTransaction,
  parseHorizonError,
} from '../utils/stellar';
import { recordPaymentOnContract } from '../utils/soroban';
import { AlertTriangleIcon, PlusIcon, MinusIcon, SendIcon } from './Icons';
import ReviewModal from './ReviewModal';
import SuccessView from './SuccessView';
import ErrorView from './ErrorView';

// States: idle | reviewing | signing | broadcasting | success | error
const FORM_STATES = {
  IDLE: 'idle',
  REVIEWING: 'reviewing',
  SIGNING: 'signing',
  BROADCASTING: 'broadcasting',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function SendForm() {
  const { publicKey, accountInfo, signTx, refreshBalance } = useWallet();

  // Form fields
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showMemo, setShowMemo] = useState(false);

  // Validation
  const [recipientError, setRecipientError] = useState(null);
  const [amountError, setAmountError] = useState(null);
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [recipientExists, setRecipientExists] = useState(null); // null = unchecked

  // Flow state
  const [formState, setFormState] = useState(FORM_STATES.IDLE);
  const [modalExiting, setModalExiting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [sendStep, setSendStep] = useState(0); // 0=none, 1=contract, 2=signing, 3=broadcasting
  const [contractStatus, setContractStatus] = useState(null); // null | 'pending' | 'confirmed' | 'failed'

  // Refs
  const recipientRef = useRef(null);
  const amountRef = useRef(null);
  const checkingRecipientRef = useRef(null);

  const availableBalance = accountInfo?.availableBalance ?? 0;

  // --- Validation ---

  const validateRecipient = useCallback((value) => {
    if (!value.trim()) {
      setRecipientError(null);
      setRecipientExists(null);
      return false;
    }
    if (!isValidStellarAddress(value.trim())) {
      setRecipientError('Invalid Stellar address');
      setRecipientExists(null);
      return false;
    }
    if (value.trim() === publicKey) {
      // Self-send: warn but don't block
      setRecipientError(null);
    } else {
      setRecipientError(null);
    }
    return true;
  }, [publicKey]);

  const handleRecipientBlur = useCallback(async () => {
    setRecipientTouched(true);
    const trimmed = recipient.trim();
    if (!validateRecipient(trimmed)) return;

    // Check if account exists — with 60s cache
    if (checkingRecipientRef.current) return;
    checkingRecipientRef.current = true;
    try {
      const cached = cacheGet(`addr:${trimmed}`);
      if (cached) {
        setRecipientExists(cached.value.exists);
      } else {
        const exists = await checkAccountExists(trimmed);
        cacheSet(`addr:${trimmed}`, { exists }, 60_000);
        setRecipientExists(exists);
      }
    } catch {
      setRecipientExists(null);
    } finally {
      checkingRecipientRef.current = false;
    }
  }, [recipient, validateRecipient]);

  const handleRecipientChange = useCallback((e) => {
    const value = e.target.value;
    setRecipient(value);
    setRecipientExists(null);
    if (recipientTouched) {
      if (value.trim() && !isValidStellarAddress(value.trim())) {
        setRecipientError('Invalid Stellar address');
      } else {
        setRecipientError(null);
      }
    }
  }, [recipientTouched]);

  const handleAmountChange = useCallback((e) => {
    let value = e.target.value;
    // Only allow numbers and decimals
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    // Truncate to 7 decimal places
    const parts = value.split('.');
    if (parts[1] && parts[1].length > 7) {
      value = `${parts[0]}.${parts[1].slice(0, 7)}`;
    }

    setAmount(value);

    const result = validateAmount(value, availableBalance);
    setAmountError(result.error || null);
  }, [availableBalance]);

  const handleMaxClick = useCallback(() => {
    const max = Math.max(0, availableBalance).toFixed(7);
    // Remove trailing zeros
    const cleaned = parseFloat(max).toString();
    setAmount(cleaned);
    setAmountError(null);
  }, [availableBalance]);

  // --- Form submission ---

  const isSelfSend = recipient.trim() === publicKey;

  const canSubmit = (() => {
    if (!recipient.trim() || !amount.trim()) return false;
    if (!isValidStellarAddress(recipient.trim())) return false;
    const result = validateAmount(amount, availableBalance);
    if (!result.valid) return false;
    if (memo && memo.length > 28) return false;
    return true;
  })();

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    // Final validation
    setRecipientTouched(true);
    if (!isValidStellarAddress(recipient.trim())) {
      setRecipientError('Invalid Stellar address');
      recipientRef.current?.focus();
      return;
    }
    
    const amountResult = validateAmount(amount, availableBalance);
    if (!amountResult.valid) {
      setAmountError(amountResult.error || 'Invalid amount');
      amountRef.current?.focus();
      return;
    }

    if (memo && memo.length > 28) return;

    setFormState(FORM_STATES.REVIEWING);
  }, [recipient, amount, availableBalance, memo]);

  // --- Modal actions ---

  const handleCancelReview = useCallback(() => {
    setModalExiting(true);
    setTimeout(() => {
      setFormState(FORM_STATES.IDLE);
      setModalExiting(false);
    }, 100);
  }, []);

  const handleConfirm = useCallback(async () => {
    setFormState(FORM_STATES.SIGNING);
    setSendStep(1);
    setContractStatus('pending');


    try {
      // Step 1: Record payment intent on Soroban contract (best-effort)
      try {
        const contractResult = await recordPaymentOnContract(
          publicKey,
          recipient.trim(),
          amount
        );
        if (contractResult.success && contractResult.paymentId != null) {
          setContractStatus('confirmed');
        } else {
          setContractStatus('failed');
          console.warn('[Contract] Best-effort call failed:', contractResult.error);
        }
      } catch (contractErr) {
        setContractStatus('failed');
        console.warn('[Contract] Best-effort call failed:', contractErr?.message);
      }

      // Step 2: Build and sign the payment transaction
      setSendStep(2);

      const transaction = await buildPaymentTransaction(
        publicKey,
        recipient.trim(),
        amount,
        memo.trim() || null
      );

      const xdr = transaction.toXDR();

      // Request wallet signature
      const signedXDR = await signTx(xdr);

      // Step 3: Broadcast to network
      setSendStep(3);
      setFormState(FORM_STATES.BROADCASTING);

      const result = await submitTransaction(signedXDR);


      setTxHash(result.hash);
      setFormState(FORM_STATES.SUCCESS);
      setSendStep(0);
      setContractStatus(null);

      // Invalidate balance cache so next fetch is fresh
      cacheInvalidate(`bal:${publicKey}`);
      window.dispatchEvent(new CustomEvent('stellar-tx-success'));
      setTimeout(() => refreshBalance(), 2000);
    } catch (err) {
      const message = err?.message?.includes('rejected') || err?.message?.includes('declined')
        ? 'Wallet rejected the transaction.'
        : parseHorizonError(err);
      
      setTxError(message);
      setFormState(FORM_STATES.ERROR);
      setSendStep(0);
      setContractStatus(null);
    }
  }, [publicKey, recipient, amount, memo, signTx, refreshBalance]);

  const handleSendAnother = useCallback(() => {
    setRecipient('');
    setAmount('');
    setMemo('');
    setShowMemo(false);
    setRecipientError(null);
    setAmountError(null);
    setRecipientTouched(false);
    setRecipientExists(null);
    setTxHash(null);
    setTxError(null);
    setFormState(FORM_STATES.IDLE);
  }, []);

  const handleRetry = useCallback(() => {
    setTxError(null);
    setFormState(FORM_STATES.REVIEWING);
  }, []);

  // --- Render ---

  // Success state
  if (formState === FORM_STATES.SUCCESS) {
    return (
      <SuccessView
        hash={txHash}
        amount={formatXLM(amount)}
        recipient={recipient.trim()}
        onSendAnother={handleSendAnother}
      />
    );
  }

  // Error state (post-submission)
  if (formState === FORM_STATES.ERROR) {
    return (
      <div className="card">
        <ErrorView
          message={txError}
          onRetry={handleRetry}
          onDismiss={handleSendAnother}
          retryLabel="Review again"
        />
      </div>
    );
  }

  const isSubmitting = formState === FORM_STATES.SIGNING || formState === FORM_STATES.BROADCASTING;

  return (
    <>
      <form className="send-form" onSubmit={handleSubmit} noValidate id="send-form">
        <div className="card">
          {/* Recipient */}
          <div className="form-section">
            <div className="input-group">
              <label className="input-label" htmlFor="recipient-input">
                Recipient address
              </label>
              <div className="input-wrapper">
                <input
                  ref={recipientRef}
                  type="text"
                  id="recipient-input"
                  className={`input-field input-mono ${recipientError ? 'input-error' : ''}`}
                  placeholder="G..."
                  value={recipient}
                  onChange={handleRecipientChange}
                  onBlur={handleRecipientBlur}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
              {recipientError && (
                <span className="input-error-message fade-in" id="recipient-error">
                  {recipientError}
                </span>
              )}
              {isSelfSend && !recipientError && recipient.trim() && (
                <div className="warning-box fade-in">
                  <span className="warning-box-icon"><AlertTriangleIcon size={14} /></span>
                  <span>You are sending to your own address.</span>
                </div>
              )}
              {recipientExists === false && !recipientError && !isSelfSend && (
                <div className="warning-box fade-in" id="unfunded-warning">
                  <span className="warning-box-icon"><AlertTriangleIcon size={14} /></span>
                  <span>
                    This address has no activity on Stellar. Sending XLM will create the account (minimum 1 XLM required).
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="form-section">
            <div className="input-group">
              <label className="input-label" htmlFor="amount-input">
                Amount
                <span className="text-caption">
                  Available: {formatXLM(availableBalance)} XLM
                </span>
              </label>
              <div className="input-wrapper">
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  id="amount-input"
                  className={`input-field ${amountError ? 'input-error' : ''}`}
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  autoComplete="off"
                  style={{ paddingRight: 80 }}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={handleMaxClick}
                  tabIndex={-1}
                  id="max-amount-button"
                >
                  Max
                </button>
              </div>
              {amountError && (
                <span className="input-error-message fade-in" id="amount-error">
                  {amountError}
                </span>
              )}
              {amount && parseFloat(amount) > 0 && parseFloat(amount) === availableBalance && !amountError && (
                <div className="warning-box fade-in">
                  <span className="warning-box-icon"><AlertTriangleIcon size={14} /></span>
                  <span>
                    Sending your full available balance. The transaction fee (0.00001 XLM) will be deducted additionally.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Memo */}
          <div className="form-section">
            {!showMemo ? (
              <button
                type="button"
                className="memo-toggle"
                onClick={() => setShowMemo(true)}
                id="add-memo-toggle"
              >
                <PlusIcon size={13} />
                Add memo
              </button>
            ) : (
              <div className="input-group fade-in">
                <label className="input-label" htmlFor="memo-input">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Memo
                    <span className="text-caption" style={{ fontWeight: 400 }}>(optional)</span>
                  </span>
                  <span className={`memo-counter ${memo.length > 28 ? 'input-error-message' : ''}`}>
                    {memo.length}/28
                  </span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="memo-input"
                    className={`input-field ${memo.length > 28 ? 'input-error' : ''}`}
                    placeholder="Optional text memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    maxLength={28}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  className="memo-toggle"
                  onClick={() => { setShowMemo(false); setMemo(''); }}
                >
                  <MinusIcon size={13} />
                  Remove memo
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="form-submit">
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={!canSubmit}
              id="review-transaction-button"
            >
              <span className="btn-inner">
                <SendIcon size={16} />
                <span>Review transaction</span>
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* Review Modal */}
      {(formState === FORM_STATES.REVIEWING || isSubmitting) && (
        <ReviewModal
          from={publicKey}
          to={recipient.trim()}
          amount={amount}
          memo={memo.trim() || null}
          onConfirm={handleConfirm}
          onCancel={handleCancelReview}
          isSubmitting={isSubmitting}
          exiting={modalExiting}
          sendStep={sendStep}
          contractStatus={contractStatus}
        />
      )}
    </>
  );
}
