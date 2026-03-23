import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

export default function Home() {
  const { isConnected, connectWallet } = useWallet();

  const features = [
    {
      icon: '🔒',
      title: 'Trustless & Transparent',
      desc: 'All loan logic runs on-chain via smart contracts. No middlemen, no hidden fees.',
    },
    {
      icon: '⚡',
      title: 'Instant Funding',
      desc: 'Loans are funded directly by lenders. When fully funded, funds auto-transfer to the borrower.',
    },
    {
      icon: '📊',
      title: 'Credit Scores',
      desc: 'On-chain credit scoring based on repayment history. Build your DeFi credit profile.',
    },
    {
      icon: '🌐',
      title: 'IPFS KYC',
      desc: 'KYC documents stored on IPFS. Decentralized, censorship-resistant identity verification.',
    },
  ];

  const steps = [
    { num: '01', title: 'Connect Wallet', desc: 'Link your MetaMask wallet to get started on EqualFund.' },
    { num: '02', title: 'Complete KYC', desc: 'Upload your identity documents securely to IPFS.' },
    { num: '03', title: 'Borrow or Lend', desc: 'Request a loan or browse the marketplace to fund others.' },
    { num: '04', title: 'Track & Earn', desc: 'Monitor your loans, repayments, and investment returns.' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-sm text-brand-400 mb-8">
            <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></span>
            Decentralized P2P Lending on Ethereum
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Financial Access
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
              For Everyone
            </span>
          </h1>
          <p className="text-xl text-dark-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            EqualFund connects borrowers and lenders directly through smart contracts.
            No banks, no bureaucracy — just transparent, permissionless lending.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isConnected ? (
              <>
                <Link to="/borrow" className="btn-primary text-base">
                  Apply for a Loan
                </Link>
                <Link to="/marketplace" className="btn-secondary text-base">
                  Browse Marketplace
                </Link>
              </>
            ) : (
              <button onClick={connectWallet} className="btn-primary text-base px-8">
                Get Started — Connect Wallet
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-dark-800">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Total Loans', value: '1,240+' },
            { label: 'Total Funded', value: '845 ETH' },
            { label: 'Avg. Return', value: '8.4%' },
            { label: 'Borrowers', value: '3,200+' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-dark-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Why EqualFund?</h2>
          <p className="text-dark-400 text-center mb-12 max-w-xl mx-auto">
            Built on Ethereum, powered by smart contracts, designed for fairness.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card p-6 hover:border-dark-600 transition-all duration-200">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 border-t border-dark-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <div className="text-5xl font-bold text-dark-800 mb-3 font-mono">{step.num}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-dark-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-dark-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-dark-400 mb-8">
            Join thousands of users already using EqualFund for transparent, on-chain lending.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/marketplace" className="btn-primary">Explore Loans</Link>
            <Link to="/kyc" className="btn-secondary">Complete KYC</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
