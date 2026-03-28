import { NextRequest, NextResponse } from 'next/server';

// Request types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StockAdvisory {
  label: string;
  confidence: number;
  reasoning: string[];
  suggestedAction: string;
  targetEntry: number | null;
  targetExit: number | null;
  stopLoss: number | null;
  riskLevel: string;
}

interface StockTechnicals {
  rsi: { value: number; signal: string } | null;
  macd: { tradeSignal: string } | null;
  compositeScore: number;
}

interface StockSentiment {
  label: string;
  score: number;
  headlines: string[];
}

interface StockTrend {
  overallLabel: string;
  volatility: number;
}

interface StockContext {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  ldcp: number;
  change: number;
  changePct: number;
  advisory?: StockAdvisory;
  technicals?: StockTechnicals;
  sentiment?: StockSentiment;
  trend?: StockTrend;
}

interface NewsArticle {
  title: string;
  source: string;
  pubDate: string;
  link?: string;
}

interface NewsContext {
  headlines: string[];
  source: string;
  articles?: NewsArticle[];
}

interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
}

interface Trade {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  rate: number;
  date: string;
}

interface RiskMetrics {
  stockConcentration: number;
  sectorConcentration: number;
  portfolioValue: number;
  totalInvested: number;
  unrealizedPnl: number;
  realizedPnl: number;
  topHolding?: { symbol: string; weight: number };
  topSector?: { name: string; weight: number };
}

interface UserSettings {
  brokerageRate?: number;
  cvtRate?: number;
  capitalGainsTax?: number;
  totalCapital?: number;
  usedCapital?: number;
  maxStockConcentration?: number;
  maxSectorConcentration?: number;
}

interface UserContext {
  portfolio?: PortfolioHolding[];
  recentTrades?: Trade[];
  risk?: RiskMetrics;
  watchlist?: string[];
  settings?: UserSettings;
}

interface ChatRequest {
  messages: ChatMessage[];
  stockContext?: StockContext;
  newsContext?: NewsContext;
  userContext?: UserContext;
}

// HuggingFace API response types
interface HFChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface HFResponse {
  choices: HFChoice[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface HFError {
  error: string;
}

function buildSystemPrompt(stockContext?: StockContext, newsContext?: NewsContext, userContext?: UserContext): string {
  let prompt = `You are a PSX (Pakistan Stock Exchange) investment analyst assistant.
You help users understand stock analysis, news sentiment, market trends, and provide personalized portfolio advice.`;

  // User's Portfolio Context
  if (userContext) {
    const { portfolio, recentTrades, risk, watchlist, settings } = userContext;

    if (settings) {
      prompt += `

USER'S TRADING SETTINGS:`;
      if (settings.totalCapital !== undefined) {
        prompt += `
- Total Capital: PKR ${settings.totalCapital.toLocaleString()}`;
      }
      if (settings.usedCapital !== undefined) {
        prompt += `
- Used Capital: PKR ${settings.usedCapital.toLocaleString()}`;
        if (settings.totalCapital) {
          const availableCapital = settings.totalCapital - settings.usedCapital;
          prompt += `
- Available Capital: PKR ${availableCapital.toLocaleString()}`;
        }
      }
      if (settings.brokerageRate !== undefined) {
        prompt += `
- Brokerage Rate: ${settings.brokerageRate}%`;
      }
      if (settings.cvtRate !== undefined) {
        prompt += `
- CVT Rate: ${settings.cvtRate}%`;
      }
      if (settings.capitalGainsTax !== undefined) {
        prompt += `
- Capital Gains Tax: ${settings.capitalGainsTax}%`;
      }
      if (settings.maxStockConcentration !== undefined) {
        prompt += `
- Max Stock Concentration Limit: ${settings.maxStockConcentration}%`;
      }
      if (settings.maxSectorConcentration !== undefined) {
        prompt += `
- Max Sector Concentration Limit: ${settings.maxSectorConcentration}%`;
      }
    }

    if (portfolio && portfolio.length > 0) {
      prompt += `

USER'S PORTFOLIO (${portfolio.length} holdings):`;
      portfolio.forEach((h, i) => {
        const pnlSign = h.pnl >= 0 ? '+' : '';
        prompt += `
${i + 1}. ${h.symbol} (${h.name}): ${h.quantity} shares @ PKR ${h.avgPrice.toFixed(2)} avg
   Current: PKR ${h.currentPrice.toFixed(2)} | P&L: ${pnlSign}PKR ${h.pnl.toFixed(2)} (${pnlSign}${h.pnlPct.toFixed(2)}%)`;
      });
    }

    if (risk) {
      prompt += `

USER'S RISK METRICS:
- Portfolio Value: PKR ${risk.portfolioValue.toLocaleString()}
- Total Invested: PKR ${risk.totalInvested.toLocaleString()}
- Unrealized P&L: PKR ${risk.unrealizedPnl.toLocaleString()}
- Realized P&L: PKR ${risk.realizedPnl.toLocaleString()}
- Stock Concentration: ${risk.stockConcentration.toFixed(1)}%
- Sector Concentration: ${risk.sectorConcentration.toFixed(1)}%`;
      if (risk.topHolding) {
        prompt += `
- Top Holding: ${risk.topHolding.symbol} (${risk.topHolding.weight.toFixed(1)}% of portfolio)`;
      }
      if (risk.topSector) {
        prompt += `
- Top Sector: ${risk.topSector.name} (${risk.topSector.weight.toFixed(1)}% of portfolio)`;
      }
    }

    if (recentTrades && recentTrades.length > 0) {
      prompt += `

USER'S RECENT TRADES (last ${recentTrades.length}):`;
      recentTrades.slice(0, 10).forEach((t, i) => {
        prompt += `
${i + 1}. ${t.date}: ${t.type} ${t.quantity} ${t.symbol} @ PKR ${t.rate.toFixed(2)}`;
      });
    }

    if (watchlist && watchlist.length > 0) {
      prompt += `

USER'S WATCHLIST: ${watchlist.join(', ')}`;
    }
  }

  if (stockContext) {
    const { symbol, name, sector, currentPrice, change, changePct, advisory, technicals, sentiment, trend } = stockContext;

    prompt += `

CURRENT STOCK ANALYSIS:
Symbol: ${symbol} | Name: ${name} | Sector: ${sector}
Price: PKR ${currentPrice.toLocaleString()} | Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`;

    if (advisory) {
      prompt += `
Advisory: ${advisory.label} (Confidence: ${advisory.confidence}%)
Risk Level: ${advisory.riskLevel}
Suggested Action: ${advisory.suggestedAction}`;
    }

    if (technicals) {
      prompt += `

TECHNICAL INDICATORS:`;
      if (technicals.rsi) {
        prompt += `
- RSI: ${technicals.rsi.value.toFixed(1)} (${technicals.rsi.signal})`;
      }
      if (technicals.macd) {
        prompt += `
- MACD: ${technicals.macd.tradeSignal}`;
      }
      prompt += `
- Overall Technical Score: ${technicals.compositeScore.toFixed(1)}/100`;
    }

    if (sentiment) {
      prompt += `

SENTIMENT ANALYSIS:
- Sentiment: ${sentiment.label} (Score: ${(sentiment.score * 100).toFixed(1)}%)`;
      if (sentiment.headlines.length > 0) {
        prompt += `
- Recent Headlines:
${sentiment.headlines.slice(0, 5).map(h => `  • ${h}`).join('\n')}`;
      }
    }

    if (trend) {
      prompt += `

TREND ANALYSIS:
- Trend: ${trend.overallLabel}
- Volatility: ${trend.volatility.toFixed(2)}%`;
    }

    if (advisory) {
      prompt += `

PRICE TARGETS:`;
      if (advisory.targetEntry !== null) {
        prompt += `
- Entry: PKR ${advisory.targetEntry.toLocaleString()}`;
      }
      if (advisory.targetExit !== null) {
        prompt += `
- Exit: PKR ${advisory.targetExit.toLocaleString()}`;
      }
      if (advisory.stopLoss !== null) {
        prompt += `
- Stop Loss: PKR ${advisory.stopLoss.toLocaleString()}`;
      }

      if (advisory.reasoning.length > 0) {
        prompt += `

REASONING:
${advisory.reasoning.map(r => `• ${r}`).join('\n')}`;
      }
    }
  }

  if (newsContext) {
    if (newsContext.articles && newsContext.articles.length > 0) {
      prompt += `

LATEST PAKISTAN BUSINESS NEWS:`;
      // Group by source
      const bySource: Record<string, NewsArticle[]> = {};
      newsContext.articles.forEach(a => {
        if (!bySource[a.source]) bySource[a.source] = [];
        bySource[a.source].push(a);
      });
      
      Object.entries(bySource).forEach(([source, articles]) => {
        prompt += `

${source.toUpperCase()} NEWS:`;
        articles.slice(0, 3).forEach(a => {
          prompt += `
• ${a.title} (${a.pubDate})`;
        });
      });
    } else if (newsContext.headlines && newsContext.headlines.length > 0) {
      prompt += `

MARKET NEWS (${newsContext.source}):
${newsContext.headlines.slice(0, 5).map(h => `• ${h}`).join('\n')}`;
    }
  }

  prompt += `

Guidelines:
- Be concise but thorough
- Explain technical terms when used
- Always remind this is educational, not financial advice
- Use Pakistani market context (PKR, PSX, KSE-100)
- Reference the user's portfolio, trades, and settings when answering personal questions
- Provide personalized advice based on user's risk thresholds and capital
- When asked about portfolio risk, analyze concentration and P&L
- Reference the news data when discussing market sentiment
- Keep responses focused and actionable`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const HF_TOKEN = process.env.HF_TOKEN;

    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: 'HuggingFace API token not configured' },
        { status: 500 }
      );
    }

    const body: ChatRequest = await request.json();
    const { messages, stockContext, newsContext, userContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build system prompt with all context
    const systemPrompt = buildSystemPrompt(stockContext, newsContext, userContext);

    // Prepare messages for HuggingFace API
    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system'), // Remove any existing system messages
    ];

    // Use HuggingFace router with Groq provider for fast inference
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct:groq',
        messages: apiMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as HFError;
      console.error('HuggingFace API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          error: errorData.error || `HuggingFace API error: ${response.status}`,
          status: response.status,
        },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data: HFResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content: data.choices[0].message.content,
      model: 'meta-llama/Llama-3.3-70B-Instruct',
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
