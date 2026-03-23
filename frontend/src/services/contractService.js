import { ethers } from 'ethers';
import contractConfig from '../config/contract.json';

export class ContractService {
  constructor(signer) {
    this.signer   = signer;
    this.contract = new ethers.Contract(
      contractConfig.address || contractConfig.contractAddress,
      contractConfig.abi,
      signer
    );
    this.provider = signer.provider;
  }

  // ── Create Loan ─────────────────────────────────────────
  async createLoan(amount, interestRate, durationDays, ipfsHash) {
    // Send interest rate as integer (e.g. 5 for 5%)
    // Contract stores it as basis points internally but we display /100
    const tx = await this.contract.createLoan(
      ethers.parseEther(amount.toString()),
      Math.round(parseFloat(interestRate) * 100), // convert 5% → 500 bps
      durationDays,
      ipfsHash
    );
    const receipt = await tx.wait();

    // Extract loanId from event
    let loanId = null;
    try {
      const iface = this.contract.interface;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === 'LoanCreated') {
            loanId = Number(parsed.args[0]);
            break;
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    // Fallback: use loanCounter
    if (!loanId) {
      try {
        const count = await this.contract.loanCounter();
        loanId = Number(count);
      } catch {
        try {
          const count = await this.contract.loanCount();
          loanId = Number(count);
        } catch { loanId = null; }
      }
    }

    console.log('✅ New loan ID:', loanId);
    return { ...receipt, loanId };
  }

  // ── Fund Loan ───────────────────────────────────────────
  async fundLoan(loanId, amount) {
    const tx = await this.contract.fundLoan(loanId, {
      value: ethers.parseEther(amount.toString()),
    });
    return tx.wait();
  }

  // ── Repay Loan ──────────────────────────────────────────
  async repayLoan(loanId, amount, interestRate) {
    const principal  = parseFloat(amount);
    const interest   = principal * (parseFloat(interestRate) / 100);
    const totalRepay = (principal + interest).toFixed(6);
    console.log(`Repaying loan #${loanId}: ${totalRepay} ETH`);
    const tx = await this.contract.repayLoan(loanId, {
      value: ethers.parseEther(totalRepay),
    });
    return tx.wait();
  }

  // ── Get All Loans ───────────────────────────────────────
  async getAllLoans() {
    try {
      // Try getAllLoans() function
      const loans = await this.contract.getAllLoans();
      return loans.map((loan, i) => this._formatLoan(loan.id || i+1, loan));
    } catch {
      // Fallback: iterate by counter
      try {
        const count = await this._getLoanCount();
        const loans = [];
        for (let i = 1; i <= count; i++) {
          try {
            const loan = await this.contract.loans(i);
            if (loan.borrower !== ethers.ZeroAddress) {
              loans.push(this._formatLoan(i, loan));
            }
          } catch { /* skip */ }
        }
        return loans;
      } catch (e) {
        console.error('getAllLoans failed:', e.message);
        return [];
      }
    }
  }

  // ── Get Lender Investments ──────────────────────────────
  async getLenderInvestments(address) {
    try {
      const investments = await this.contract.getLenderInvestments(address);
      return investments.map(inv => ({
        loanId:     Number(inv.loanId),
        amount:     ethers.formatEther(inv.amount),
        investedAt: Number(inv.investedAt) * 1000,
        repaid:     inv.repaid,
        lender:     inv.lender,
      }));
    } catch (e) {
      console.warn('getLenderInvestments failed:', e.message);
      return [];
    }
  }

  // ── Submit KYC ──────────────────────────────────────────
  async submitKYC(fullName, docType, docNumber, dob, address, phone, ipfsHash) {
    const tx = await this.contract.submitKYC(fullName, docType, docNumber, dob, address, phone, ipfsHash);
    return tx.wait();
  }

  // ── Get Credit Score ────────────────────────────────────
  async getCreditScore(address) {
    try {
      const score = await this.contract.calculateCreditScore(address);
      return Number(score);
    } catch { return 650; }
  }

  // ── Helpers ─────────────────────────────────────────────
  async _getLoanCount() {
    try { return Number(await this.contract.loanCounter()); }
    catch {
      try { return Number(await this.contract.loanCount()); }
      catch { return 0; }
    }
  }

  _formatLoan(id, loan) {
    const statusMap  = { 0:'Pending', 1:'Active', 2:'Repaid', 3:'Defaulted' };
    const rawRate    = Number(loan.interestRate);

    // ── Interest Rate Fix ──────────────────────────────────
    // Contract stores in basis points (500 = 5%) → divide by 100
    // If already percentage (< 100), use as-is
    const interestRate = rawRate > 100 ? rawRate / 100 : rawRate;

    return {
      id:           Number(id),
      loanId:       Number(id),
      borrower:     loan.borrower,
      amount:       ethers.formatEther(loan.amount),
      interestRate, // clean percentage e.g. 5, 8, 4.5
      duration:     Number(loan.duration),
      ipfsHash:     loan.kycHash || loan.ipfsHash || '',
      status:       Number(loan.status),
      statusLabel:  statusMap[Number(loan.status)] || 'Unknown',
      fundedAmount: loan.fundedAmount ? ethers.formatEther(loan.fundedAmount) : '0',
      fundedAt:     loan.fundedAt ? Number(loan.fundedAt) * 1000 : null,
      createdAt:    loan.createdAt ? Number(loan.createdAt) * 1000 : null,
      repaid:       loan.repaid || false,
    };
  }
}
