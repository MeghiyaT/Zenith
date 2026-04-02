/**
 * Dashboard — shown when wallet is connected
 * Contains balance card, send form, payment tracker, and transaction history
 */
import { useWallet } from '../context/WalletContext';
import BalanceCard from './BalanceCard';
import SendForm from './SendForm';
import TransactionHistory from './TransactionHistory';
import PaymentTracker from './PaymentTracker';
import usePaymentTracker from '../hooks/usePaymentTracker';
import { AlertTriangleIcon } from './Icons';

export default function Dashboard() {
  const { isTestnet, publicKey, connected } = useWallet();

  const tracker = usePaymentTracker(publicKey, connected);

  return (
    <div className="dashboard">
      {!isTestnet && (
        <div className="alert-banner alert-banner-warning" id="mainnet-banner">
          <AlertTriangleIcon size={15} />
          <span>Your wallet is not connected to testnet. Switch to testnet before sending.</span>
        </div>
      )}
      <div className="container">
        <BalanceCard />
        <div className="dashboard-section">
          <SendForm tracker={tracker} />
        </div>
        <div className="dashboard-section">
          <PaymentTracker
            payments={tracker.payments}
            watchAddresses={tracker.watchAddresses}
            onAddWatchAddress={tracker.addWatchAddress}
            onRemoveWatchAddress={tracker.removeWatchAddress}
            onRetryStream={tracker.retryStream}
          />
        </div>
        <div className="dashboard-section">
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
}
