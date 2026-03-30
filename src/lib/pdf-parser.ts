// PDF Parser for Munir Khanani Broker Statements
// Extracts trades with all fee breakdowns

export interface ParsedTrade {
  trade_date: string;
  settlement_date: string;
  symbol: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  rate_per_share: number;
  gross_value: number;
  commission: number;
  sst: number;
  cdc_fee: number;
  cvt: number;
  laga: number;
  secp: number;
  ncs: number;
  others: number;
  net_value: number;
  fee_source: 'pdf' | 'manual';
}

export interface ParseResult {
  success: boolean;
  trades: ParsedTrade[];
  client_name?: string;
  cdc_id?: string;
  statement_id?: string;
  error?: string;
}

// Parse date from DD-MM-YYYY format
function parseDate(dateStr: string): string {
  const match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

// Parse number from string (handles commas)
function parseNumber(str: string): number {
  if (!str || str.trim() === '') return 0;
  return parseFloat(str.replace(/,/g, '').trim()) || 0;
}

// Extract stock symbol from line (last word in caps)
function extractSymbol(line: string): string | null {
  const words = line.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  // Symbol is usually 2-6 uppercase letters
  if (/^[A-Z]{2,10}$/.test(lastWord)) {
    return lastWord;
  }
  return null;
}

// Main parser function
export function parseMunirKhananiStatement(text: string): ParseResult {
  try {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const trades: ParsedTrade[] = [];
    
    let tradeDate = '';
    let settlementDate = '';
    let clientName = '';
    let cdcId = '';
    let statementId = '';
    let currentStock = '';
    let currentStockName = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Extract trade date: "Date :27-03-2026"
      const dateMatch = line.match(/Date\s*:\s*(\d{2}-\d{2}-\d{4})/i);
      if (dateMatch) {
        tradeDate = parseDate(dateMatch[1]);
      }
      
      // Extract settlement date: "Settlement : 30-03-2026"
      const settlementMatch = line.match(/Settlement\s*:\s*(\d{2}-\d{2}-\d{4})/i);
      if (settlementMatch) {
        settlementDate = parseDate(settlementMatch[1]);
      }
      
      // Extract client info: "SR8683 MUHAMMAD MOOSA KHAN CDC ID :559305"
      const clientMatch = line.match(/^(SR\d+)\s+(.+?)\s+CDC\s+ID\s*:\s*(\d+)/i);
      if (clientMatch) {
        statementId = clientMatch[1];
        clientName = clientMatch[2].trim();
        cdcId = clientMatch[3];
        continue;
      }
      
      // Detect stock name line (ends with symbol like "HUBC" or "OGDC")
      // Must have at least 2 words (company name + symbol) and not be header/metadata
      const symbol = extractSymbol(line);
      const wordCount = line.trim().split(/\s+/).length;
      if (symbol && wordCount >= 3 && !line.includes('T+1REG') && !line.includes('T+2REG') && !line.startsWith('Avg')
          && !line.includes('Office') && !line.includes('TREC') && !line.includes('Trade:') && !line.includes('BLDG')) {
        currentStock = symbol;
        currentStockName = line.replace(symbol, '').trim();
        continue;
      }
      
      // Parse trade line: "T+1REG B BUY 7 198.00 0.2970 0.31 2.50 0.00 0.00 0.06 0.01 0.04 1,391.00"
      // Format: Settlement Type Qty Rate Comm SST CDC CVT Others LAGA SECP NCS Amount
      const tradeMatch = line.match(/T\+\d+REG\s+([BS])\s+(BUY|SELL)\s+([\d,]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,.]+)/i);
      
      if (tradeMatch && currentStock) {
        const [, typeCode, typeWord, qty, rate, comm, sst, cdc, cvt, others, laga, secp, ncs, amount] = tradeMatch;
        
        const quantity = parseNumber(qty);
        const ratePerShare = parseNumber(rate);
        const grossValue = quantity * ratePerShare;
        
        const trade: ParsedTrade = {
          trade_date: tradeDate || new Date().toISOString().split('T')[0],
          settlement_date: settlementDate || tradeDate,
          symbol: currentStock,
          stock_name: currentStockName || currentStock,
          trade_type: typeWord.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
          quantity,
          rate_per_share: ratePerShare,
          gross_value: grossValue,
          commission: parseNumber(comm),
          sst: parseNumber(sst),
          cdc_fee: parseNumber(cdc),
          cvt: parseNumber(cvt),
          laga: parseNumber(laga),
          secp: parseNumber(secp),
          ncs: parseNumber(ncs),
          others: parseNumber(others),
          net_value: parseNumber(amount),
          fee_source: 'pdf',
        };
        
        trades.push(trade);
      }
    }
    
    // Consolidate trades by symbol (combine multiple executions)
    const consolidated = consolidateTrades(trades);
    
    return {
      success: true,
      trades: consolidated,
      client_name: clientName,
      cdc_id: cdcId,
      statement_id: statementId,
    };
  } catch (error) {
    return {
      success: false,
      trades: [],
      error: error instanceof Error ? error.message : 'Failed to parse PDF',
    };
  }
}

// Consolidate multiple executions of same stock into single trade
function consolidateTrades(trades: ParsedTrade[]): ParsedTrade[] {
  const grouped = new Map<string, ParsedTrade[]>();
  
  for (const trade of trades) {
    const key = `${trade.symbol}-${trade.trade_type}-${trade.trade_date}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(trade);
  }
  
  const consolidated: ParsedTrade[] = [];
  
  for (const [, group] of grouped) {
    if (group.length === 1) {
      consolidated.push(group[0]);
    } else {
      // Combine multiple executions
      const first = group[0];
      const totalQty = group.reduce((sum, t) => sum + t.quantity, 0);
      const totalGross = group.reduce((sum, t) => sum + t.gross_value, 0);
      const avgRate = totalGross / totalQty;
      
      consolidated.push({
        ...first,
        quantity: totalQty,
        rate_per_share: Math.round(avgRate * 100) / 100,
        gross_value: totalGross,
        commission: group.reduce((sum, t) => sum + t.commission, 0),
        sst: group.reduce((sum, t) => sum + t.sst, 0),
        cdc_fee: group.reduce((sum, t) => sum + t.cdc_fee, 0),
        cvt: group.reduce((sum, t) => sum + t.cvt, 0),
        laga: group.reduce((sum, t) => sum + t.laga, 0),
        secp: group.reduce((sum, t) => sum + t.secp, 0),
        ncs: group.reduce((sum, t) => sum + t.ncs, 0),
        others: group.reduce((sum, t) => sum + t.others, 0),
        net_value: group.reduce((sum, t) => sum + t.net_value, 0),
      });
    }
  }
  
  return consolidated;
}
