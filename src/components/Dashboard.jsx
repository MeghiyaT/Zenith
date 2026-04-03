/**
 * Dashboard — shown when wallet is connected
 * Contains balance card, send form, payment tracker, and transaction history
 * Shows network context banners for testnet and Soroban testnet
 */
import { useWallet } from '../context/WalletContext';
import BalanceCard from './BalanceCard';
import SendForm from './SendForm';
import TransactionHistory from './TransactionHistory';
import PaymentTracker from './PaymentTracker';
import VaultPanel from './VaultPanel';
import usePaymentTracker from '../hooks/usePaymentTracker';
import { AlertTriangleIcon } from './Icons';

export default function Dashboard() {
  const { isTestnet, publicKey, connected } = useWallet();

  const tracker = usePaymentTracker(publicKey, connected);

  return (
    <div className="dashboard">
      {/* Network banners */}
      {!isTestnet && (
        <div className="alert-banner alert-banner-warning" id="mainnet-banner">
          <AlertTriangleIcon size={15} />
          <span>Your wallet is not connected to testnet. Switch to testnet before sending.</span>
        </div>
      )}
      {isTestnet && (
        <div className="network-banner" id="testnet-banner">
          <div className="network-banner-inner">
            <span className="network-dot network-dot-testnet" />
            <span>Stellar Testnet</span>
            <span className="network-separator">·</span>
            <span className="network-dot network-dot-soroban" />
            <span>Soroban Testnet</span>
          </div>
        </div>
      )}

      <div className="container">
        <BalanceCard />
        <div className="dashboard-section">
          <SendForm tracker={tracker} />
        </div>
        <div className="dashboard-section">
          <VaultPanel />
        </div>
        <div className="dashboard-section">
          <PaymentTracker
            payments={tracker.payments}
            watchAddresses={tracker.watchAddresses}
            streamState={tracker.streamState}
            onAddWatchAddress={tracker.addWatchAddress}
            onRemoveWatchAddress={tracker.removeWatchAddress}
            onRetryStream={tracker.retryStream}
            onRetryAllStreams={tracker.retryAllStreams}
          />
        </div>
        <div className="dashboard-section">
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
}
