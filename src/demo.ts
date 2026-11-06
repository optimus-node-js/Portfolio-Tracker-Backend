// Deterministic sample portfolio served for clientId "demo", so the dashboard can be
// explored publicly without broker credentials or a database. Shapes match the
// documents written by the Python ingestion job (Portfolio-Tracker repo).

const STOCKS = [
  { name: 'RELIANCE-EQ', token: '2885', qty: 12, avg: 2410, drift: 0.0006, vol: 0.012 },
  { name: 'INFY-EQ', token: '1594', qty: 20, avg: 1460, drift: 0.0004, vol: 0.014 },
  { name: 'HDFCBANK-EQ', token: '1333', qty: 18, avg: 1530, drift: 0.0003, vol: 0.011 },
  { name: 'TATAMOTORS-EQ', token: '3456', qty: 40, avg: 640, drift: 0.0009, vol: 0.02 },
  { name: 'ITC-EQ', token: '1660', qty: 60, avg: 405, drift: 0.0002, vol: 0.009 },
  { name: 'NTPC-EQ', token: '11630', qty: 75, avg: 300, drift: 0.0005, vol: 0.013 },
];
const DAYS = 120;

// Small seeded PRNG so every request returns the same series.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const ddmmyyyy = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

function tradingDays(): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < DAYS) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.unshift(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days;
}

export function demoPortfolios() {
  const days = tradingDays();
  const rand = rng(42);
  const prices = STOCKS.map((s) => s.avg * 0.98);
  const stockEntries: Record<string, any[]> = Object.fromEntries(STOCKS.map((s) => [s.name, []]));
  const overall: any[] = [];

  days.forEach((day, i) => {
    let holding = 0;
    let invested = 0;
    let today = 0;
    STOCKS.forEach((s, k) => {
      const prev = prices[k];
      prices[k] = prev * (1 + s.drift + (rand() - 0.5) * 2 * s.vol);
      const value = prices[k] * s.qty;
      const cost = s.avg * s.qty;
      const dayGain = (prices[k] - prev) * s.qty;
      holding += value;
      invested += cost;
      today += dayGain;
      stockEntries[s.name].push({
        date: ddmmyyyy(day),
        exchange: 'NSE',
        quantity: s.qty,
        realisedquantity: s.qty,
        authorisedquantity: 0,
        product: 'DELIVERY',
        averageprice: s.avg,
        symboltoken: s.token,
        overallPnL: round2(value - cost),
        pnlpercentage: round2(((value - cost) / cost) * 100),
        todayGain: i === 0 ? 0 : round2(dayGain),
      });
    });
    overall.push({
      date: ddmmyyyy(day),
      totalholdingvalue: round2(holding),
      totalinvvalue: round2(invested),
      totalprofitandloss: round2(holding - invested),
      totalpnlpercentage: round2(((holding - invested) / invested) * 100),
      totalTodayGain: i === 0 ? 0 : round2(today),
    });
  });

  return {
    portfolio: { ClientCode: 'demo', Portfolio: overall },
    stockPortfolio: {
      ClientCode: 'demo',
      PortfolioStocks: STOCKS.map((s) => ({ stockName: s.name, entries: stockEntries[s.name] })),
    },
  };
}
