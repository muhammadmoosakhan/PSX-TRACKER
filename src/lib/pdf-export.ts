// ============================================
// PSX Portfolio Tracker — PDF Report Generator
// Uses jsPDF + jspdf-autotable
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PortfolioHolding, SectorAllocation, Trade } from '@/types';
import { formatPKR, formatPercent, formatDate } from './formatters';

/**
 * Generate portfolio summary PDF report
 */
export function generatePortfolioReport(
  holdings: PortfolioHolding[],
  sectors: SectorAllocation[],
  trades: Trade[],
  summary: { totalValue: number; totalInvested: number; totalPL: number; totalPLPct: number }
) {
  const doc = new jsPDF();
  const now = new Date();

  // --- Page 1: Summary ---
  doc.setFontSize(20);
  doc.setTextColor(108, 92, 231);
  doc.text('PSX Portfolio Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 28);

  // KPIs
  doc.setFontSize(12);
  doc.setTextColor(26, 29, 46);
  const kpis = [
    ['Portfolio Value', formatPKR(summary.totalValue, 0)],
    ['Total Invested', formatPKR(summary.totalInvested, 0)],
    ['Unrealized P&L', formatPKR(summary.totalPL, 0)],
    ['Return', formatPercent(summary.totalPLPct)],
    ['Holdings', String(holdings.length)],
    ['Total Trades', String(trades.length)],
  ];

  autoTable(doc, {
    startY: 35,
    head: [['Metric', 'Value']],
    body: kpis,
    theme: 'grid',
    headStyles: { fillColor: [108, 92, 231] },
    styles: { fontSize: 10 },
  });

  // Sector Allocation
  if (sectors.length > 0) {
    const sectorY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 80;
    doc.setFontSize(14);
    doc.setTextColor(108, 92, 231);
    doc.text('Sector Allocation', 14, sectorY + 10);

    autoTable(doc, {
      startY: sectorY + 15,
      head: [['Sector', 'Stocks', 'Invested', 'Current', 'P&L', 'Weight']],
      body: sectors.map((s) => [
        s.sector,
        String(s.stock_count),
        formatPKR(s.total_invested, 0),
        formatPKR(s.current_value, 0),
        formatPKR(s.pl, 0),
        `${(s.weight_pct * 100).toFixed(1)}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [108, 92, 231] },
      styles: { fontSize: 9 },
    });
  }

  // --- Page 2: Holdings ---
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(108, 92, 231);
  doc.text('Current Holdings', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Symbol', 'Qty', 'Avg Buy', 'Current', 'Cost', 'Value', 'P&L', 'P&L %']],
    body: holdings.map((h) => [
      h.symbol,
      String(h.quantity_held),
      formatPKR(h.avg_buy_price, 2),
      formatPKR(h.current_price, 2),
      formatPKR(h.cost_basis, 0),
      formatPKR(h.market_value, 0),
      formatPKR(h.unrealized_pl, 0),
      formatPercent(h.unrealized_pl_pct),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [108, 92, 231] },
    styles: { fontSize: 8 },
  });

  // --- Page 3: Recent Trades ---
  if (trades.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(108, 92, 231);
    doc.text('Trade History', 14, 20);

    const recentTrades = trades.slice(0, 50); // Last 50 trades
    autoTable(doc, {
      startY: 25,
      head: [['Date', 'Symbol', 'Type', 'Qty', 'Rate', 'Net Value']],
      body: recentTrades.map((t) => [
        formatDate(t.trade_date),
        t.symbol,
        t.trade_type,
        String(t.quantity),
        formatPKR(t.rate_per_share, 2),
        formatPKR(t.net_value, 0),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [108, 92, 231] },
      styles: { fontSize: 8 },
    });
  }

  // Save
  doc.save(`PSX_Portfolio_Report_${now.toISOString().split('T')[0]}.pdf`);
}

/**
 * Export trades as CSV
 */
export function exportTradesCSV(trades: Trade[]) {
  const headers = ['Date', 'Symbol', 'Name', 'Sector', 'Type', 'Quantity', 'Rate', 'Gross Value', 'Brokerage', 'CVT', 'Net Value', 'Notes'];
  const rows = trades.map((t) => [
    t.trade_date,
    t.symbol,
    t.stock_name,
    t.sector,
    t.trade_type,
    String(t.quantity),
    String(t.rate_per_share),
    String(t.gross_value),
    String(t.brokerage),
    String(t.cvt),
    String(t.net_value),
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PSX_Trades_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
