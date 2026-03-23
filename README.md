# EqualFund — Decentralized Peer-to-Peer Lending Platform

<div align="center">

![EqualFund Banner](https://img.shields.io/badge/EqualFund-Decentralized%20P2P%20Lending-06b6d4?style=for-the-badge)

![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-627EEA?style=flat-square&logo=ethereum)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?style=flat-square&logo=solidity)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

**A full-stack Web3 application that enables trustless peer-to-peer lending on the Ethereum blockchain. No banks. No intermediaries. Just code.**

[Live Contract on Etherscan](https://sepolia.etherscan.io/address/0xa6b4Eb5a8e1C01C16de6E32BADec9c2c9BCa117C) · [Request Access](#-license--permissions)

</div>

---

## 📖 Table of Contents

- [What is EqualFund?](#-what-is-equalfund)
- [The Problem It Solves](#-the-problem-it-solves)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [How Everything Works](#-how-everything-works)
- [Smart Contract Design](#-smart-contract-design)
- [Database Design](#-database-design)
- [Security Model](#-security-model)
- [KYC & Identity Verification](#-kyc--identity-verification)
- [Credit Score System](#-credit-score-system)
- [Repayment & Multi-Lender Logic](#-repayment--multi-lender-logic)
- [Live Deployment](#-live-deployment)
- [License & Permissions](#-license--permissions)

---

## 🌟 What is EqualFund?

EqualFund is a **decentralized peer-to-peer lending platform** built on the Ethereum blockchain. It allows individuals to borrow and lend money directly to each other — without involving any bank, financial institution, or trusted third party.

The core idea is simple:

> A borrower creates a loan request on the blockchain. Any lender — anywhere in the world — can fund it. When the borrower repays, the smart contract automatically distributes the principal plus interest back to all lenders proportionally. No human intervention required.

This is made possible by **Ethereum smart contracts** — self-executing programs that live on the blockchain and cannot be modified, stopped, or manipulated by anyone once deployed — including the platform owners.

---

## 🔍 The Problem It Solves

### Traditional Banking Problems
```
❌ High interest rates (18–36% for personal loans)
❌ Long approval times (7–30 days)
❌ Geographic restrictions (need local bank account)
❌ Credit history gatekeeping (new borrowers rejected)
❌ Bank takes huge cut as intermediary
❌ Lack of transparency — you don't know where money goes
❌ Account freezing — bank can block your funds anytime
```

### EqualFund Solution
```
✅ Market-determined interest rates (borrower sets their own)
✅ Instant loan creation on blockchain
✅ Anyone with a crypto wallet can participate globally
✅ Credit score built from actual repayment history on-chain
✅ 0.5% platform fee — rest goes directly to lenders
✅ Full transparency — every transaction visible on blockchain
✅ Non-custodial — platform never holds user funds
```

---

## ✨ Key Features

### For Borrowers
| Feature | Description |
|---------|-------------|
| 🪪 KYC Verification | Submit identity documents — stored permanently on IPFS |
| 💸 Loan Creation | Specify amount, interest rate, duration, and purpose |
| 📊 Credit Score | Build on-chain credit history with every repayment |
| 🔔 Notifications | Real-time alerts when your loan gets funded |
| 📋 Loan History | Complete repayment history stored on blockchain |

### For Lenders
| Feature | Description |
|---------|-------------|
| 🏪 Marketplace | Browse all loan requests with full details |
| 💰 Flexible Funding | Fund any portion of a loan — not just full amount |
| 📈 Returns | Earn interest directly from smart contract on repayment |
| 👥 Multi-Lender | Multiple lenders can co-fund a single loan |
| ⚡ Auto-Distribution | Smart contract splits repayment automatically |

### For Platform
| Feature | Description |
|---------|-------------|
| ⚙️ Admin Dashboard | Complete KYC management and user oversight |
| 🤝 NGO Hub | Verified NGOs can receive direct ETH donations |
| 📋 Activity Logs | Every action logged for transparency and audit |
| 🔐 Security Alerts | Email notifications for unauthorized access attempts |

---

## 🛠 Tech Stack

### Blockchain Layer
```
Solidity 0.8.19     Smart contract language
Hardhat             Development, testing, and deployment framework
Ethers.js v6        JavaScript library for Ethereum interaction
OpenZeppelin v4     Audited security contracts (ReentrancyGuard, Ownable)
Sepolia Testnet     Ethereum test network for live deployment
```

### Frontend Layer
```
React 18 + Vite     Fast modern UI framework
Tailwind CSS        Utility-first CSS styling
MetaMask            Browser wallet for Ethereum transactions
ethers.js           Connects React app to blockchain
IPFS via Pinata     Decentralized file storage for KYC documents
```

### Backend Layer
```
Node.js + Express   REST API server
MongoDB + Mongoose  Document database for off-chain data
JWT Tokens          Secure authentication system
Nodemailer          Email security alert system
bcryptjs            Password hashing
```

### Infrastructure
```
Vercel              Frontend hosting (auto-deploy from GitHub)
Render              Backend API hosting
MongoDB Atlas       Cloud database (free 512MB tier)
Pinata              IPFS pinning service (free 1GB tier)
Alchemy             Ethereum RPC provider
```

---

## 🏗 System Architecture

EqualFund uses a **hybrid architecture** — combining blockchain for financial data with traditional web services for everything else. This is a deliberate design choice explained in detail below.

```
┌─────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React Frontend (Vite)                    │   │
│  │  Pages: Home, Marketplace, Borrow, Lend, KYC, Admin  │   │
│  │  MetaMask wallet integration via ethers.js            │   │
│  └──────────────┬──────────────────────┬─────────────────┘  │
└─────────────────┼──────────────────────┼────────────────────┘
                  │                      │
                  ▼                      ▼
   ┌──────────────────────┐   ┌──────────────────────────────┐
   │   Express.js Backend  │   │    Ethereum Blockchain        │
   │   (Node.js API)       │   │    (Sepolia Testnet)          │
   │                       │   │                              │
   │   Routes:             │   │   EqualFund.sol Contract     │
   │   /api/auth           │   │   ├── createLoan()           │
   │   /api/users          │   │   ├── fundLoan()             │
   │   /api/notifications  │   │   ├── repayLoan()            │
   │   /api/admin          │   │   ├── submitKYC()            │
   │   /api/loans          │   │   └── calculateCreditScore() │
   │   /api/activity       │   │                              │
   └──────────┬────────────┘   └──────────────────────────────┘
              │
              ▼
   ┌──────────────────────┐   ┌──────────────────────────────┐
   │      MongoDB          │   │         IPFS (Pinata)         │
   │      Database         │   │                              │
   │                       │   │   KYC Documents              │
   │   Collections:        │   │   Loan Support Documents     │
   │   - users             │   │   Permanent & Tamper-proof   │
   │   - notifications     │   │   Accessible via hash        │
   │   - activities        │   │                              │
   │   - loans             │   └──────────────────────────────┘
   └──────────────────────┘
```

---

## 🔄 How Everything Works

### Complete User Journey

#### Step 1 — Registration & Wallet Linking
```
User registers on platform (name, email, password)
        ↓
User connects MetaMask wallet
        ↓
Wallet address linked to user account in MongoDB
        ↓
This creates a permanent link: Identity ↔ Wallet ↔ Blockchain
```

#### Step 2 — KYC Verification
```
User uploads identity documents (Aadhaar, PAN, Passport)
        ↓
Documents uploaded to IPFS via Pinata
        ↓
IPFS hash (unique fingerprint) stored in MongoDB
        ↓
Admin reviews documents in Admin Dashboard
        ↓
Admin approves → kycStatus = "verified" in MongoDB
        ↓
User can now create loan requests
```

#### Step 3 — Creating a Loan
```
Borrower fills loan form (amount, interest, duration, purpose)
        ↓
MetaMask popup → User signs transaction
        ↓
Transaction sent to Ethereum blockchain
        ↓
Smart contract createLoan() executes
        ↓
Loan stored permanently on blockchain with unique ID
        ↓
MongoDB saves additional metadata (purpose, category, borrower name)
        ↓
Loan appears in Marketplace for lenders to see
```

#### Step 4 — Funding a Loan
```
Lender browses Marketplace
        ↓
Lender clicks "Fund This Loan" → enters amount
        ↓
MetaMask popup → Lender sends ETH
        ↓
Smart contract fundLoan() executes
        ↓
ETH locked inside smart contract (escrow)
        ↓
When fully funded → ETH automatically released to borrower
        ↓
Borrower gets notification: "[Lender Name] funded X ETH to your loan"
        ↓
MongoDB records funding with lender details
```

#### Step 5 — Repayment
```
Borrower sends repayment (principal + interest)
        ↓
Smart contract repayLoan() executes
        ↓
Contract calculates each lender's share proportionally
        ↓
ETH automatically distributed to all lenders simultaneously
        ↓
Platform fee (0.5%) deducted automatically
        ↓
Credit score updated on-chain (+50 points)
        ↓
All lenders notified: "[Borrower] repaid. You received X ETH"
```

---

## 📝 Smart Contract Design

### Contract: `EqualFund.sol`

The smart contract is the heart of the platform. It handles all financial operations without any human intervention.

#### Inheritance
```solidity
contract EqualFund is ReentrancyGuard, Ownable
```
- **ReentrancyGuard** — Prevents reentrancy attacks (most common DeFi hack)
- **Ownable** — Only platform owner can call admin functions

#### Data Structures
```solidity
struct Loan {
    uint256 id;
    address payable borrower;
    uint256 amount;          // in wei
    uint256 interestRate;    // e.g. 5 = 5%
    uint256 fundedAmount;
    uint256 duration;        // in days
    uint256 createdAt;
    uint256 fundedAt;
    LoanStatus status;       // Pending, Active, Repaid, Defaulted
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
```

#### Key Functions
```solidity
// Borrower creates a loan request
function createLoan(uint256 amount, uint256 interestRate, 
                    uint256 duration, string memory kycHash) 
    external returns (uint256)

// Lender funds a loan with ETH
function fundLoan(uint256 loanId) 
    external payable nonReentrant

// Borrower repays — auto-distributes to all lenders
function repayLoan(uint256 loanId) 
    external payable nonReentrant

// Submit KYC document hash to blockchain
function submitKYC(string memory fullName, ..., string memory ipfsHash) 
    external

// Calculate credit score from repayment history
function calculateCreditScore(address borrower) 
    external view returns (uint256)
```

#### Platform Fee Logic
```
Repayment Amount = Principal + (Principal × Interest Rate / 100)
Platform Fee     = Repayment × 0.5%
Lender Payout    = Repayment - Platform Fee
Each Lender Gets = Lender Payout × (Their Investment / Total Loan Amount)
```

---

## 🗄 Database Design

### Why MongoDB + Blockchain Together?

This is the most important architectural decision in EqualFund:

```
BLOCKCHAIN stores:              MONGODB stores:
✅ Loan amounts                 ✅ User profiles
✅ Interest rates               ✅ KYC status & hashes
✅ Wallet addresses             ✅ Notifications
✅ Transaction history          ✅ Activity logs
✅ Credit scores                ✅ Loan metadata (purpose, category)
✅ KYC document hashes          ✅ Lender names & details
✅ Repayment records
```

**Why not store everything on blockchain?**
Storing text on Ethereum is extremely expensive. A single notification would cost $0.50–$5 in gas fees. MongoDB stores this data for free, while blockchain handles the financial truth.

### MongoDB Collections

```javascript
// users collection
{
  name, email, password (hashed),
  role: "borrower" | "lender" | "admin",
  walletAddress,
  kycStatus: "none" | "pending" | "verified" | "rejected",
  kycIpfsHash,
  creditScore: 300-850,
  isActive: true/false
}

// loans collection  
{
  loanId,              // matches blockchain loan ID
  borrowerAddress,
  borrowerName,
  amount, interestRate, duration,
  purpose, category,
  status: 0-3,
  investments: [{lenderAddress, lenderName, amount, fundedAt}],
  repaidAt, repaidAmount
}

// notifications collection
{
  userId, title, message,
  type, read: false,
  loanId, txHash
}

// activities collection
{
  userId, action, details,
  walletAddress, createdAt
}
```

---

## 🔒 Security Model

EqualFund uses multiple layers of security:

### Smart Contract Security
```
1. ReentrancyGuard    → Prevents reentrancy attacks
2. Input validation   → All inputs checked before execution  
3. Access control     → Only borrower can repay their own loan
4. Immutable logic    → Contract code cannot be changed after deployment
5. Transparent        → All code visible on Etherscan
```

### API Security
```
1. JWT Authentication  → Every request requires valid token
2. bcrypt Hashing      → Passwords never stored in plaintext
3. CORS Protection     → Only allowed origins can call API
4. Rate Limiting       → Prevents brute force attacks
5. Admin Secret Key    → Extra layer for admin panel access
```

### Admin Security
```
Three-factor authentication required:
1. Email + Password (known to user)
2. Admin Secret Key  (stored only in server .env)
3. Email OTP         (sent to registered email)

Unauthorized attempts:
→ Logged to database
→ Email alert sent to admin instantly
→ IP address recorded
```

### Data Security
```
KYC Documents → Encrypted on IPFS, only hash stored
Private Keys  → Never stored anywhere in codebase
Wallet Funds  → Held by smart contract, not platform
.env Files    → Excluded from all git commits
```

---

## 🪪 KYC & Identity Verification

### Why KYC is Required

Before a user can borrow, they must verify their identity. This serves three purposes:

1. **Lender Protection** — Lenders know there's a real person behind each loan request
2. **Legal Compliance** — Financial platforms must verify user identities
3. **Fraud Prevention** — Stops people from creating multiple fake accounts

### KYC Flow

```
User fills personal information
        ↓
Uploads government ID (front + back)
        ↓  
Uploads selfie holding the ID
        ↓
Files sent to Pinata → stored on IPFS permanently
        ↓
Three IPFS hashes combined: "frontHash|backHash|selfieHash"
        ↓
Combined hash stored in MongoDB (kycIpfsHash field)
        ↓
Admin reviews documents in dashboard
        ↓
Admin clicks Approve → kycStatus = "verified"
        ↓
Notification sent to user
        ↓
User can now create loan requests
```

### Where is KYC on Blockchain?

The IPFS hash is submitted to the smart contract via `submitKYC()`. This creates an **immutable on-chain proof** that the user submitted documents at a specific time. However, the approval decision is stored in MongoDB — this is intentional because:

- Blockchain approval would cost gas fees per decision
- Admin may need to reverse incorrect decisions
- KYC status can change (expiry, re-verification)

---

## 📊 Credit Score System

### How Scores are Calculated

```
Starting Score:    650 (all new users)
Score Range:       300 (worst) — 850 (best)

Score Changes:
+50 points    → Successful loan repayment
+25 points    → KYC verification completed  
-100 points   → Loan default (no repayment)

Score is calculated by: calculateCreditScore() on smart contract
Based on: completedLoans, defaultedLoans, totalRepaidAmount
```

### Score Tiers & Loan Limits

| Score Range | Status | Max Loan | Interest Rate |
|-------------|--------|----------|---------------|
| 800 – 850 | 🏆 Excellent | 10 ETH | 1–5% |
| 700 – 799 | 💎 Very Good | 5 ETH | 3–7% |
| 600 – 699 | 🟢 Good | 2 ETH | 5–10% |
| 500 – 599 | 🟡 Fair | 0.5 ETH | 10–15% |
| 300 – 499 | 🔴 High Risk | 0.1 ETH | 15–20% |

---

## 💰 Repayment & Multi-Lender Logic

### Single Lender Example
```
Loan: 1 ETH at 5% for 30 days
Lender A funds: 1 ETH (100%)

On repayment:
Total repay = 1 + (1 × 5/100) = 1.05 ETH
Platform fee = 1.05 × 0.5% = 0.00525 ETH
Lender A receives = 1.05 - 0.00525 = 1.04475 ETH
```

### Multiple Lenders Example
```
Loan: 1 ETH at 5% for 30 days
Lender A funds: 0.6 ETH (60%)
Lender B funds: 0.4 ETH (40%)

On repayment (1.05 ETH total):
Platform fee = 0.00525 ETH
Net to distribute = 1.04475 ETH

Lender A receives = 1.04475 × 60% = 0.62685 ETH
Lender B receives = 1.04475 × 40% = 0.41790 ETH

Smart contract handles this split automatically.
No manual intervention. No delays. No errors.
```

### Default Consequences
```
Day 14+  → Grace period warning sent
Day 17+  → Loan marked as Defaulted by admin
         → Credit score -100 points
         → Borrower blocked from new loans
         → All lenders notified
         → Wallet address flagged on platform
```

---

## 🌐 Live Deployment

### Smart Contract (Permanent)
```
Network:  Sepolia Testnet (Ethereum)
Address:  0xa6b4Eb5a8e1C01C16de6E32BADec9c2c9BCa117C
Explorer: https://sepolia.etherscan.io/address/0xa6b4Eb5a8e1C01C16de6E32BADec9c2c9BCa117C
```

### Technology Choices Explained

**Why Sepolia Testnet?**
Sepolia is Ethereum's official test network. It uses real blockchain infrastructure (permanent, immutable, decentralized) but with test ETH that has no monetary value. Perfect for demonstrating a production-ready DApp without financial risk.

**Why IPFS for KYC documents?**
IPFS (InterPlanetary File System) stores files in a decentralized network. Once uploaded, files cannot be deleted or modified. The IPFS hash is a cryptographic fingerprint — if the document changes even by one pixel, the hash changes completely. This makes document fraud impossible.

**Why MongoDB alongside blockchain?**
Storing all data on Ethereum would be prohibitively expensive. Storing a 100-character notification would cost $1–5 in gas fees. MongoDB handles free, fast storage of non-financial data while the blockchain stores only what requires immutability and trust.

---

## 📜 License & Permissions

**Copyright © 2025. All Rights Reserved.**

This project and its entire source code are proprietary and confidential. The following actions are strictly prohibited without explicit written permission from the author:

- Copying or reproducing any part of this codebase
- Forking this repository
- Using this code in any personal or commercial project
- Distributing or publishing this code in any form
- Creating derivative works based on this project

**To request permission or collaborate:**
Open a GitHub issue on this repository or contact via GitHub profile.

---

<div align="center">

Built with ❤️ using Ethereum, React, and Node.js

*Decentralizing finance, one loan at a time.*

</div>
