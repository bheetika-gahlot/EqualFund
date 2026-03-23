import React from 'react';
import { useWallet } from '../hooks/useWallet';

export default function ConnectWalletPrompt({ message = "Connect your wallet to continue" }) {
  const { connectWallet, isConnecting } = useWallet();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-dark-800 border border-dark-700 rounded-2xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Wallet Required</h3>
      <p className="text-dark-400 mb-6 max-w-xs">{message}</p>
      <button onClick={connectWallet} disabled={isConnecting} className="btn-primary">
        {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
      </button>
    </div>
  );
}
