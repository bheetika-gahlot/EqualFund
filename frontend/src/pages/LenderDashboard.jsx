import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import InvestmentCard from '../components/InvestmentCard';
import ConnectWalletPrompt from '../components/ConnectWalletPrompt';
import Toast from '../components/Toast';
import { saveFundingToMongoDB } from '../services/loanService';
import api from '../services/apiService';

export default function LenderDashboard() {
  const { isConnected, account } = useWallet();
  const { contractService } = useContract();
  const [investments, setInvestments] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast] = useState(null);

 const fetchData = async () => {
  if (!account) return;
  setFetching(true);
  try {
    // Try MongoDB first (persists across restarts)
    const res = await api.get(`/loans/history/${account.toLowerCase()}`);
    if (res.data.funded?.length > 0) {
      setInvestments(res.data.funded);
    } else {
      // Fallback to blockchain
      const invs = await contractService.getLenderInvestments(account);
      setInvestments(invs);
    }
  } catch (e) {
    // Fallback to blockchain if MongoDB fails
    try {
      const invs = await contractService.getLenderInvestments(account);
      setInvestments(invs);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load', type: 'error' });
    }
  } finally {
    setFetching(false);
  }
};

  useEffect(() => {
    if (isConnected && account) fetchData();
  }, [isConnected, account]);

  if (!isConnected) return <ConnectWalletPrompt message="Connect your wallet to access the lender dashboard." />;

  const totalInvested = investments.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const totalRepaid = investments.filter((i) => i.repaid).reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const pendingRepayment = investments.filter((i) => !i.repaid).reduce((sum, i) => sum + parseFloat(i.amount), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Lender Dashboard</h1>
          <p className="text-dark-400 mt-1 font-mono text-sm">{account}</p>
        </div>
        <Link to="/marketplace" className="btn-primary self-start">Browse Marketplace</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="text-xs text-dark-500">Investments</span>
          <span className="text-2xl font-bold text-white">{investments.length}</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-dark-500">Total Invested</span>
          <span className="text-2xl font-bold text-white">{totalInvested.toFixed(4)} ETH</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-dark-500">Repaid</span>
          <span className="text-2xl font-bold text-brand-400">{totalRepaid.toFixed(4)} ETH</span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-dark-500">Pending</span>
          <span className="text-2xl font-bold text-yellow-400">{pendingRepayment.toFixed(4)} ETH</span>
        </div>
      </div>

      {/* Investments */}
      {fetching ? (
        <div className="text-center py-12 text-dark-500">Loading investments...</div>
      ) : investments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">📈</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Investments Yet</h3>
          <p className="text-dark-400 mb-6">Browse the marketplace and start funding loans to earn returns.</p>
          <Link to="/marketplace" className="btn-primary inline-block">Browse Loans</Link>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Investments</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {investments.map((inv, i) => (
              <InvestmentCard key={i} investment={inv} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
