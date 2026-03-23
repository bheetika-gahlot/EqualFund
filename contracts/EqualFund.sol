// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EqualFund is ReentrancyGuard, Ownable {
    
    // ============ ENUMS ============
    enum LoanStatus { Pending, Active, Repaid, Defaulted }

    // ============ STRUCTS ============
    struct Loan {
        uint256 id;
        address payable borrower;
        uint256 amount;
        uint256 interestRate;    // in basis points (e.g., 500 = 5%)
        uint256 fundedAmount;
        uint256 duration;        // in days
        uint256 createdAt;
        uint256 fundedAt;
        LoanStatus status;
        bool repaid;
        string kycHash;          // IPFS hash
    }

    struct Investment {
        address payable lender;
        uint256 loanId;
        uint256 amount;
        uint256 investedAt;
        bool repaid;
    }

    struct KYCData {
        string fullName;
        string documentType;
        string documentNumber;
        string dateOfBirth;
        string homeAddress;
        string phoneNumber;
        string ipfsHash;
        bool verified;
    }

    // ============ STATE VARIABLES ============
    uint256 public loanCounter;
    uint256 public investmentCounter;
    uint256 public constant PLATFORM_FEE = 50; // 0.5% in basis points
    address payable public platformWallet;

    mapping(uint256 => Loan) public loans;
    mapping(uint256 => Investment[]) public loanInvestments;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderInvestments;
    mapping(address => uint256) public borrowerCreditScore;
    mapping(address => KYCData) public kycRecords;
    mapping(address => bool) public kycCompleted;

    // Tracking repayment progress per borrower per loan
    mapping(address => uint256) public completedLoans;
    mapping(address => uint256) public defaultedLoans;
    mapping(address => uint256) public totalRepaidAmount;
    mapping(address => uint256) public totalBorrowedAmount;

    // ============ EVENTS ============
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate, uint256 duration);
    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event KYCSubmitted(address indexed user, string ipfsHash);
    event CreditScoreUpdated(address indexed borrower, uint256 newScore);

    // ============ MODIFIERS ============
    modifier loanExists(uint256 loanId) {
        require(loanId > 0 && loanId <= loanCounter, "Loan does not exist");
        _;
    }

    modifier onlyBorrower(uint256 loanId) {
        require(loans[loanId].borrower == msg.sender, "Not the borrower");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(address payable _platformWallet) {
        platformWallet = _platformWallet;
        loanCounter = 0;
        investmentCounter = 0;
    }

    // ============ KYC FUNCTIONS ============
    function submitKYC(
        string memory _fullName,
        string memory _documentType,
        string memory _documentNumber,
        string memory _dateOfBirth,
        string memory _homeAddress,
        string memory _phoneNumber,
        string memory _ipfsHash
    ) external {
        kycRecords[msg.sender] = KYCData({
            fullName: _fullName,
            documentType: _documentType,
            documentNumber: _documentNumber,
            dateOfBirth: _dateOfBirth,
            homeAddress: _homeAddress,
            phoneNumber: _phoneNumber,
            ipfsHash: _ipfsHash,
            verified: false
        });
        kycCompleted[msg.sender] = true;
        emit KYCSubmitted(msg.sender, _ipfsHash);
    }

    // ============ LOAN FUNCTIONS ============
    function createLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration,
        string memory _kycHash
    ) external returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_interestRate > 0 && _interestRate <= 5000, "Interest rate must be between 0 and 50%");
        require(_duration >= 7 && _duration <= 365, "Duration must be between 7 and 365 days");

        loanCounter++;
        uint256 newLoanId = loanCounter;

        loans[newLoanId] = Loan({
            id: newLoanId,
            borrower: payable(msg.sender),
            amount: _amount,
            interestRate: _interestRate,
            fundedAmount: 0,
            duration: _duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            status: LoanStatus.Pending,
            repaid: false,
            kycHash: _kycHash
        });

        borrowerLoans[msg.sender].push(newLoanId);

        // Initialize credit score if new borrower
        if (borrowerCreditScore[msg.sender] == 0) {
            borrowerCreditScore[msg.sender] = 650;
        }

        totalBorrowedAmount[msg.sender] += _amount;

        emit LoanCreated(newLoanId, msg.sender, _amount, _interestRate, _duration);
        return newLoanId;
    }

    function fundLoan(uint256 _loanId) external payable nonReentrant loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Pending, "Loan is not available for funding");
        require(msg.sender != loan.borrower, "Borrower cannot fund own loan");
        require(msg.value > 0, "Must send ETH to fund loan");
        require(loan.fundedAmount + msg.value <= loan.amount, "Exceeds loan amount");

        investmentCounter++;
        
        Investment memory newInvestment = Investment({
            lender: payable(msg.sender),
            loanId: _loanId,
            amount: msg.value,
            investedAt: block.timestamp,
            repaid: false
        });

        loanInvestments[_loanId].push(newInvestment);
        lenderInvestments[msg.sender].push(_loanId);

        loan.fundedAmount += msg.value;

        // If fully funded, activate loan and send to borrower
        if (loan.fundedAmount >= loan.amount) {
            loan.status = LoanStatus.Active;
            loan.fundedAt = block.timestamp;
            
            // Calculate platform fee
            uint256 fee = (loan.amount * PLATFORM_FEE) / 10000;
            uint256 borrowerAmount = loan.amount - fee;
            
            // Transfer to borrower
            (bool successBorrower, ) = loan.borrower.call{value: borrowerAmount}("");
            require(successBorrower, "Transfer to borrower failed");
            
            // Transfer fee to platform
            if (fee > 0) {
                (bool successPlatform, ) = platformWallet.call{value: fee}("");
                require(successPlatform, "Platform fee transfer failed");
            }
        }

        emit LoanFunded(_loanId, msg.sender, msg.value);
    }

    function repayLoan(uint256 _loanId) external payable nonReentrant loanExists(_loanId) onlyBorrower(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Active, "Loan is not active");
        require(!loan.repaid, "Loan already repaid");

        uint256 repaymentAmount = calculateRepaymentAmount(_loanId);
        require(msg.value >= repaymentAmount, "Insufficient repayment amount");

        loan.repaid = true;
        loan.status = LoanStatus.Repaid;

        // Distribute repayments to lenders proportionally
        Investment[] storage investments = loanInvestments[_loanId];
        uint256 totalRepayment = msg.value;

        for (uint256 i = 0; i < investments.length; i++) {
            if (!investments[i].repaid) {
                uint256 lenderShare = (investments[i].amount * totalRepayment) / loan.fundedAmount;
                investments[i].repaid = true;
                
                (bool success, ) = investments[i].lender.call{value: lenderShare}("");
                require(success, "Lender repayment failed");
            }
        }

        // Update credit score
        completedLoans[msg.sender]++;
        totalRepaidAmount[msg.sender] += msg.value;
        _updateCreditScore(msg.sender);

        emit LoanRepaid(_loanId, msg.sender, msg.value);
    }

    function markDefaulted(uint256 _loanId) external onlyOwner loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Active, "Loan is not active");
        require(block.timestamp > loan.fundedAt + (loan.duration * 1 days), "Loan not yet overdue");

        loan.status = LoanStatus.Defaulted;
        defaultedLoans[loan.borrower]++;
        _updateCreditScore(loan.borrower);

        emit LoanDefaulted(_loanId, loan.borrower);
    }

    // ============ CREDIT SCORE ============
    function _updateCreditScore(address _borrower) internal {
        uint256 score = 650; // base score

        // +50 per completed loan
        score += completedLoans[_borrower] * 50;

        // +1.5 per repayment progress percentage
        if (totalBorrowedAmount[_borrower] > 0) {
            uint256 progressBps = (totalRepaidAmount[_borrower] * 10000) / totalBorrowedAmount[_borrower];
            score += (progressBps * 15) / 1000; // 1.5 per percent = 15/1000 per bps
        }

        // -100 per defaulted loan
        if (defaultedLoans[_borrower] * 100 < score) {
            score -= defaultedLoans[_borrower] * 100;
        } else {
            score = 300;
        }

        // Clamp between 300 and 850
        if (score < 300) score = 300;
        if (score > 850) score = 850;

        borrowerCreditScore[_borrower] = score;
        emit CreditScoreUpdated(_borrower, score);
    }

    function calculateCreditScore(address _borrower) external view returns (uint256) {
        if (borrowerCreditScore[_borrower] == 0) return 650;
        return borrowerCreditScore[_borrower];
    }

    // ============ VIEW FUNCTIONS ============
    function getLoan(uint256 _loanId) external view loanExists(_loanId) returns (Loan memory) {
        return loans[_loanId];
    }

    function getAllLoans() external view returns (Loan[] memory) {
        Loan[] memory allLoans = new Loan[](loanCounter);
        for (uint256 i = 1; i <= loanCounter; i++) {
            allLoans[i - 1] = loans[i];
        }
        return allLoans;
    }

    function getBorrowerLoans(address _borrower) external view returns (Loan[] memory) {
        uint256[] memory loanIds = borrowerLoans[_borrower];
        Loan[] memory result = new Loan[](loanIds.length);
        for (uint256 i = 0; i < loanIds.length; i++) {
            result[i] = loans[loanIds[i]];
        }
        return result;
    }

    function getLenderInvestments(address _lender) external view returns (Investment[] memory) {
        uint256[] memory loanIds = lenderInvestments[_lender];
        uint256 totalInvestments = 0;

        for (uint256 i = 0; i < loanIds.length; i++) {
            Investment[] memory inv = loanInvestments[loanIds[i]];
            for (uint256 j = 0; j < inv.length; j++) {
                if (inv[j].lender == _lender) {
                    totalInvestments++;
                }
            }
        }

        Investment[] memory result = new Investment[](totalInvestments);
        uint256 index = 0;
        for (uint256 i = 0; i < loanIds.length; i++) {
            Investment[] memory inv = loanInvestments[loanIds[i]];
            for (uint256 j = 0; j < inv.length; j++) {
                if (inv[j].lender == _lender) {
                    result[index] = inv[j];
                    index++;
                }
            }
        }
        return result;
    }

    function calculateRepaymentAmount(uint256 _loanId) public view loanExists(_loanId) returns (uint256) {
        Loan memory loan = loans[_loanId];
        uint256 interest = (loan.amount * loan.interestRate) / 10000;
        return loan.amount + interest;
    }

    function getLoanInvestments(uint256 _loanId) external view loanExists(_loanId) returns (Investment[] memory) {
        return loanInvestments[_loanId];
    }

    function getActiveLoans() external view returns (Loan[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= loanCounter; i++) {
            if (loans[i].status == LoanStatus.Pending || loans[i].status == LoanStatus.Active) {
                count++;
            }
        }
        Loan[] memory activeLoans = new Loan[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= loanCounter; i++) {
            if (loans[i].status == LoanStatus.Pending || loans[i].status == LoanStatus.Active) {
                activeLoans[index] = loans[i];
                index++;
            }
        }
        return activeLoans;
    }

    function getKYCData(address _user) external view returns (KYCData memory) {
        return kycRecords[_user];
    }

    // ============ FALLBACK ============
    receive() external payable {}
}
