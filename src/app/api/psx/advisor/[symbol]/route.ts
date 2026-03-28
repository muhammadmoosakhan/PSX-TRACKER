import { NextRequest, NextResponse } from 'next/server';
import { analyzeTrend, computeVolatility } from '@/lib/trend';
import { batchSentiment, keywordSentiment } from '@/lib/sentiment';
import { computeAdvisory, computeTechnicalComposite } from '@/lib/advisor';
import { computeRSI, computeSTOCH, computeMACD, computeSMAs } from '@/lib/technicals';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  try {
    // Fetch history + market data + news in parallel
    const baseUrl = request.nextUrl.origin;

    const [historyRes, marketRes, newsRes] = await Promise.all([
      fetch(`${baseUrl}/api/psx/history/${upperSymbol}`),
      fetch(`${baseUrl}/api/psx/market`),
      fetch(`${baseUrl}/api/psx/news?source=all`),
    ]);

    // Parse history
    let historyData: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
    if (historyRes.ok) {
      const hJson = await historyRes.json();
      historyData = Array.isArray(hJson) ? hJson : hJson.data || hJson.history || [];
    }

    if (historyData.length < 15) {
      return NextResponse.json({ error: 'Insufficient historical data for analysis', symbol: upperSymbol }, { status: 400 });
    }

    // Parse market for current price
    let currentPrice = 0;
    let ldcp = 0;
    let stockName = upperSymbol;
    let sector = '';
    if (marketRes.ok) {
      const mJson = await marketRes.json();
      const stocks = mJson.stocks || mJson.data || mJson;
      if (Array.isArray(stocks)) {
        // Try exact match first, then XD suffix (ex-dividend), then other suffixes
        let stock = stocks.find((s: { symbol: string }) => s.symbol === upperSymbol);
        if (!stock) {
          // Try with XD suffix (ex-dividend)
          stock = stocks.find((s: { symbol: string }) => s.symbol === `${upperSymbol}XD`);
        }
        if (!stock) {
          // Try other common suffixes: NC (new certificate), XB (ex-bonus), XR (ex-rights)
          const suffixes = ['NC', 'XB', 'XR', 'WU'];
          for (const suffix of suffixes) {
            stock = stocks.find((s: { symbol: string }) => s.symbol === `${upperSymbol}${suffix}`);
            if (stock) break;
          }
        }
        if (stock) {
          currentPrice = stock.current_price || stock.current || 0;
          ldcp = stock.ldcp || 0;
          stockName = stock.name?.replace(/XD$|NC$|XB$|XR$|WU$/i, '').trim() || upperSymbol;
          sector = stock.sector || '';
        }
      }
    }
    if (currentPrice === 0 && historyData.length > 0) {
      currentPrice = historyData[historyData.length - 1].close;
    }

    // Parse news — filter headlines mentioning this stock/sector
    let relevantHeadlines: string[] = [];
    let newsSourceType: 'stock-specific' | 'sector-related' | 'general-market' = 'general-market';
    if (newsRes.ok) {
      const nJson = await newsRes.json();
      const articles = nJson.articles || [];
      const stockTerms = [upperSymbol.toLowerCase(), stockName.toLowerCase()].filter(Boolean);
      const sectorTerms = sector ? [sector.toLowerCase()] : [];
      
      // First try stock-specific news
      const stockNews = articles
        .filter((a: { title: string; description: string }) => {
          const text = `${a.title} ${a.description}`.toLowerCase();
          return stockTerms.some((t) => t.length > 2 && text.includes(t));
        })
        .map((a: { title: string }) => a.title)
        .slice(0, 15);
      
      if (stockNews.length >= 3) {
        relevantHeadlines = stockNews;
        newsSourceType = 'stock-specific';
      } else {
        // Try sector-related news
        const sectorNews = articles
          .filter((a: { title: string; description: string }) => {
            const text = `${a.title} ${a.description}`.toLowerCase();
            return sectorTerms.some((t) => t.length > 2 && text.includes(t));
          })
          .map((a: { title: string }) => a.title)
          .slice(0, 10);
        
        if (sectorNews.length >= 3) {
          relevantHeadlines = sectorNews;
          newsSourceType = 'sector-related';
        } else {
          // Fall back to general market news
          relevantHeadlines = articles
            .slice(0, 10)
            .map((a: { title: string }) => a.title);
          newsSourceType = 'general-market';
        }
      }
    }

    let closes = historyData.map((d) => d.close);
    let highs = historyData.map((d) => d.high);
    let lows = historyData.map((d) => d.low);

    // Data quality check: if last history close differs from current price by >20%,
    // history may be stale or stock had a split. Adjust history to align with current price.
    const lastHistoryClose = closes[closes.length - 1];
    let dataWarning = '';
    if (currentPrice > 0 && lastHistoryClose > 0) {
      const drift = Math.abs(currentPrice - lastHistoryClose) / lastHistoryClose;
      if (drift > 0.20) {
        // Likely stock split or very stale data — scale history to match current price
        const scaleFactor = currentPrice / lastHistoryClose;
        closes = closes.map((c) => c * scaleFactor);
        highs = highs.map((h) => h * scaleFactor);
        lows = lows.map((l) => l * scaleFactor);
        dataWarning = `Historical data adjusted (${(drift * 100).toFixed(0)}% drift detected — possible split or stale data)`;
      }
    }

    // 1. Technical Analysis
    const rsi = computeRSI(closes);
    const stoch = computeSTOCH(highs, lows, closes);
    const macd = computeMACD(closes);
    const smas = computeSMAs(closes, currentPrice);

    const technicalScore = computeTechnicalComposite({
      rsiValue: rsi?.value,
      rsiSignal: rsi?.signal,
      stochK: stoch?.k,
      stochSignal: stoch?.signal,
      macdSignal: macd?.tradeSignal,
      smaSignals: smas,
    });

    // 2. Sentiment Analysis
    const sentimentResult = relevantHeadlines.length > 0
      ? await batchSentiment(relevantHeadlines).then((r) => r.average)
      : keywordSentiment('market stable');

    // 3. Trend Analysis
    const trendAnalysis = analyzeTrend(closes, highs, lows);

    // 4. Volatility — use ORIGINAL unscaled data for accurate ATR
    const origCloses = historyData.map((d) => d.close);
    const origHighs = historyData.map((d) => d.high);
    const origLows = historyData.map((d) => d.low);
    const volatilityPct = computeVolatility(origHighs, origLows, origCloses);

    // 5. Sanity-check predictions — clamp to ±10% of current price
    const clampPrediction = (pred: number) => {
      if (currentPrice <= 0) return pred;
      const maxMove = currentPrice * 0.10;
      return parseFloat(Math.max(currentPrice - maxMove, Math.min(currentPrice + maxMove, pred)).toFixed(2));
    };
    trendAnalysis.shortTerm.predictedNext = clampPrediction(trendAnalysis.shortTerm.predictedNext);
    trendAnalysis.shortTerm.confidenceLow = clampPrediction(trendAnalysis.shortTerm.confidenceLow);
    trendAnalysis.shortTerm.confidenceHigh = clampPrediction(trendAnalysis.shortTerm.confidenceHigh);
    trendAnalysis.mediumTerm.predictedNext = clampPrediction(trendAnalysis.mediumTerm.predictedNext);
    trendAnalysis.mediumTerm.confidenceLow = clampPrediction(trendAnalysis.mediumTerm.confidenceLow);
    trendAnalysis.mediumTerm.confidenceHigh = clampPrediction(trendAnalysis.mediumTerm.confidenceHigh);
    trendAnalysis.longTerm.predictedNext = clampPrediction(trendAnalysis.longTerm.predictedNext);
    trendAnalysis.longTerm.confidenceLow = clampPrediction(trendAnalysis.longTerm.confidenceLow);
    trendAnalysis.longTerm.confidenceHigh = clampPrediction(trendAnalysis.longTerm.confidenceHigh);

    // 6. Composite Advisory
    const advisory = computeAdvisory({
      technicalScore,
      sentimentResult,
      trendAnalysis,
      currentPrice,
      volatilityPct,
    });

    // Add stock-specific reasoning
    const priceChange = ldcp > 0 ? ((currentPrice - ldcp) / ldcp) * 100 : 0;
    const priceChangeStr = priceChange >= 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;
    advisory.reasoning.unshift(`${upperSymbol} @ PKR ${currentPrice.toFixed(2)} (${priceChangeStr} today)`);

    // Add technical indicator values
    if (rsi) {
      advisory.reasoning.push(`RSI: ${rsi.value.toFixed(1)} (${rsi.signal})`);
    }
    if (macd) {
      const macdDir = macd.histogram > 0 ? 'above' : 'below';
      advisory.reasoning.push(`MACD histogram ${macdDir} zero (${macd.tradeSignal})`);
    }

    // Add volume analysis if available
    const recentVolumes = historyData.slice(-10).map(d => d.volume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const latestVolume = historyData[historyData.length - 1]?.volume || 0;
    if (avgVolume > 0 && latestVolume > 0) {
      const volRatio = latestVolume / avgVolume;
      if (volRatio > 1.5) {
        advisory.reasoning.push(`Volume ${(volRatio).toFixed(1)}x above 10-day average — high activity`);
      } else if (volRatio < 0.5) {
        advisory.reasoning.push(`Volume ${(volRatio).toFixed(1)}x below average — low liquidity`);
      }
    }

    // Add sector context if available
    if (sector) {
      advisory.reasoning.push(`Sector: ${sector}`);
    }

    // Add news source context
    if (newsSourceType === 'general-market') {
      advisory.reasoning.push(`News: General market sentiment (no ${upperSymbol}-specific news found)`);
    } else if (newsSourceType === 'sector-related') {
      advisory.reasoning.push(`News: ${sector} sector sentiment`);
    } else {
      advisory.reasoning.push(`News: ${upperSymbol}-specific headlines analyzed`);
    }

    // Add data warning to reasoning if present
    if (dataWarning) {
      advisory.reasoning.push(dataWarning);
    }

    // Use short-term prediction for next-day (most relevant timeframe)
    const bestPrediction = trendAnalysis.shortTerm.r2 > trendAnalysis.mediumTerm.r2
      ? trendAnalysis.shortTerm
      : trendAnalysis.mediumTerm;

    return NextResponse.json({
      symbol: upperSymbol,
      name: stockName,
      sector,
      currentPrice,
      ldcp,
      advisory,
      technicals: {
        rsi: rsi ? { value: rsi.value, signal: rsi.signal } : null,
        stochastic: stoch ? { k: stoch.k, d: stoch.d, signal: stoch.signal } : null,
        macd: macd ? { macd: macd.macd, signal: macd.signal, histogram: macd.histogram, tradeSignal: macd.tradeSignal } : null,
        smaSignals: smas,
        compositeScore: parseFloat(technicalScore.toFixed(3)),
      },
      sentiment: {
        score: sentimentResult.score,
        label: sentimentResult.label,
        confidence: sentimentResult.confidence,
        method: sentimentResult.method,
        headlines: relevantHeadlines.slice(0, 5),
        positiveHits: sentimentResult.positiveHits,
        negativeHits: sentimentResult.negativeHits,
        newsSourceType,
      },
      trend: {
        shortTerm: trendAnalysis.shortTerm,
        mediumTerm: trendAnalysis.mediumTerm,
        longTerm: trendAnalysis.longTerm,
        crossover: trendAnalysis.crossover,
        volatility: volatilityPct,
        overallLabel: trendAnalysis.overallLabel,
        supportResistance: trendAnalysis.supportResistance,
        prediction: {
          nextDay: bestPrediction.predictedNext,
          confidenceLow: bestPrediction.confidenceLow,
          confidenceHigh: bestPrediction.confidenceHigh,
          r2: bestPrediction.r2,
        },
      },
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600',
        'Vary': 'x-symbol',
      },
    });
  } catch (err) {
    console.error('Advisor error:', err);
    return NextResponse.json({ error: 'Failed to generate advisory', symbol: upperSymbol }, { status: 500 });
  }
}
