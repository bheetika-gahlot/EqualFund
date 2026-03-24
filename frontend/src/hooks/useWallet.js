import { useState, useEffect, useCallback } from 'react';
import { walletService } from '../services/walletService';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  useEffect(() => {
    setIsMetaMaskInstalled(!!window.ethereum);

    // ── Only reconnect if user explicitly connected before ──
    // This prevents auto-connecting on every page load
    const wasConnected = localStorage.getItem('ef-wallet-connected') === 'true';

    if (wasConnected) {
      walletService.getCurrentAccount().then(async (acc) => {
        if (acc) {
          setAccount(acc);
          await walletService.connectWallet();
          const bal = await walletService.getBalance(acc);
          setBalance(bal);
        } else {
          // Wallet was disconnected from MetaMask side
          localStorage.removeItem('ef-wallet-connected');
        }
      });
    }

    // Listen for account changes in MetaMask
    walletService.onAccountChange(async (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const bal = await walletService.getBalance(accounts[0]);
        setBalance(bal);
        localStorage.setItem('ef-wallet-connected', 'true');
      } else {
        // Only disconnect wallet — keep user session
        setAccount(null);
        setBalance(null);
        localStorage.removeItem('ef-wallet-connected');
        walletService.provider = null;
        walletService.signer   = null;
        walletService.contract = null;
      }
    });

    walletService.onChainChange(() => {
      window.location.reload();
    });

    return () => {
      walletService.removeListeners();
    };
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const acc = await walletService.connectWallet();
      setAccount(acc);
      const bal = await walletService.getBalance(acc);
      setBalance(bal);

      // ── Remember that user connected ──
      localStorage.setItem('ef-wallet-connected', 'true');

      // Auto-link wallet to logged-in MongoDB account
      const token = localStorage.getItem('ef-token');
      if (token && acc) {
        try {
          const { authAPI } = await import('../services/apiService');
          await authAPI.linkWallet(acc);
        } catch (e) {
          // Wallet may already be linked — safe to ignore
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── Full disconnect — clears everything ──
  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance(null);
    walletService.provider = null;
    walletService.signer = null;
    walletService.contract = null;

    // Clear all session data
    localStorage.removeItem('ef-wallet-connected');
    // localStorage.removeItem('ef-token');
    // localStorage.removeItem('ef-user');
    // localStorage.removeItem('ef-admin-token');
    // localStorage.removeItem('ef-admin-user');

    // Reload so all state resets cleanly
    window.location.href = '/';
  }, []);

  return {
    account,
    balance,
    isConnecting,
    error,
    isMetaMaskInstalled,
    isConnected: !!account,
    connectWallet,
    disconnect,
    formatAddress: walletService.formatAddress,
  };
}