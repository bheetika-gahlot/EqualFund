import { useState, useEffect, useCallback } from 'react';
import { walletService } from '../services/walletService';

export function useWallet() {
  const [account, setAccount]           = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError]               = useState(null);
  const [balance, setBalance]           = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Test Network',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/t77AU4Uv0dOu6q3QKSa1e'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      }
    }
  };

  useEffect(() => {
    setIsMetaMaskInstalled(!!window.ethereum);
    const wasConnected = localStorage.getItem('ef-wallet-connected') === 'true';

    if (wasConnected) {
      walletService.getCurrentAccount().then(async (acc) => {
        if (acc) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          if (chainId !== '0xaa36a7') await switchToSepolia();
          await walletService.connectWallet();
          setAccount(acc);
          const bal = await walletService.getBalance(acc);
          setBalance(bal);
        } else {
          localStorage.removeItem('ef-wallet-connected');
        }
      });
    }

    walletService.onAccountChange(async (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const bal = await walletService.getBalance(accounts[0]);
        setBalance(bal);
        localStorage.setItem('ef-wallet-connected', 'true');
      } else {
        setAccount(null);
        setBalance(null);
        localStorage.removeItem('ef-wallet-connected');
        walletService.provider = null;
        walletService.signer   = null;
        walletService.contract = null;
      }
    });

    walletService.onChainChange((chainId) => {
      if (chainId !== '0xaa36a7') {
        switchToSepolia();
      } else {
        window.location.reload();
      }
    });

    return () => walletService.removeListeners();
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') await switchToSepolia();
      }
      const acc = await walletService.connectWallet();
      setAccount(acc);
      const bal = await walletService.getBalance(acc);
      setBalance(bal);
      localStorage.setItem('ef-wallet-connected', 'true');

      const token = localStorage.getItem('ef-token');
      if (token && acc) {
        try {
          const { authAPI } = await import('../services/apiService');
          await authAPI.linkWallet(acc);
        } catch { /* already linked */ }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance(null);
    walletService.provider = null;
    walletService.signer   = null;
    walletService.contract = null;
    localStorage.removeItem('ef-wallet-connected');
    window.location.reload();
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