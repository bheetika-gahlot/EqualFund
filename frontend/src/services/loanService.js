// loanService.js
// Call these AFTER every successful blockchain transaction
// This saves data to MongoDB so it persists across Hardhat restarts

import api from './apiService';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('ef-token')}` }
});

// Call after contractService.createLoan() succeeds
export async function saveLoanToMongoDB(loanData) {
  try {
    const res = await api.post('/loans', {
      loanId:          loanData.id || loanData.loanId,
      borrowerAddress: loanData.borrower,
      amount:          loanData.amount?.toString(),
      interestRate:    loanData.interestRate,
      duration:        loanData.duration,
      purpose:         loanData.purpose || '',
      category:        loanData.category || 'Other',
      ipfsHash:        loanData.ipfsHash || '',
    }, getAuthHeader());
    console.log('✅ Loan saved to MongoDB:', res.data);
    return res.data.loan;
  } catch (e) {
    console.warn('MongoDB loan save failed (non-critical):', e.message);
    return null;
  }
}

// Call after contractService.fundLoan() succeeds
export async function saveFundingToMongoDB(loanId, lenderAddress, amount, amountFunded, isFullyFunded) {
  try {
    const res = await api.post(`/loans/${loanId}/fund`, {
      lenderAddress,
      amount:        amount?.toString(),
      amountFunded:  amountFunded?.toString(),
      isFullyFunded,
    }, getAuthHeader());
    console.log('✅ Funding saved to MongoDB:', res.data);
    return res.data.loan;
  } catch (e) {
    console.warn('MongoDB funding save failed (non-critical):', e.message);
    return null;
  }
}

// Call after contractService.repayLoan() succeeds
export async function saveRepaymentToMongoDB(loanId, borrowerAddress, repaidAmount) {
  try {
    const res = await api.post(`/loans/${loanId}/repay`, {
      borrowerAddress,
      repaidAmount: repaidAmount?.toString(),
    }, getAuthHeader());
    console.log('✅ Repayment saved to MongoDB:', res.data);
    return res.data.loan;
  } catch (e) {
    console.warn('MongoDB repayment save failed (non-critical):', e.message);
    return null;
  }
}
