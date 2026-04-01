/**
 * Header component
 * Shows app branding, connected address, theme toggle, disconnect
 */
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { truncateAddress } from '../utils/stellar';
import { StellarLogo, SunIcon, MoonIcon } from './Icons';

export default function Header() {
  const { connected, publicKey, disconnect } = useWallet();
  const { theme, toggle } = useTheme();

  return (
    <header className="header" role="banner">
      <div className="header-left">
        <StellarLogo size={28} className="header-logo" />
        <span className="header-title">Zenith</span>
      </div>
      <div className="header-right">
        {connected && publicKey && (
          <>
            <span
              className="header-address"
              title={publicKey}
              id="header-wallet-address"
            >
              {truncateAddress(publicKey)}
            </span>
            <button
              className="disconnect-btn"
              onClick={disconnect}
              id="disconnect-button"
            >
              Disconnect
            </button>
          </>
        )}
        <button
          className="theme-toggle"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="theme-toggle-button"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
