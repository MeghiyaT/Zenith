/**
 * Balance Card — shows XLM balance with skeleton loader and reserve info
 */
import { useWallet } from '../context/WalletContext';
import { formatXLM } from '../utils/stellar';
import { InfoIcon } from './Icons';

export default function BalanceCard() {
  const { accountInfo, balanceLoading, balanceError, refreshBalance } = useWallet();

  return (
    <div className="card balance-card" id="balance-card">
      <p className="balance-label">Available Balance</p>

      {balanceLoading && (
        <div>
          <div className="skeleton skeleton-balance" />
          <div className="skeleton skeleton-reserve" />
        </div>
      )}

      {balanceError && !balanceLoading && (
        <div className="error-inline fade-in" style={{ textAlign: 'left' }}>
          <span>{balanceError}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={refreshBalance}
            style={{ marginLeft: 'auto', flexShrink: 0 }}
          >
            Retry
          </button>
        </div>
      )}

      {accountInfo && !balanceLoading && !balanceError && (
        <div className="fade-in">
          <div className="balance-amount" id="balance-display">
            <span>{formatXLM(accountInfo.availableBalance)}</span>
            <span className="balance-currency">XLM</span>
          </div>
          <div className="balance-reserve">
            <span className="balance-reserve-tooltip">
              <InfoIcon size={13} />
              <span className="tooltip-content">
                {accountInfo.reserve} XLM reserved ({accountInfo.subentryCount} subentries)
              </span>
            </span>
            <span>Total: {formatXLM(accountInfo.totalBalance)} XLM</span>
          </div>
        </div>
      )}
    </div>
  );
}
