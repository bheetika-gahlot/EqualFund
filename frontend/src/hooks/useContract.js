import { useState, useCallback, useEffect, useRef } from 'react';
import { ContractService } from '../services/contractService';
import { walletService } from '../services/walletService';

export function useContract() {
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [txHash, setTxHash]                   = useState(null);
  const [contractService, setContractService] = useState(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once when signer is available
    if (initialized.current) return;

    const tryInit = () => {
      if (walletService.signer) {
        try {
          const service = new ContractService(walletService.signer);
          setContractService(service);
          initialized.current = true;
          clearInterval(timer);
        } catch (e) {
          console.warn('Contract init failed:', e.message);
        }
      }
    };

    tryInit(); // Try immediately

    // Only poll if not initialized yet
    const timer = setInterval(tryInit, 500);

    // Stop polling after 10 seconds max
    const timeout = setTimeout(() => clearInterval(timer), 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, []);

  // Re-initialize when wallet reconnects
  useEffect(() => {
    if (walletService.signer && !contractService) {
      try {
        const service = new ContractService(walletService.signer);
        setContractService(service);
        initialized.current = true;
      } catch (e) {
        console.warn('Contract re-init failed:', e.message);
      }
    }
  }, [contractService]);

  const execute = useCallback(async (fn, ...args) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      // Ensure contract service exists
      let service = contractService;
      if (!service && walletService.signer) {
        service = new ContractService(walletService.signer);
        setContractService(service);
      }
      const result = await fn(...args);
      if (result?.hash) setTxHash(result.hash);
      return result;
    } catch (err) {
      const message = err?.reason || err?.message || 'Transaction failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService]);

  return {
    loading,
    error,
    txHash,
    setError,
    execute,
    contractService,
  };
}