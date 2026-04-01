/**
 * App — root component
 * Routes between Landing and Dashboard based on wallet connection state
 */
import { useWallet } from './context/WalletContext';
import Header from './components/Header';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';

export default function App() {
  const { connected } = useWallet();

  return (
    <>
      <Header />
      {connected ? <Dashboard /> : <Landing />}
    </>
  );
}
