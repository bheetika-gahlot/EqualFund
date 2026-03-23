const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EqualFund", function () {
  let equalFund;
  let owner, borrower, lender1, lender2, platformWallet;

  beforeEach(async function () {
    [owner, borrower, lender1, lender2, platformWallet] = await ethers.getSigners();
    const EqualFund = await ethers.getContractFactory("EqualFund");
    equalFund = await EqualFund.deploy(platformWallet.address);
    await equalFund.waitForDeployment();
  });

  // ============ LOAN CREATION TESTS ============
  describe("Loan Creation", function () {
    it("Should create a loan successfully", async function () {
      const amount = ethers.parseEther("1.0");
      const interestRate = 500; // 5%
      const duration = 30; // 30 days
      const kycHash = "QmTest123";

      await expect(
        equalFund.connect(borrower).createLoan(amount, interestRate, duration, kycHash)
      ).to.emit(equalFund, "LoanCreated")
        .withArgs(1, borrower.address, amount, interestRate, duration);

      const loan = await equalFund.getLoan(1);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.amount).to.equal(amount);
      expect(loan.interestRate).to.equal(interestRate);
      expect(loan.duration).to.equal(duration);
      expect(loan.status).to.equal(0); // Pending
    });

    it("Should fail with zero amount", async function () {
      await expect(
        equalFund.connect(borrower).createLoan(0, 500, 30, "QmTest")
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should fail with invalid interest rate", async function () {
      await expect(
        equalFund.connect(borrower).createLoan(ethers.parseEther("1"), 6000, 30, "QmTest")
      ).to.be.revertedWith("Interest rate must be between 0 and 50%");
    });

    it("Should fail with invalid duration", async function () {
      await expect(
        equalFund.connect(borrower).createLoan(ethers.parseEther("1"), 500, 3, "QmTest")
      ).to.be.revertedWith("Duration must be between 7 and 365 days");
    });

    it("Should initialize credit score to 650", async function () {
      await equalFund.connect(borrower).createLoan(
        ethers.parseEther("1"), 500, 30, "QmTest"
      );
      const score = await equalFund.calculateCreditScore(borrower.address);
      expect(score).to.equal(650);
    });

    it("Should track borrower loans", async function () {
      await equalFund.connect(borrower).createLoan(ethers.parseEther("1"), 500, 30, "QmTest1");
      await equalFund.connect(borrower).createLoan(ethers.parseEther("2"), 700, 60, "QmTest2");

      const borrowerLoans = await equalFund.getBorrowerLoans(borrower.address);
      expect(borrowerLoans.length).to.equal(2);
    });
  });

  // ============ LOAN FUNDING TESTS ============
  describe("Loan Funding", function () {
    beforeEach(async function () {
      await equalFund.connect(borrower).createLoan(
        ethers.parseEther("1.0"), 500, 30, "QmTest123"
      );
    });

    it("Should fund a loan partially", async function () {
      const fundAmount = ethers.parseEther("0.5");
      await expect(
        equalFund.connect(lender1).fundLoan(1, { value: fundAmount })
      ).to.emit(equalFund, "LoanFunded")
        .withArgs(1, lender1.address, fundAmount);

      const loan = await equalFund.getLoan(1);
      expect(loan.fundedAmount).to.equal(fundAmount);
      expect(loan.status).to.equal(0); // Still Pending (partial)
    });

    it("Should activate loan when fully funded", async function () {
      const fundAmount = ethers.parseEther("1.0");
      
      await equalFund.connect(lender1).fundLoan(1, { value: fundAmount });

      const loan = await equalFund.getLoan(1);
      expect(loan.status).to.equal(1); // Active
      expect(loan.fundedAmount).to.equal(fundAmount);
    });

    it("Should transfer funds to borrower on full funding", async function () {
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      
      await equalFund.connect(lender1).fundLoan(1, {
        value: ethers.parseEther("1.0"),
      });

      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);
      // Borrower gets amount minus platform fee (0.5%)
      expect(borrowerBalanceAfter).to.be.gt(borrowerBalanceBefore);
    });

    it("Should reject borrower funding own loan", async function () {
      await expect(
        equalFund.connect(borrower).fundLoan(1, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Borrower cannot fund own loan");
    });

    it("Should reject overfunding", async function () {
      await expect(
        equalFund.connect(lender1).fundLoan(1, { value: ethers.parseEther("2.0") })
      ).to.be.revertedWith("Exceeds loan amount");
    });

    it("Should track lender investments", async function () {
      await equalFund.connect(lender1).fundLoan(1, { value: ethers.parseEther("0.5") });
      await equalFund.connect(lender2).fundLoan(1, { value: ethers.parseEther("0.5") });

      const investments = await equalFund.getLenderInvestments(lender1.address);
      expect(investments.length).to.equal(1);
    });
  });

  // ============ LOAN REPAYMENT TESTS ============
  describe("Loan Repayment", function () {
    beforeEach(async function () {
      await equalFund.connect(borrower).createLoan(
        ethers.parseEther("1.0"), 500, 30, "QmTest123"
      );
      await equalFund.connect(lender1).fundLoan(1, { value: ethers.parseEther("1.0") });
    });

    it("Should repay loan successfully", async function () {
      const repaymentAmount = await equalFund.calculateRepaymentAmount(1);
      
      await expect(
        equalFund.connect(borrower).repayLoan(1, { value: repaymentAmount })
      ).to.emit(equalFund, "LoanRepaid")
        .withArgs(1, borrower.address, repaymentAmount);

      const loan = await equalFund.getLoan(1);
      expect(loan.repaid).to.equal(true);
      expect(loan.status).to.equal(2); // Repaid
    });

    it("Should calculate correct repayment amount", async function () {
      const repayment = await equalFund.calculateRepaymentAmount(1);
      const expectedRepayment = ethers.parseEther("1.05"); // 1 ETH + 5% interest
      expect(repayment).to.equal(expectedRepayment);
    });

    it("Should reject repayment from non-borrower", async function () {
      const repaymentAmount = await equalFund.calculateRepaymentAmount(1);
      await expect(
        equalFund.connect(lender1).repayLoan(1, { value: repaymentAmount })
      ).to.be.revertedWith("Not the borrower");
    });

    it("Should reject insufficient repayment", async function () {
      await expect(
        equalFund.connect(borrower).repayLoan(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Insufficient repayment amount");
    });

    it("Should reject double repayment", async function () {
      const repaymentAmount = await equalFund.calculateRepaymentAmount(1);
      await equalFund.connect(borrower).repayLoan(1, { value: repaymentAmount });
      
      await expect(
        equalFund.connect(borrower).repayLoan(1, { value: repaymentAmount })
      ).to.be.revertedWith("Loan already repaid");
    });
  });

  // ============ CREDIT SCORE TESTS ============
  describe("Credit Score", function () {
    it("Should return 650 for new borrower", async function () {
      const score = await equalFund.calculateCreditScore(borrower.address);
      expect(score).to.equal(650);
    });

    it("Should increase score after loan repayment", async function () {
      await equalFund.connect(borrower).createLoan(
        ethers.parseEther("1.0"), 500, 30, "QmTest"
      );
      await equalFund.connect(lender1).fundLoan(1, { value: ethers.parseEther("1.0") });
      
      const repaymentAmount = await equalFund.calculateRepaymentAmount(1);
      await equalFund.connect(borrower).repayLoan(1, { value: repaymentAmount });

      const score = await equalFund.calculateCreditScore(borrower.address);
      expect(score).to.be.gt(650);
    });

    it("Should score stay in range 300-850", async function () {
      const score = await equalFund.calculateCreditScore(borrower.address);
      expect(score).to.be.gte(300);
      expect(score).to.be.lte(850);
    });
  });

  // ============ KYC TESTS ============
  describe("KYC", function () {
    it("Should submit KYC successfully", async function () {
      await expect(
        equalFund.connect(borrower).submitKYC(
          "John Doe", "Passport", "AB123456",
          "1990-01-01", "123 Main St", "+1234567890", "QmKYCHash123"
        )
      ).to.emit(equalFund, "KYCSubmitted")
        .withArgs(borrower.address, "QmKYCHash123");

      const kycCompleted = await equalFund.kycCompleted(borrower.address);
      expect(kycCompleted).to.equal(true);
    });

    it("Should retrieve KYC data", async function () {
      await equalFund.connect(borrower).submitKYC(
        "John Doe", "Passport", "AB123456",
        "1990-01-01", "123 Main St", "+1234567890", "QmKYCHash123"
      );

      const kycData = await equalFund.getKYCData(borrower.address);
      expect(kycData.fullName).to.equal("John Doe");
      expect(kycData.ipfsHash).to.equal("QmKYCHash123");
    });
  });

  // ============ MARKETPLACE TESTS ============
  describe("Marketplace", function () {
    it("Should return all loans", async function () {
      await equalFund.connect(borrower).createLoan(ethers.parseEther("1"), 500, 30, "Qm1");
      await equalFund.connect(lender1).createLoan(ethers.parseEther("2"), 700, 60, "Qm2");

      const allLoans = await equalFund.getAllLoans();
      expect(allLoans.length).to.equal(2);
    });

    it("Should return active loans only", async function () {
      await equalFund.connect(borrower).createLoan(ethers.parseEther("1"), 500, 30, "Qm1");
      await equalFund.connect(lender1).fundLoan(1, { value: ethers.parseEther("1.0") });
      
      const repayment = await equalFund.calculateRepaymentAmount(1);
      await equalFund.connect(borrower).repayLoan(1, { value: repayment });

      await equalFund.connect(borrower).createLoan(ethers.parseEther("1"), 500, 30, "Qm2");

      const activeLoans = await equalFund.getActiveLoans();
      expect(activeLoans.length).to.equal(1);
    });
  });
});
