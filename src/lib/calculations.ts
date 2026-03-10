// ============================================
// PSX Portfolio Tracker — Calculation Engine
// All financial formulas and data aggregations
// ============================================

import type {
  Trade,
  PortfolioHolding,
  SectorAllocation,
  RealizedTrade,
  MonthlyAnalysis,
  QuarterlyAnalysis,
  YearlyAnalysis,
  RiskMetric,
  AppSettings,
  StockCache,
} from '@/types';

/**
 * Calculate current holdings from trade history
 * Groups BUY/SELL by symbol, computes avg price, qty held, cost basis
 */
export function calculateHoldings(
  trades: Trade[],
  priceMap: Record<string, StockCache>
): PortfolioHolding[] {
  const holdingMap: Record<string, {
    symbol: string;
    stock_name: string;
    sector: string;
    totalBuyQty: number;
    totalBuyValue: number;
    totalSellQty: number;
  }> = {};

  // Process trades chronologically
  const sorted = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  for (const t of sorted) {
    if (!holdingMap[t.symbol]) {
      holdingMap[t.symbol] = {
        symbol: t.symbol,
        stock_name: t.stock_name,
        sector: t.sector,
        totalBuyQty: 0,
        totalBuyValue: 0,
        totalSellQty: 0,
      };
    }
    const h = holdingMap[t.symbol];
    if (t.trade_type === 'BUY') {
      h.totalBuyQty += t.quantity;
      h.totalBuyValue += t.quantity * t.rate_per_share;
    } else {
      h.totalSellQty += t.quantity;
    }
  }

  const holdings: PortfolioHolding[] = [];
  let totalMarketValue = 0;

  // First pass: calculate market values for weight calculation
  for (const h of Object.values(holdingMap)) {
    const qtyHeld = h.totalBuyQty - h.totalSellQty;
    if (qtyHeld <= 0) continue;
    const currentPrice = priceMap[h.symbol]?.current_price || 0;
    totalMarketValue += qtyHeld * currentPrice;
  }

  // Second pass: build holdings array
  for (const h of Object.values(holdingMap)) {
    const qtyHeld = h.totalBuyQty - h.totalSellQty;
    if (qtyHeld <= 0) continue;

    const avgBuyPrice = h.totalBuyQty > 0 ? h.totalBuyValue / h.totalBuyQty : 0;
    const costBasis = qtyHeld * avgBuyPrice;
    const stock = priceMap[h.symbol];
    const currentPrice = stock?.current_price || 0;
    const marketValue = qtyHeld * currentPrice;
    const unrealizedPL = marketValue - costBasis;
    const unrealizedPLPct = costBasis > 0 ? (unrealizedPL / costBasis) : 0;
    const weightPct = totalMarketValue > 0 ? (marketValue / totalMarketValue) : 0;
    const changeToday = stock?.change || 0;
    const changeTodayPct = stock?.change_pct || 0;

    holdings.push({
      symbol: h.symbol,
      stock_name: h.stock_name,
      sector: h.sector,
      quantity_held: qtyHeld,
      avg_buy_price: avgBuyPrice,
      cost_basis: costBasis,
      current_price: currentPrice,
      market_value: marketValue,
      unrealized_pl: unrealizedPL,
      unrealized_pl_pct: unrealizedPLPct,
      weight_pct: weightPct,
      change_today: changeToday,
      change_today_pct: changeTodayPct,
    });
  }

  return holdings.sort((a, b) => b.market_value - a.market_value);
}

/**
 * Calculate sector allocation from holdings
 */
export function calculateSectorAllocation(holdings: PortfolioHolding[]): SectorAllocation[] {
  const sectorMap: Record<string, {
    sector: string;
    symbols: Set<string>;
    totalInvested: number;
    currentValue: number;
  }> = {};

  const totalValue = holdings.reduce((sum, h) => sum + h.market_value, 0);

  for (const h of holdings) {
    if (!sectorMap[h.sector]) {
      sectorMap[h.sector] = {
        sector: h.sector,
        symbols: new Set(),
        totalInvested: 0,
        currentValue: 0,
      };
    }
    const s = sectorMap[h.sector];
    s.symbols.add(h.symbol);
    s.totalInvested += h.cost_basis;
    s.currentValue += h.market_value;
  }

  return Object.values(sectorMap)
    .map((s) => {
      const pl = s.currentValue - s.totalInvested;
      return {
        sector: s.sector,
        stock_count: s.symbols.size,
        total_invested: s.totalInvested,
        current_value: s.currentValue,
        pl,
        pl_pct: s.totalInvested > 0 ? pl / s.totalInvested : 0,
        weight_pct: totalValue > 0 ? s.currentValue / totalValue : 0,
      };
    })
    .sort((a, b) => b.weight_pct - a.weight_pct);
}

/**
 * Calculate realized P&L from sell trades using average cost method
 */
export function calculateRealizedPL(trades: Trade[]): RealizedTrade[] {
  // Build avg buy price per symbol up to each sell
  const sorted = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  const buyTracker: Record<string, { totalQty: number; totalValue: number }> = {};
  const realized: RealizedTrade[] = [];

  for (const t of sorted) {
    if (!buyTracker[t.symbol]) {
      buyTracker[t.symbol] = { totalQty: 0, totalValue: 0 };
    }
    const bt = buyTracker[t.symbol];

    if (t.trade_type === 'BUY') {
      bt.totalQty += t.quantity;
      bt.totalValue += t.quantity * t.rate_per_share;
    } else {
      const avgBuyRate = bt.totalQty > 0 ? bt.totalValue / bt.totalQty : 0;
      const buyValue = t.quantity * avgBuyRate;
      const sellValue = t.quantity * t.rate_per_share;
      const pl = sellValue - buyValue;

      realized.push({
        symbol: t.symbol,
        stock_name: t.stock_name,
        sector: t.sector,
        quantity_sold: t.quantity,
        avg_buy_rate: avgBuyRate,
        sell_rate: t.rate_per_share,
        buy_value: buyValue,
        sell_value: sellValue,
        realized_pl: pl,
        realized_pl_pct: buyValue > 0 ? pl / buyValue : 0,
        sell_date: t.trade_date,
      });

      // Reduce tracker
      bt.totalQty -= t.quantity;
      bt.totalValue -= t.quantity * avgBuyRate;
    }
  }

  return realized;
}

/**
 * Group trades into monthly analysis
 */
export function calculateMonthlyAnalysis(trades: Trade[]): MonthlyAnalysis[] {
  const monthMap: Record<string, {
    buys: number;
    sells: number;
    tradeCount: number;
    sectorCount: Record<string, number>;
    month: number;
    year: number;
  }> = {};

  for (const t of trades) {
    const d = new Date(t.trade_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap[key]) {
      monthMap[key] = {
        buys: 0, sells: 0, tradeCount: 0,
        sectorCount: {},
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      };
    }
    const m = monthMap[key];
    m.tradeCount++;
    if (t.trade_type === 'BUY') m.buys += t.net_value;
    else m.sells += t.net_value;
    m.sectorCount[t.sector] = (m.sectorCount[t.sector] || 0) + 1;
  }

  const realizedTrades = calculateRealizedPL(trades);
  const realizedByMonth: Record<string, number> = {};
  for (const r of realizedTrades) {
    const d = new Date(r.sell_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    realizedByMonth[key] = (realizedByMonth[key] || 0) + r.realized_pl;
  }

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, m]) => {
      const mostActive = Object.entries(m.sectorCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      return {
        period: `${monthNames[m.month - 1]} ${m.year}`,
        month: m.month,
        year: m.year,
        total_buys: m.buys,
        total_sells: m.sells,
        net_investment: m.buys - m.sells,
        realized_pl: realizedByMonth[key] || 0,
        trade_count: m.tradeCount,
        most_active_sector: mostActive,
      };
    });
}

/**
 * Group trades into quarterly analysis
 */
export function calculateQuarterlyAnalysis(trades: Trade[]): QuarterlyAnalysis[] {
  const qMap: Record<string, {
    buys: number;
    sells: number;
    tradeCount: number;
    sectorPL: Record<string, number>;
    quarter: number;
    year: number;
  }> = {};

  for (const t of trades) {
    const d = new Date(t.trade_date);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const key = `${d.getFullYear()}-Q${q}`;

    if (!qMap[key]) {
      qMap[key] = {
        buys: 0, sells: 0, tradeCount: 0,
        sectorPL: {},
        quarter: q,
        year: d.getFullYear(),
      };
    }
    const m = qMap[key];
    m.tradeCount++;
    if (t.trade_type === 'BUY') m.buys += t.net_value;
    else m.sells += t.net_value;
  }

  const realizedTrades = calculateRealizedPL(trades);
  for (const r of realizedTrades) {
    const d = new Date(r.sell_date);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const key = `${d.getFullYear()}-Q${q}`;
    if (qMap[key]) {
      qMap[key].sectorPL[r.sector] = (qMap[key].sectorPL[r.sector] || 0) + r.realized_pl;
    }
  }

  const entries = Object.entries(qMap).sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([, m], i) => {
    const realizedPL = Object.values(m.sectorPL).reduce((s, v) => s + v, 0);
    const sectorEntries = Object.entries(m.sectorPL);
    const best = sectorEntries.sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    const worst = sectorEntries.sort(([, a], [, b]) => a - b)[0]?.[0] || 'N/A';
    const portfolioValue = m.buys - m.sells + realizedPL;
    const prevValue = i > 0 ? entries[i - 1][1].buys - entries[i - 1][1].sells : 0;

    return {
      period: `Q${m.quarter} ${m.year}`,
      quarter: m.quarter,
      year: m.year,
      total_buys: m.buys,
      total_sells: m.sells,
      net_investment: m.buys - m.sells,
      realized_pl: realizedPL,
      portfolio_value: portfolioValue,
      qoq_growth_pct: prevValue > 0 ? (portfolioValue - prevValue) / prevValue : 0,
      best_sector: best,
      worst_sector: worst,
    };
  });
}

/**
 * Group trades into yearly analysis
 */
export function calculateYearlyAnalysis(trades: Trade[]): YearlyAnalysis[] {
  const yMap: Record<number, {
    capitalDeployed: number;
    capitalRecovered: number;
    tradeCount: number;
  }> = {};

  for (const t of trades) {
    const y = new Date(t.trade_date).getFullYear();
    if (!yMap[y]) {
      yMap[y] = { capitalDeployed: 0, capitalRecovered: 0, tradeCount: 0 };
    }
    yMap[y].tradeCount++;
    if (t.trade_type === 'BUY') yMap[y].capitalDeployed += t.gross_value;
    else yMap[y].capitalRecovered += t.gross_value;
  }

  const realizedTrades = calculateRealizedPL(trades);
  const realizedByYear: Record<number, { total: number; wins: number; total_sells: number; best: number; worst: number }> = {};

  for (const r of realizedTrades) {
    const y = new Date(r.sell_date).getFullYear();
    if (!realizedByYear[y]) {
      realizedByYear[y] = { total: 0, wins: 0, total_sells: 0, best: -Infinity, worst: Infinity };
    }
    const ry = realizedByYear[y];
    ry.total += r.realized_pl;
    ry.total_sells++;
    if (r.realized_pl > 0) ry.wins++;
    ry.best = Math.max(ry.best, r.realized_pl);
    ry.worst = Math.min(ry.worst, r.realized_pl);
  }

  return Object.entries(yMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([yearStr, y]) => {
      const year = Number(yearStr);
      const ry = realizedByYear[year] || { total: 0, wins: 0, total_sells: 0, best: 0, worst: 0 };
      return {
        year,
        capital_deployed: y.capitalDeployed,
        capital_recovered: y.capitalRecovered,
        net_invested: y.capitalDeployed - y.capitalRecovered,
        realized_pl: ry.total,
        roi_pct: y.capitalDeployed > 0 ? ry.total / y.capitalDeployed : 0,
        trade_count: y.tradeCount,
        win_rate: ry.total_sells > 0 ? ry.wins / ry.total_sells : 0,
        best_trade_pl: ry.best === -Infinity ? 0 : ry.best,
        worst_trade_pl: ry.worst === Infinity ? 0 : ry.worst,
      };
    });
}

/**
 * Calculate risk metrics from holdings and settings
 */
export function calculateRiskMetrics(
  holdings: PortfolioHolding[],
  settings: AppSettings
): RiskMetric[] {
  const totalInvested = holdings.reduce((s, h) => s + h.cost_basis, 0);
  const totalMarketValue = holdings.reduce((s, h) => s + h.market_value, 0);
  const capitalAvailable = settings.capital_available || 1;

  // Capital utilization
  const capitalUtil = capitalAvailable > 0 ? totalInvested / capitalAvailable : 0;

  // Leverage ratio
  const leverageRatio = capitalAvailable > 0 ? settings.leverage_used / capitalAvailable : 0;

  // Max sector exposure
  const sectorAlloc = calculateSectorAllocation(holdings);
  const maxSectorWeight = sectorAlloc.length > 0 ? sectorAlloc[0].weight_pct : 0;

  // Max stock exposure
  const maxStockWeight = holdings.length > 0 ? holdings[0].weight_pct : 0;

  // Diversification
  const uniqueSectors = new Set(holdings.map((h) => h.sector)).size;

  const getStatus = (val: number, warn: number, danger: number): 'safe' | 'warning' | 'danger' => {
    if (val >= danger) return 'danger';
    if (val >= warn) return 'warning';
    return 'safe';
  };

  return [
    {
      label: 'Capital Utilization',
      value: capitalUtil,
      unit: '%',
      status: getStatus(capitalUtil, 0.70, 0.90),
      warning_threshold: 0.70,
      danger_threshold: 0.90,
    },
    {
      label: 'Leverage Ratio',
      value: leverageRatio,
      unit: 'ratio',
      status: getStatus(leverageRatio, settings.leverage_warning, settings.leverage_danger),
      warning_threshold: settings.leverage_warning,
      danger_threshold: settings.leverage_danger,
    },
    {
      label: 'Max Sector Exposure',
      value: maxSectorWeight,
      unit: '%',
      status: getStatus(maxSectorWeight, settings.sector_warning, settings.sector_danger),
      warning_threshold: settings.sector_warning,
      danger_threshold: settings.sector_danger,
    },
    {
      label: 'Max Stock Exposure',
      value: maxStockWeight,
      unit: '%',
      status: getStatus(maxStockWeight, settings.stock_warning, settings.stock_danger),
      warning_threshold: settings.stock_warning,
      danger_threshold: settings.stock_danger,
    },
    {
      label: 'Diversification',
      value: uniqueSectors,
      unit: 'sectors',
      status: uniqueSectors >= 4 ? 'safe' : uniqueSectors >= 2 ? 'warning' : 'danger',
      warning_threshold: 2,
      danger_threshold: 1,
    },
  ];
}

/**
 * Calculate trade costs (brokerage + CVT)
 */
export function calculateTradeCosts(
  grossValue: number,
  brokerageRate: number,
  cvtRate: number,
  tradeType: 'BUY' | 'SELL'
): { brokerage: number; cvt: number; netValue: number } {
  const brokerage = grossValue * brokerageRate;
  const cvt = grossValue * cvtRate;
  const netValue = tradeType === 'BUY'
    ? grossValue + brokerage + cvt
    : grossValue - brokerage - cvt;
  return { brokerage, cvt, netValue };
}
