import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { depositToVault, withdrawFromVault, getVaultBalance } from '../utils/soroban';
import { LockIcon, ArrowDownIcon, ArrowUpIcon, InfoIcon } from './Icons';

export default function VaultPanel() {
  const { publicKey, signTx, refreshBalance } = useWallet();
  const [vaultBalance, setVaultBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // 'deposit' | 'withdraw'
  const [status, setStatus] = useState({ type: '', message: '' });

  const fetchVaultBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const bal = await getVaultBalance(publicKey);
      setVaultBalance(bal);
    } catch {
      console.warn('Failed to fetch vault balance');
    }
  }, [publicKey]);

  useEffect(() => {
    fetchVaultBalance();
    const timer = setInterval(fetchVaultBalance, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, [fetchVaultBalance]);

  const handleDeposit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
    setActionLoading('deposit');
    setStatus({ type: 'info', message: 'Initiating deposit...' });
    
    const result = await depositToVault(publicKey, amount, signTx);
    if (result.success) {
      setStatus({ type: 'success', message: 'Successfully deposited to Vault!' });
      setAmount('');
      fetchVaultBalance();
      refreshBalance();
    } else {
      setStatus({ type: 'error', message: result.error || 'Deposit failed' });
    }
    setActionLoading(null);
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
    setActionLoading('withdraw');
    setStatus({ type: 'info', message: 'Initiating withdrawal...' });

    const result = await withdrawFromVault(publicKey, amount, signTx);
    if (result.success) {
      setStatus({ type: 'success', message: 'Successfully withdrawn from Vault!' });
      setAmount('');
      fetchVaultBalance();
      refreshBalance();
    } else {
      setStatus({ type: 'error', message: result.error || 'Withdrawal failed' });
    }
    setActionLoading(null);
  };

  return (
    <div className="card fade-in" style={{ marginTop: 16 }}>
      <div className="form-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="text-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockIcon size={20} />
            Zenith Vault
          </h2>
          <div className="header-address" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)' }}>
            <span className="text-mono">{vaultBalance.toFixed(2)} XLM Locked</span>
          </div>
        </div>
        
        <p className="text-caption" style={{ marginBottom: 20 }}>
          Securely lock your funds in the Zenith Soroban Vault. Withdrawals are subject to a 60-second time-lock for security demonstration.
        </p>

        <div className="input-group">
          <label className="input-label">Amount to Move</label>
          <div className="input-wrapper">
            <input
              type="text"
              className="input-field"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!!actionLoading}
            />
            <span className="input-suffix">XLM</span>
          </div>
        </div>

        <div className="vault-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button 
            className={`btn btn-primary ${actionLoading === 'deposit' ? 'btn-loading' : ''}`}
            onClick={handleDeposit}
            disabled={!!actionLoading || !amount}
          >
            <ArrowUpIcon size={16} />
            Deposit
          </button>
          <button 
            className={`btn btn-secondary ${actionLoading === 'withdraw' ? 'btn-loading' : ''}`}
            onClick={handleWithdraw}
            disabled={!!actionLoading || !amount || vaultBalance <= 0}
          >
            <ArrowDownIcon size={16} />
            Withdraw
          </button>
        </div>

        {status.message && (
          <div className={`warning-box fade-in ${status.type === 'error' ? 'alert-banner-error' : status.type === 'success' ? 'alert-banner-success' : ''}`} style={{ marginTop: 16 }}>
            <InfoIcon size={14} />
            <span>{status.message}</span>
          </div>
        )}
      </div>
      
      <div className="form-section" style={{ background: 'var(--color-bg)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
         <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <InfoIcon size={14} style={{ marginTop: 2, color: 'var(--color-accent)' }} />
            <span className="text-caption">
              Vault interactions perform <strong>inter-contract calls</strong> to the Stellar Asset Contract. 
              Always ensure you have enough XLM for network fees.
            </span>
         </div>
      </div>
    </div>
  );
}
