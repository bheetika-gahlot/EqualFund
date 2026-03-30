// conversionService.js
// ETH to multiple currency conversion with live prices

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let priceCache = {
  data: null,
  timestamp: null,
};

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
];

export const getPrices = async () => {
  // Return cached if fresh
  if (priceCache.data && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.data;
  }

  try {
    const currencies = CURRENCIES.map(c => c.code.toLowerCase()).join(',');
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=${currencies}`
    );
    const data = await res.json();
    priceCache = { data: data.ethereum, timestamp: Date.now() };
    return data.ethereum;
  } catch {
    // Fallback prices
    return { inr: 250000, usd: 3000, eur: 2800, gbp: 2400, jpy: 450000, aed: 11000, sgd: 4000 };
  }
};

export const convertETH = (ethAmount, prices, currency = 'INR') => {
  const price = prices?.[currency.toLowerCase()] || 0;
  const amount = parseFloat(ethAmount) * price;
  const curr = CURRENCIES.find(c => c.code === currency);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount);
};
