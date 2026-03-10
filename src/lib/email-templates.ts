// ============================================
// PSX Portfolio Tracker — HTML Email Templates
// Dark-themed inline-CSS emails for notifications
// ============================================

import type { PSXIndex, StockCache } from '@/types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const APP_URL = 'https://psx-tracker.vercel.app';

function fmt(n: number): string {
  return n.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function colorFor(value: number): string {
  return value >= 0 ? '#00B894' : '#FF5252';
}

function signPrefix(value: number): string {
  return value >= 0 ? '+' : '';
}

function wrapLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f0f23;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f23;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a2e;border-radius:12px;overflow:hidden;">
          ${content}
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:16px 24px;text-align:center;color:#666;font-size:12px;">
              <a href="${APP_URL}" style="color:#888;text-decoration:none;">PSX Portfolio Tracker</a> &mdash; ${APP_URL}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function tableHeader(columns: string[]): string {
  const cells = columns
    .map(
      (col) =>
        `<th style="padding:10px 12px;text-align:left;font-size:13px;color:#aaa;border-bottom:1px solid #2a2a4a;font-weight:600;">${col}</th>`
    )
    .join('');
  return `<tr>${cells}</tr>`;
}

// ---------------------------------------------------------------------------
// 1. Market Open Email
// ---------------------------------------------------------------------------

export function marketOpenEmailHTML(date: string): string {
  const body = `
    <tr>
      <td style="padding:32px 24px 16px;text-align:center;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(0,184,148,0.15);line-height:64px;font-size:28px;margin-bottom:12px;">&#x1F7E2;</div>
        <h1 style="margin:0 0 8px;color:#00B894;font-size:24px;font-weight:700;">PSX Market is Open</h1>
        <p style="margin:0;color:#ccc;font-size:15px;line-height:1.6;">
          Pakistan Stock Exchange opened for trading on <strong style="color:#fff;">${date}</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#16213e;border-radius:8px;">
          <tr>
            <td style="padding:16px 24px;color:#aaa;font-size:14px;">
              Trading Hours: <strong style="color:#fff;">9:30 AM &ndash; 3:30 PM PKT</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return wrapLayout(body);
}

// ---------------------------------------------------------------------------
// 2. Market Close Email
// ---------------------------------------------------------------------------

export function marketCloseEmailHTML(data: {
  date: string;
  indices: PSXIndex[];
}): string {
  const indexRows = data.indices
    .map((idx) => {
      const color = colorFor(idx.change);
      return `
        <tr>
          <td style="padding:10px 12px;color:#fff;font-size:13px;border-bottom:1px solid #2a2a4a;">${idx.name}</td>
          <td style="padding:10px 12px;color:#fff;font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${fmt(idx.current)}</td>
          <td style="padding:10px 12px;color:${color};font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${signPrefix(idx.change)}${fmt(idx.change)}</td>
          <td style="padding:10px 12px;color:${color};font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${signPrefix(idx.change_pct)}${fmt(idx.change_pct)}%</td>
        </tr>`;
    })
    .join('');

  const body = `
    <tr>
      <td style="padding:32px 24px 16px;text-align:center;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(255,82,82,0.15);line-height:64px;font-size:28px;margin-bottom:12px;">&#x1F534;</div>
        <h1 style="margin:0 0 8px;color:#FF5252;font-size:24px;font-weight:700;">PSX Market Closed</h1>
        <p style="margin:0;color:#ccc;font-size:15px;">Trading session ended for <strong style="color:#fff;">${data.date}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:16px 16px 8px;">
              <h2 style="margin:0 0 12px;color:#fff;font-size:16px;font-weight:600;">Index Summary</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${tableHeader(['Index', 'Current', 'Change', 'Change %'])}
                ${indexRows}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return wrapLayout(body);
}

// ---------------------------------------------------------------------------
// 3. Daily Report Email
// ---------------------------------------------------------------------------

interface DailyReportData {
  date: string;
  portfolioValue: number;
  portfolioPL: number;
  portfolioPLPct: number;
  holdingsCount: number;
  topGainers: StockCache[];
  topLosers: StockCache[];
  indices: PSXIndex[];
}

function kpiCard(label: string, value: string, color?: string): string {
  const valColor = color || '#fff';
  return `
    <td style="padding:12px;width:50%;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:8px;">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${label}</div>
            <div style="font-size:20px;font-weight:700;color:${valColor};">${value}</div>
          </td>
        </tr>
      </table>
    </td>`;
}

function stockMoversTable(
  title: string,
  stocks: StockCache[],
  isGainer: boolean
): string {
  if (stocks.length === 0) return '';

  const color = isGainer ? '#00B894' : '#FF5252';
  const rows = stocks
    .slice(0, 5)
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;color:#fff;font-size:13px;border-bottom:1px solid #2a2a4a;font-weight:600;">${s.symbol}</td>
        <td style="padding:8px 12px;color:#ccc;font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${fmt(s.current_price)}</td>
        <td style="padding:8px 12px;color:${color};font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${signPrefix(s.change_pct)}${fmt(s.change_pct)}%</td>
      </tr>`
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr>
        <td style="padding:14px 16px 8px;">
          <h3 style="margin:0;color:${color};font-size:14px;font-weight:600;">${title}</h3>
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${tableHeader(['Symbol', 'Price', 'Change %'])}
            ${rows}
          </table>
        </td>
      </tr>
    </table>`;
}

export function dailyReportEmailHTML(data: DailyReportData): string {
  const plColor = colorFor(data.portfolioPL);

  // Portfolio Summary KPIs
  const portfolioSection = `
    <tr>
      <td style="padding:8px 24px 0;">
        <h2 style="margin:0 0 12px;color:#fff;font-size:16px;font-weight:600;">Portfolio Summary</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border-radius:8px;overflow:hidden;">
          <tr>
            ${kpiCard('Total Value', `PKR ${fmt(data.portfolioValue)}`)}
            ${kpiCard('P&L', `${signPrefix(data.portfolioPL)}PKR ${fmt(Math.abs(data.portfolioPL))}`, plColor)}
          </tr>
          <tr>
            ${kpiCard('P&L %', `${signPrefix(data.portfolioPLPct)}${fmt(Math.abs(data.portfolioPLPct))}%`, plColor)}
            ${kpiCard('Holdings', String(data.holdingsCount))}
          </tr>
        </table>
      </td>
    </tr>`;

  // Top Movers Section
  const moversSection = `
    <tr>
      <td style="padding:20px 24px 0;">
        <h2 style="margin:0 0 12px;color:#fff;font-size:16px;font-weight:600;">Market Top Movers</h2>
        ${stockMoversTable('Top 5 Gainers', data.topGainers, true)}
        ${stockMoversTable('Top 5 Losers', data.topLosers, false)}
      </td>
    </tr>`;

  // Index Summary Section
  const indexRows = data.indices
    .map((idx) => {
      const color = colorFor(idx.change);
      return `
        <tr>
          <td style="padding:10px 12px;color:#fff;font-size:13px;border-bottom:1px solid #2a2a4a;">${idx.name}</td>
          <td style="padding:10px 12px;color:#fff;font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${fmt(idx.current)}</td>
          <td style="padding:10px 12px;color:${color};font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${signPrefix(idx.change)}${fmt(idx.change)}</td>
          <td style="padding:10px 12px;color:${color};font-size:13px;border-bottom:1px solid #2a2a4a;text-align:right;">${signPrefix(idx.change_pct)}${fmt(idx.change_pct)}%</td>
        </tr>`;
    })
    .join('');

  const indexSection = `
    <tr>
      <td style="padding:20px 24px 32px;">
        <h2 style="margin:0 0 12px;color:#fff;font-size:16px;font-weight:600;">Index Summary</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16213e;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:12px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${tableHeader(['Index', 'Current', 'Change', 'Change %'])}
                ${indexRows}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const body = `
    <tr>
      <td style="padding:32px 24px 16px;text-align:center;">
        <h1 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:700;">Daily Market Report</h1>
        <p style="margin:0;color:#aaa;font-size:14px;">${data.date}</p>
      </td>
    </tr>
    ${portfolioSection}
    ${moversSection}
    ${indexSection}`;

  return wrapLayout(body);
}
