// ============================================
// PSX Portfolio Tracker — Constants
// ============================================

export const PSX_SECTORS = [
  'Fertilizer',
  'Oil & Gas',
  'Technology',
  'Banking',
  'Cement',
  'Pharma',
  'Power & Energy',
  'Automobile',
  'Textile',
  'Insurance',
  'Food & Personal Care',
  'Chemical',
  'Sugar',
  'Paper & Board',
  'Glass & Ceramics',
  'Engineering',
  'Tobacco',
  'Transport',
  'Real Estate',
  'Miscellaneous',
  'Other',
] as const;

/**
 * PSX sector code to human-readable name + emoji mapping
 * Codes come from dps.psx.com.pk market-watch data
 */
export const PSX_SECTOR_MAP: Record<string, { name: string; emoji: string }> = {
  '0801': { name: 'Automobile Assembler', emoji: '\u{1F697}' },
  '0802': { name: 'Automobile Parts', emoji: '\u{1F527}' },
  '0803': { name: 'Cable & Electrical', emoji: '\u{1F50C}' },
  '0804': { name: 'Cement', emoji: '\u{1F3D7}' },
  '0805': { name: 'Chemical', emoji: '\u{2697}' },
  '0806': { name: 'Close-End Mutual Fund', emoji: '\u{1F4CA}' },
  '0807': { name: 'Commercial Banks', emoji: '\u{1F3E6}' },
  '0808': { name: 'Engineering', emoji: '\u{2699}' },
  '0809': { name: 'Fertilizer', emoji: '\u{1F331}' },
  '0810': { name: 'Food & Personal Care', emoji: '\u{1F6D2}' },
  '0811': { name: 'Glass & Ceramics', emoji: '\u{1FABE}' },
  '0812': { name: 'Insurance', emoji: '\u{1F6E1}' },
  '0813': { name: 'Inv. Banks / Securities', emoji: '\u{1F4BC}' },
  '0814': { name: 'Jute', emoji: '\u{1F9F6}' },
  '0815': { name: 'Leather & Tanneries', emoji: '\u{1F45E}' },
  '0816': { name: 'Miscellaneous', emoji: '\u{1F4E6}' },
  '0818': { name: 'Modaraba', emoji: '\u{1F4C8}' },
  '0819': { name: 'Leasing Companies', emoji: '\u{1F4CB}' },
  '0820': { name: 'Oil & Gas Exploration', emoji: '\u{26CF}' },
  '0821': { name: 'Oil & Gas Marketing', emoji: '\u{26FD}' },
  '0822': { name: 'Paper & Board', emoji: '\u{1F4C4}' },
  '0823': { name: 'Pharmaceuticals', emoji: '\u{1F48A}' },
  '0824': { name: 'Power Generation', emoji: '\u{26A1}' },
  '0825': { name: 'Refinery', emoji: '\u{1F3ED}' },
  '0826': { name: 'Open End Mutual Fund', emoji: '\u{1F4B9}' },
  '0827': { name: 'Synthetic & Rayon', emoji: '\u{1F9EA}' },
  '0828': { name: 'Technology & Communication', emoji: '\u{1F4BB}' },
  '0829': { name: 'Textile Composite', emoji: '\u{1F9F5}' },
  '0830': { name: 'Textile Spinning', emoji: '\u{1F9F6}' },
  '0831': { name: 'Textile Weaving', emoji: '\u{1FAA1}' },
  '0832': { name: 'Tobacco', emoji: '\u{1F6AC}' },
  '0833': { name: 'Transport', emoji: '\u{1F69A}' },
  '0834': { name: 'Vanaspati & Allied', emoji: '\u{1FAD2}' },
  '0835': { name: 'Woollen', emoji: '\u{1F9E3}' },
  '0836': { name: 'Real Estate (REIT)', emoji: '\u{1F3E2}' },
  '0837': { name: 'Exchange Traded Fund', emoji: '\u{1F4B9}' },
  '0838': { name: 'Real Estate', emoji: '\u{1F3E0}' },
};

/** Get human-readable sector name from PSX code */
export function getSectorDisplay(code: string): { name: string; emoji: string } {
  return PSX_SECTOR_MAP[code] || { name: code, emoji: '\u{1F4CC}' };
}

export const TRADE_TYPES = ['BUY', 'SELL'] as const;

export const DEFAULT_SETTINGS = {
  brokerage_rate: 0.0045,
  cvt_rate: 0.01,
  cgt_rate_under_1y: 0.15,
  cgt_rate_1_2y: 0.125,
  cgt_rate_2_3y: 0.10,
  cgt_rate_over_3y: 0.0,
  capital_available: 0,
  leverage_used: 0,
  sector_warning: 0.30,
  sector_danger: 0.40,
  stock_warning: 0.20,
  stock_danger: 0.25,
  leverage_warning: 0.70,
  leverage_danger: 1.0,
  broker_ledger_balance: 0,
  broker_available_cash: 0,
  broker_total_collaterals: 0,
  broker_net_worth: 0,
  broker_margin_eligible: 0,
  broker_expense_amount: 0,
  broker_sold_collaterals: 0,
  broker_account_pct: 0,
};

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Trades', href: '/trades', icon: 'ArrowLeftRight' },
  { label: 'Portfolio', href: '/portfolio', icon: 'Briefcase' },
  { label: 'Analysis', href: '/analysis', icon: 'BarChart3' },
  { label: 'Risk', href: '/risk', icon: 'Shield' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;

export const CHART_COLORS = [
  '#6C5CE7', // Purple
  '#00D2D3', // Teal
  '#FF6B6B', // Coral
  '#FECA57', // Yellow
  '#00B894', // Green
  '#E17055', // Orange
  '#74B9FF', // Light Blue
  '#A29BFE', // Lavender
  '#FD79A8', // Pink
  '#55EFC4', // Mint
] as const;
