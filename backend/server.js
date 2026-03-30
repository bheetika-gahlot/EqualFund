const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'https://equalfund.vercel.app',
    'https://equalfund-git-main-bheetika-gahlots-projects.vercel.app',
    /\.vercel\.app$/,  // allow all vercel preview URLs
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── ROUTES ───────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity',      require('./routes/activity'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/admin',         require('./routes/adminAuth'));
app.use('/api/loans',         require('./routes/loans'));
app.use('/api/reminders',     require('./routes/reminders'));

// ── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   '✅ EqualFund API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── START EMI REMINDERS ───────────────────────────────────
const { startEMIReminders } = require('./routes/reminders');
startEMIReminders();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 EqualFund API running on http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/api/health\n`);
});
