import React from 'react';

export default function InvestmentCard({ investment }) {
  const date = new Date(investment.investedAt).toLocaleDateString();
  
  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Loan #{investment.loanId}</div>
          <div className="text-xs text-dark-500">{date}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-brand-400">{parseFloat(investment.amount).toFixed(4)} ETH</div>
        <div className={`text-xs ${investment.repaid ? 'text-brand-400' : 'text-yellow-400'}`}>
          {investment.repaid ? '✓ Repaid' : '⏳ Pending'}
        </div>
      </div>
    </div>
  );
}
