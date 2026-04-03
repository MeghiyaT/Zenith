/**
 * Dashboard — shown when wallet is connected
 * Contains balance card, send form, payment tracker, and transaction history
 * Shows network context banners for testnet and Soroban testnet
 */
import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import BalanceCard from './BalanceCard';
import SendForm from './SendForm';
import TransactionHistory from './TransactionHistory';
import VaultPanel from './VaultPanel';
import { AlertTriangleIcon } from './Icons';

export default function Dashboard() {
  const { isTestnet, publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState('send'); // 'send' | 'vault'


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

        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`} 
            onClick={() => setActiveTab('send')}
          >
            Send
          </button>
          <button 
            className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`} 
            onClick={() => setActiveTab('vault')}
          >
            Vault
          </button>
        </div>

        {activeTab === 'send' && (
          <div className="fade-in">
            <div className="dashboard-section">
              <SendForm />
            </div>
            <div className="dashboard-section">
              <TransactionHistory />
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="dashboard-section fade-in">
            <VaultPanel />
          </div>
        )}

      </div>
    </div>
  );
}
