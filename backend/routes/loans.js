// backend/routes/loans.js — Complete with UPI payment + notifications
const express  = require('express');
const router   = express.Router();
const Loan     = require('../models/Loan');
const User     = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

function calcScore(loans=[], kycVerified=false, createdAt=null) {
  let score=500;
  const total=loans.length, repaid=loans.filter(l=>l.status===2).length, defaulted=loans.filter(l=>l.status===3).length;
  if(total>0) score+=Math.round((repaid/total)*200);
  score-=defaulted*80; score+=repaid*15;
  if(kycVerified) score+=50;
  if(createdAt) { const m=(Date.now()-new Date(createdAt))/(1000*60*60*24*30); score+=Math.min(Math.round(m*5),50); }
  return Math.max(300,Math.min(850,Math.round(score)));
}

// ── GET all loans ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {borrowerAddress,loanId,page=1,limit=100}=req.query;
    const q={};
    if(borrowerAddress) q.borrowerAddress=borrowerAddress.toLowerCase();
    if(loanId)          q.loanId=parseInt(loanId);
    const loans=await Loan.find(q).sort({createdAt:-1}).limit(parseInt(limit)).skip((parseInt(page)-1)*parseInt(limit));
    res.json({success:true,loans});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

// ── CREATE loan ───────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {loanId,borrowerAddress,borrowerName,amount,interestRate,duration,purpose,category,ipfsHash,collateralType,collateralAmount}=req.body;
    const existing=await Loan.findOne({loanId:parseInt(loanId)});
    if(existing) return res.json({success:true,loan:existing});

    const user=await User.findOne({walletAddress:borrowerAddress?.toLowerCase()});
    const fraudFlags=[];
    if(user) {
      const ageDays=(Date.now()-new Date(user.createdAt))/86400000;
      if(ageDays<3) fraudFlags.push({type:'new_account',severity:'medium',desc:`Account ${Math.floor(ageDays)} days old`});
      if((user.creditScore||650)<400) fraudFlags.push({type:'low_credit',severity:'high',desc:`Score: ${user.creditScore}`});
      const prev=await Loan.find({borrowerAddress:borrowerAddress?.toLowerCase()});
      const defs=prev.filter(l=>l.status===3).length;
      if(defs>0) fraudFlags.push({type:'previous_defaults',severity:'high',desc:`${defs} default(s)`});
    }

    const loan=await Loan.create({
      loanId:parseInt(loanId), borrowerAddress:borrowerAddress?.toLowerCase(),
      borrowerName:borrowerName||user?.name||'Unknown',
      amount:amount?.toString(), interestRate:parseFloat(interestRate),
      duration:parseInt(duration), purpose:purpose||'', category:category||'other',
      ipfsHash:ipfsHash||'', status:0,
      collateralType:collateralType||'none', collateralAmount:collateralAmount||'0',
      fraudFlags, riskLevel:fraudFlags.some(f=>f.severity==='high')?'high':fraudFlags.length>0?'medium':'low',
    });
    res.status(201).json({success:true,loan});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

// ── FUND loan (ETH via blockchain) ───────────────────────
router.post('/:loanId/fund', protect, async (req, res) => {
  try {
    const {lenderAddress,lenderName,amount,amountFunded,isFullyFunded,paymentMethod,inrAmount}=req.body;
    const loan=await Loan.findOne({loanId:parseInt(req.params.loanId)});
    if(!loan) return res.status(404).json({success:false,message:'Loan not found'});

    loan.investments=loan.investments||[];
    const already=loan.investments.find(i=>i.lenderAddress===lenderAddress?.toLowerCase());
    if(!already) loan.investments.push({ lenderAddress:lenderAddress?.toLowerCase(), lenderName:lenderName||'Unknown', amount:amount?.toString(), paymentMethod:paymentMethod||'eth', inrAmount:inrAmount||null, investedAt:new Date() });
    loan.fundedAmount=amountFunded?.toString();
    if(isFullyFunded){loan.status=1;loan.fundedAt=new Date();}
    await loan.save();

    // Notify borrower
    const borrower=await User.findOne({walletAddress:loan.borrowerAddress});
    if(borrower&&isFullyFunded) {
      const lName=lenderName||`${lenderAddress?.slice(0,8)}...`;
      const isINR=paymentMethod==='inr';
      await Notification.create({
        userId:borrower._id,
        title: isINR?'💳 Loan Funded via INR Payment!':'💰 Your Loan is Fully Funded!',
        message: isINR
          ? `${lName} funded your Loan #${loan.loanId} with ₹${Number(inrAmount||0).toLocaleString('en-IN')} (≈ ${amount} ETH). Your loan is now active!`
          : `${lName} funded your Loan #${loan.loanId} with ${amount} ETH. Funds are being released to your wallet!`,
        type:'loan_funded',
      });
    }

    res.json({success:true,loan});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

// ── FUND loan via INR/UPI (no blockchain tx) ─────────────
router.post('/:loanId/fund-inr', protect, async (req, res) => {
  try {
    const {lenderAddress,lenderName,ethAmount,inrAmount,paymentId,paymentMethod}=req.body;
    const loanId=parseInt(req.params.loanId);
    const loan=await Loan.findOne({loanId});
    if(!loan) return res.status(404).json({success:false,message:'Loan not found'});

    // Add investment record
    loan.investments=loan.investments||[];
    const exists=loan.investments.find(i=>i.lenderAddress===lenderAddress?.toLowerCase());
    if(!exists) {
      loan.investments.push({
        lenderAddress: lenderAddress?.toLowerCase(),
        lenderName:    lenderName||'INR Payment',
        amount:        ethAmount?.toString(),
        paymentMethod: paymentMethod||'inr',
        inrAmount:     inrAmount,
        paymentId:     paymentId,
        investedAt:    new Date(),
      });
    }
    loan.fundedAmount=ethAmount?.toString();
    loan.status=1;
    loan.fundedAt=new Date();
    await loan.save();

    // ── Notify BORROWER ────────────────────────────────────
    const borrower=await User.findOne({walletAddress:loan.borrowerAddress});
    if(borrower) {
      const lName=lenderName||`${lenderAddress?.slice(0,8)}...`;
      await Notification.create({
        userId:  borrower._id,
        title:   `💳 Loan #${loanId} Funded via INR Payment!`,
        message: `${lName} funded your loan with ₹${Number(inrAmount).toLocaleString('en-IN')} (≈ ${ethAmount} ETH) via Card/UPI/Netbanking. Your loan is now ACTIVE! Payment ID: ${paymentId}`,
        type:    'loan_funded',
      });
    }

    // ── Notify LENDER ──────────────────────────────────────
    const lender=await User.findOne({walletAddress:lenderAddress?.toLowerCase()});
    if(lender) {
      await Notification.create({
        userId:  lender._id,
        title:   `✅ Payment Confirmed — Loan #${loanId}`,
        message: `Your INR payment of ₹${Number(inrAmount).toLocaleString('en-IN')} was successful. Payment ID: ${paymentId}. You'll receive ${ethAmount} ETH + interest when the borrower repays.`,
        type:    'payment_confirmed',
      });
    }

    res.json({success:true,loan,message:'Loan funded via INR payment'});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

// ── REPAY loan ────────────────────────────────────────────
router.post('/:loanId/repay', protect, async (req, res) => {
  try {
    const {borrowerAddress,repaidAmount}=req.body;
    const loan=await Loan.findOne({loanId:parseInt(req.params.loanId)});
    if(!loan) return res.status(404).json({success:false,message:'Loan not found'});
    loan.status=2; loan.repaid=true; loan.repaidAt=new Date(); loan.repaidAmount=repaidAmount?.toString();
    if(loan.collateralType==='eth') loan.collateralStatus='released';
    await loan.save();

    const borrower=await User.findOne({walletAddress:borrowerAddress?.toLowerCase()});
    if(borrower){
      const allLoans=await Loan.find({borrowerAddress:borrowerAddress?.toLowerCase()});
      const newScore=calcScore(allLoans,borrower.kycStatus==='verified',borrower.createdAt);
      const oldScore=borrower.creditScore||650;
      borrower.creditScore=newScore; await borrower.save();
      await Notification.create({ userId:borrower._id, title:newScore>oldScore?`🎉 Credit Score +${newScore-oldScore}!`:'✅ Loan Repaid', message:`Loan #${loan.loanId} repaid. Score: ${newScore}${newScore>oldScore?` (+${newScore-oldScore})`:''}`, type:'loan_repaid' });
      for(const inv of(loan.investments||[])){
        const lender=await User.findOne({walletAddress:inv.lenderAddress});
        if(lender) await Notification.create({ userId:lender._id, title:'💰 Loan Repaid!', message:`Loan #${loan.loanId} was repaid. Your ${inv.amount} ETH + interest is back in your wallet.`, type:'loan_repaid' });
      }
      return res.json({success:true,loan,newCreditScore:newScore,scoreDiff:newScore-oldScore});
    }
    res.json({success:true,loan});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

router.get('/history/:address', async (req,res) => {
  try {
    const addr=req.params.address.toLowerCase();
    const loans=await Loan.find({borrowerAddress:addr});
    const funded=await Loan.find({'investments.lenderAddress':addr});
    res.json({success:true,loans,funded});
  } catch(e){res.status(500).json({success:false,message:e.message});}
});

module.exports = router;
