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
      const stock = Array.isArray(stocks) ? stocks.find((s: { symbol: string }) => s.symbol === upperSymbol) : null;
      if (stock) {
        currentPrice = stock.current_price || stock.current || 0;
        ldcp = stock.ldcp || 0;
        stockName = stock.name || upperSymbol;
        sector = stock.sector || '';
      }
    }
    if (currentPrice === 0 && historyData.length > 0) {
      currentPrice = historyData[historyData.length - 1].close;
    }

    // Parse news — filter headlines mentioning this stock/sector
    let relevantHeadlines: string[] = [];
    if (newsRes.ok) {
      const nJson = await newsRes.json();
      const articles = nJson.articles || [];
      const searchTerms = [upperSymbol.toLowerCase(), stockName.toLowerCase(), sector.toLowerCase()].filter(Boolean);
      relevantHeadlines = articles
        .filter((a: { title: string; description: string }) => {
          const text = `${a.title} ${a.description}`.toLowerCase();
          return searchTerms.some((t) => t.length > 2 && text.includes(t));
        })
        .map((a: { title: string }) => a.title)
        .slice(0, 15);

      // If no stock-specific news, use general market news
      if (relevantHeadlines.length < 3) {
        relevantHeadlines = articles
          .slice(0, 10)
          .map((a: { title: string }) => a.title);
      }
    }

    const closes = historyData.map((d) => d.close);
    const highs = historyData.map((d) => d.high);
    const lows = historyData.map((d) => d.low);

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

    // 4. Volatility
    const volatilityPct = computeVolatility(highs, lows, closes);

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
          nextDay: trendAnalysis.mediumTerm.predictedNext,
          confidenceLow: trendAnalysis.mediumTerm.confidenceLow,
          confidenceHigh: trendAnalysis.mediumTerm.confidenceHigh,
        },
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
    });
  } catch (err) {
    console.error('Advisor error:', err);
    return NextResponse.json({ error: 'Failed to generate advisory', symbol: upperSymbol }, { status: 500 });
  }
}
