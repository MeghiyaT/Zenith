/**
 * Landing page — shown when no wallet is connected
 * Single purpose: connect button + install prompt
 */
import { useWallet } from '../context/WalletContext';
import { StellarLogo, WalletIcon } from './Icons';

export default function Landing() {
  const { connect, connecting, error, freighterInstalled, clearError } = useWallet();

  return (
    <main className="landing" role="main">
      <StellarLogo size={72} className="landing-icon" />
      <h1 className="landing-title">Zenith</h1>
      <p className="landing-subtitle">
        Send XLM to any Stellar address. Connect your wallet to get started.
      </p>

      <div className="landing-connect">
        <button
          className="btn btn-primary"
          onClick={connect}
          disabled={connecting}
          id="connect-wallet-button"
        >
          <span className="btn-inner">
            {connecting ? (
              <>
                <span className="spinner spinner-sm" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <WalletIcon size={18} />
                <span>Connect Wallet</span>
              </>
            )}
          </span>
        </button>
      </div>

      {error && (
        <div className="error-inline fade-in" style={{ marginTop: 16, maxWidth: 340 }}>
          <span>{error}</span>
        </div>
      )}

      {freighterInstalled === false && (
        <p className="landing-install-hint">
          Freighter wallet not detected.{' '}
          <a
            href="https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install Freighter
          </a>{' '}
          to continue.
        </p>
      )}
    </main>
  );
}
