import macroData from '@/data/macro_indicators.json';

export function getMacroIndicators() {
  return macroData.indicators;
}

export function getMarketOutlook() {
  return macroData.market_outlook;
}

export function getMacroContext(): string {
  const indicators = macroData.indicators;
  const outlook = macroData.market_outlook;
  const events = macroData.key_events;

  let context = 'MACROECONOMIC CONTEXT:';

  // Policy Rate
  context += `
- SBP Policy Rate: ${indicators.sbp_policy_rate.value}% (${indicators.sbp_policy_rate.trend})`;

  // Exchange Rate
  context += `
- PKR/USD Rate: PKR ${indicators.pkr_usd.value} (${indicators.pkr_usd.trend})`;

  // Inflation
  context += `
- Inflation (CPI): ${indicators.inflation_cpi.value}% (${indicators.inflation_cpi.trend})`;

  // Market Valuation
  context += `
- KSE-100 P/E Ratio: ${indicators.kse100_pe.value}x (${indicators.kse100_pe.trend}, historical avg: ${indicators.kse100_pe.historical_avg}x)`;

  // Foreign Investment
  context += `
- Foreign Investment: ${indicators.foreign_investment.value}M USD (${indicators.foreign_investment.trend} - ${indicators.foreign_investment.period})`;

  // Market Outlook
  context += `
- Market Outlook: ${outlook}`;

  // Key Events
  if (events.length > 0) {
    context += `
- Key Events: ${events.join(', ')}`;
  }

  context += `
- Last Updated: ${macroData.last_updated}`;

  return context;
}
