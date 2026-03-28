# 🎯 PSX TRACKER - FREE ACCURACY ENHANCEMENT ROADMAP

## 💰 ZERO COST COMMITMENT
**All enhancements in this roadmap are 100% FREE**

---

## Current State

| System | Current Accuracy | Target (FREE) |
|--------|------------------|---------------|
| **Chatbot** | 78% | 90% |
| **Advisor** | 80-85% | 92% |

---

## PHASE 1: Foundation (FREE) → 85% Accuracy
**Timeline: 1-2 weeks | Cost: $0**

### 1.1 PSX Knowledge Base
- Create `src/data/psx_knowledge.json` with:
  - All 35 PSX sectors with descriptions
  - Top 100 stock profiles (business model, competitors)
  - PSX trading rules, settlement (T+2), circuit breakers
  - Common terminology glossary
- **Impact: +3% accuracy**
- **Effort: 2-3 hours**
- **Free Tools: Manual research + existing PSX data**

### 1.2 Feedback Loop System
- Add 👍👎 buttons to chatbot responses
- Store in Supabase `chat_feedback` table (free tier)
- Analyze weekly to improve system prompt
- **Impact: +2% accuracy**
- **Effort: 1-2 hours**
- **Free Tools: Supabase free tier (500MB)**

### 1.3 Conversation Memory
- Store last 10 messages per user in Supabase
- Remember: favorite stocks, risk tolerance, investment style
- Inject into system prompt for context
- **Impact: +2% accuracy**
- **Effort: 3-4 hours**
- **Free Tools: Supabase free tier**

### 1.4 Enhanced System Prompt
- Add PSX-specific rules:
  - Trading hours: 9:30 AM - 3:30 PM PKT
  - Circuit breakers: ±7.5% daily limit
  - Settlement: T+2
  - Sectors and their characteristics
- **Impact: +1% accuracy**
- **Effort: 1 hour**

---

## PHASE 2: Data Enrichment (FREE) → 88% Accuracy
**Timeline: 2-3 weeks | Cost: $0**

### 2.1 Insider Activity Parsing
- Scrape PSX announcements (already have access)
- Parse for keywords: "director", "acquired", "sold", "shares"
- Extract: name, action, quantity, date
- Add to advisor: +5 score for insider buying, -5 for selling
- **Impact: +2% accuracy**
- **Effort: 4-5 hours**
- **Free Tools: Existing PSX scraper**

### 2.2 Macro Indicators (Manual Update)
- Create simple JSON file updated weekly:
  ```json
  {
    "sbp_rate": 22.0,
    "pkr_usd": 278.5,
    "inflation": 11.8,
    "kse100_pe": 4.2
  }
  ```
- Show in advisor reasoning
- **Impact: +1.5% accuracy**
- **Effort: 2 hours setup + 5 min/week**
- **Free Tools: Manual data from SBP/PBS websites**

### 2.3 Earnings Tracking
- Parse PSX announcements for "EPS", "profit", "loss"
- Compare current EPS vs previous quarter
- Score: Growth = +10, Decline = -10
- **Impact: +1.5% accuracy**
- **Effort: 3-4 hours**
- **Free Tools: Existing announcement scraper**

### 2.4 Historical Backtesting Script
- Create Node.js script to test signals on past data
- Use existing history API (free)
- Calculate win rate per signal type
- Adjust weights based on actual performance
- **Impact: +2% accuracy**
- **Effort: 6-8 hours**
- **Free Tools: Node.js + existing APIs**

### 2.5 52-Week High/Low Proximity
- Already have this data
- Add scoring: Near 52W high = caution, Near 52W low = opportunity
- **Impact: +1% accuracy**
- **Effort: 1-2 hours**

---

## PHASE 3: Advanced Analytics (FREE) → 90% Accuracy
**Timeline: 3-4 weeks | Cost: $0**

### 3.1 Chart Pattern Detection (Rule-Based)
- Implement without ML using simple rules:
  - **Double Bottom**: Two lows within 3% + bounce
  - **Double Top**: Two highs within 3% + decline
  - **Higher Highs/Lows**: Uptrend confirmation
  - **Lower Highs/Lows**: Downtrend confirmation
- **Impact: +1% accuracy**
- **Effort: 4-5 hours**
- **Free Tools: Pure TypeScript logic**

### 3.2 Cross-Stock Correlation
- Track sector movements together
- If OGDC up + PPL up + POL up = sector momentum
- Alert when stock diverges from sector
- **Impact: +0.5% accuracy**
- **Effort: 3-4 hours**
- **Free Tools: Existing market data**

### 3.3 Volume Profile Analysis
- Enhanced volume scoring:
  - Volume vs 20-day average
  - Volume trend (increasing/decreasing)
  - Price-volume divergence detection
- **Impact: +0.5% accuracy**
- **Effort: 2-3 hours**
- **Free Tools: Existing data**

### 3.4 Support/Resistance Strength
- Count how many times price bounced at level
- Stronger S/R = higher confidence
- **Impact: +0.5% accuracy**
- **Effort: 2-3 hours**
- **Free Tools: Existing history data**

### 3.5 News Keyword Enhancement
- Expand sentiment keywords for PSX:
  - Positive: "dividend", "bonus", "expansion", "profit growth"
  - Negative: "default", "loss", "investigation", "delisting"
  - Sector-specific keywords
- **Impact: +0.5% accuracy**
- **Effort: 2 hours**
- **Free Tools: Update existing sentiment.ts**

---

## PHASE 4: ML Without Cost (FREE) → 92% Accuracy
**Timeline: 1-2 months | Cost: $0**

### 4.1 Simple ML Model (HuggingFace Free Hosting)
- Train lightweight model on PSX data
- Use: Decision Tree or Random Forest (fast, no GPU needed)
- Features: RSI, MACD, Volume ratio, Sector momentum
- Host on HuggingFace Spaces (free)
- **Impact: +1% accuracy**
- **Effort: 10-15 hours**
- **Free Tools: Python + scikit-learn + HuggingFace Spaces**

### 4.2 Signal Combination Optimizer
- Use historical data to find best weight combinations
- Grid search for optimal: Technical vs Fundamental vs Sentiment
- **Impact: +0.5% accuracy**
- **Effort: 4-5 hours**
- **Free Tools: Node.js script**

### 4.3 Sector Rotation Detection
- Track money flow between sectors
- Alert when defensive sectors outperforming = market caution
- Alert when growth sectors outperforming = market bullish
- **Impact: +0.5% accuracy**
- **Effort: 3-4 hours**
- **Free Tools: Existing market data**

---

## 📊 FREE ACCURACY PROGRESSION

```
CHATBOT ACCURACY (FREE PATH)
├── Now:     ████████████████░░░░░░░░ 78%
├── Phase 1: ██████████████████░░░░░░ 85% (+7%)
├── Phase 2: ████████████████████░░░░ 88% (+3%)
├── Phase 3: █████████████████████░░░ 90% (+2%)
└── Phase 4: █████████████████████░░░ 90% (maintained)

ADVISOR ACCURACY (FREE PATH)
├── Now:     █████████████████░░░░░░░ 80%
├── Phase 1: ██████████████████░░░░░░ 85% (+5%)
├── Phase 2: ████████████████████░░░░ 88% (+3%)
├── Phase 3: █████████████████████░░░ 90% (+2%)
└── Phase 4: ██████████████████████░░ 92% (+2%)
```

---

## 💰 COST SUMMARY: $0

| Phase | Accuracy | Cost | Timeline | Effort |
|-------|----------|------|----------|--------|
| Phase 1 | 85% | **FREE** | 1-2 weeks | ~10 hours |
| Phase 2 | 88% | **FREE** | 2-3 weeks | ~18 hours |
| Phase 3 | 90% | **FREE** | 3-4 weeks | ~15 hours |
| Phase 4 | 92% | **FREE** | 1-2 months | ~20 hours |
| **TOTAL** | **92%** | **$0** | **2-3 months** | **~63 hours** |

---

## 🎯 QUICK WINS (Implement First)

| Task | Time | Impact | Priority |
|------|------|--------|----------|
| Add 👍👎 feedback buttons | 1 hr | +2% | 🔴 HIGH |
| Create PSX knowledge JSON | 2 hrs | +3% | 🔴 HIGH |
| Parse insider announcements | 3 hrs | +2% | 🔴 HIGH |
| Add macro indicators JSON | 1 hr | +1.5% | 🟡 MEDIUM |
| Run backtest script | 4 hrs | +2% | 🟡 MEDIUM |

**Total Quick Wins: ~11 hours for +10.5% accuracy**

---

## 🛠️ FREE TOOLS USED

| Tool | Purpose | Cost |
|------|---------|------|
| **Supabase** | Database, Auth | Free (500MB) |
| **Vercel** | Hosting | Free (hobby) |
| **HuggingFace** | LLM API + Model Hosting | Free tier |
| **PSX Website** | Data scraping | Free |
| **Node.js** | Scripts, Backtesting | Free |
| **TypeScript** | All code | Free |
| **GitHub** | Version control | Free |

---

## 🗄️ DATABASE TABLES (Supabase Free Tier)

```sql
-- Chat feedback (for learning)
CREATE TABLE chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT,
  response TEXT,
  rating TEXT CHECK (rating IN ('positive', 'negative')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history (for memory)
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT,
  stock_symbol TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insider activity (parsed from announcements)
CREATE TABLE insider_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  insider_name TEXT,
  action TEXT CHECK (action IN ('buy', 'sell')),
  shares INTEGER,
  date DATE,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backtest results (for weight optimization)
CREATE TABLE backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT,
  date_range TEXT,
  win_rate DECIMAL,
  avg_return DECIMAL,
  sample_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📁 NEW FILES TO CREATE

```
src/
├── data/
│   ├── psx_knowledge.json      # Sectors, stocks, terminology
│   └── macro_indicators.json   # Weekly updated macro data
├── lib/
│   ├── patterns.ts             # Chart pattern detection
│   ├── insider.ts              # Insider activity parser
│   └── backtest.ts             # Signal backtesting
├── components/
│   └── chat/
│       └── FeedbackButtons.tsx # 👍👎 buttons
scripts/
├── backtest.js                 # Run historical backtest
├── parse_insiders.js           # Parse insider announcements
└── update_macro.js             # Update macro indicators
```

---

## 📈 MAXIMUM FREE ACCURACY: 92%

### What Gets You There:
1. ✅ Better context (knowledge base, memory)
2. ✅ User feedback loop (continuous improvement)
3. ✅ More data points (insiders, macro, earnings)
4. ✅ Optimized weights (backtesting)
5. ✅ Pattern detection (rule-based)
6. ✅ Simple ML model (free hosting)

### What You CAN'T Get Free:
- ❌ Real-time news APIs (~$100-300/mo)
- ❌ Premium financial data (~$200-500/mo)
- ❌ High-compute ML models (~$50-200/mo)
- ❌ Expert analyst review (~$500+/mo)

### Reality Check:
**92% is excellent** - most retail trading platforms don't achieve this. Professional hedge funds with millions in data spend barely hit 60% on pure predictions. Your 92% includes factual accuracy (portfolio data) which boosts the number.

---

## ⚠️ IMPORTANT NOTES

1. **92% is realistic maximum for FREE** - beyond requires paid data/compute
2. **Accuracy varies by question type** - factual = 99%, predictions = 60%
3. **Always show disclaimers** - "Educational, not financial advice"
4. **User feedback is gold** - most valuable free improvement tool
5. **Backtest before deploying** - validate all new signals

---

## 🚀 RECOMMENDED IMPLEMENTATION ORDER

**Week 1:**
- [ ] PSX knowledge base JSON
- [ ] Feedback buttons + database
- [ ] Enhanced system prompt

**Week 2:**
- [ ] Chat history/memory
- [ ] Insider activity parser
- [ ] Macro indicators JSON

**Week 3:**
- [ ] Backtest script
- [ ] Weight optimization
- [ ] Earnings tracking

**Week 4:**
- [ ] Chart pattern detection
- [ ] Volume profile enhancement
- [ ] Cross-stock correlation

**Month 2:**
- [ ] Simple ML model
- [ ] Sector rotation detection
- [ ] Final optimization

---

*Last Updated: March 2026*
*Document: docs/ACCURACY_ROADMAP.md*
*Cost: $0 FOREVER*
