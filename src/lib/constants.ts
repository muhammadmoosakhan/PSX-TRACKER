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
