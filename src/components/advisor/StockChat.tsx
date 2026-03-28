'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, X, SendHorizontal, Sparkles, TrendingUp, AlertTriangle, Newspaper, Briefcase, Settings, PieChart } from 'lucide-react';

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

interface NewsArticle {
  title: string;
  source: string;
  pubDate: string;
}

interface UserContext {
  portfolio?: PortfolioHolding[];
  recentTrades?: Trade[];
  risk?: RiskMetrics;
  watchlist?: string[];
  settings?: UserSettings;
}

interface NewsContext {
  headlines: string[];
  source: string;
  articles?: NewsArticle[];
}

interface StockChatProps {
  stockContext: {
    symbol: string;
    name: string;
    sector: string;
    currentPrice: number;
    ldcp: number;
    advisory?: {
      label?: string;
      score?: number;
      confidence?: number;
      reasoning?: string[];
      suggestedAction?: string;
      targetEntry?: number | null;
      targetExit?: number | null;
      stopLoss?: number | null;
      riskLevel?: string;
    };
    technicals?: {
      rsi?: { value: number; signal: string } | null;
      macd?: { tradeSignal: string } | null;
      compositeScore?: number;
    };
    sentiment?: {
      label?: string;
      score?: number;
      headlines?: string[];
    };
    trend?: {
      overallLabel?: string;
      volatility?: number;
    };
  } | null;
  userContext?: UserContext;
  newsContext?: NewsContext;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const quickActions = [
  { label: 'Explain analysis', icon: Sparkles, message: 'Can you explain the current analysis and what it means for this stock?' },
  { label: 'Should I buy?', icon: TrendingUp, message: 'Based on the current data, should I consider buying this stock?' },
  { label: 'Portfolio risk?', icon: PieChart, message: 'Analyze my portfolio risk. Am I over-concentrated in any stock or sector?' },
  { label: 'My P&L?', icon: Briefcase, message: 'Give me a summary of my portfolio performance and P&L.' },
  { label: 'News impact?', icon: Newspaper, message: 'How might recent news affect this stock and the market?' },
  { label: 'Tax impact?', icon: Settings, message: 'Based on my settings, what would be the tax impact if I sell my holdings?' },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--text-muted)]"
            style={{
              animation: 'bounce 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
      <span className="ml-2 text-sm text-[var(--text-muted)]">Analyzing...</span>
    </div>
  );
}

// Simple markdown parser for chat messages
function parseMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = 0;
  
  // Split by lines
  const lines = text.split('\n');
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' = 'ul';
  
  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`list-${key++}`} className="list-disc list-inside my-2 space-y-1">
            {listItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${key++}`} className="list-decimal list-inside my-2 space-y-1">
            {listItems}
          </ol>
        );
      }
      listItems = [];
      inList = false;
    }
  };
  
  const parseInline = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
    let lastIndex = 0;
    let match;
    let partKey = 0;
    
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`t-${partKey++}`}>{line.slice(lastIndex, match.index)}</span>);
      }
      
      if (match[1]) {
        parts.push(<strong key={`b-${partKey++}`} className="font-semibold">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`i-${partKey++}`}>{match[4]}</em>);
      } else if (match[5]) {
        parts.push(
          <code key={`c-${partKey++}`} className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-primary)] font-mono text-xs">
            {match[6]}
          </code>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < line.length) {
      parts.push(<span key={`t-${partKey++}`}>{line.slice(lastIndex)}</span>);
    }
    
    return parts.length > 0 ? parts : [line];
  };
  
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    
    // Check for bullet points
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      const content = trimmed.slice(2);
      listItems.push(<li key={`li-${key++}`}>{parseInline(content)}</li>);
      return;
    }
    
    // Check for numbered lists
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      listItems.push(<li key={`li-${key++}`}>{parseInline(numberedMatch[2])}</li>);
      return;
    }
    
    // Not a list item, flush any pending list
    flushList();
    
    // Empty line = paragraph break
    if (trimmed === '') {
      elements.push(<div key={`br-${key++}`} className="h-2" />);
      return;
    }
    
    // Regular line with inline formatting
    elements.push(
      <p key={`p-${key++}`} className="mb-1">
        {parseInline(line)}
      </p>
    );
  });
  
  // Flush any remaining list
  flushList();
  
  return elements;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-[fade-in_0.3s_ease-out]`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-[var(--accent-primary)] text-white rounded-br-md'
            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border-light)]'
        }`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <div className="text-sm leading-relaxed">
          {isUser ? message.content : parseMarkdown(message.content)}
        </div>
      </div>
    </div>
  );
}

export default function StockChat({ stockContext, userContext, newsContext, isOpen, onClose }: StockChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previousSymbol = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Show welcome message when stock context changes
  useEffect(() => {
    if (stockContext && stockContext.symbol !== previousSymbol.current) {
      previousSymbol.current = stockContext.symbol;
      setHasShownWelcome(false);
      setMessages([]);
    }

    if (isOpen && stockContext && !hasShownWelcome) {
      const advisoryLabel = stockContext.advisory?.label || 'Pending';
      const confidence = stockContext.advisory?.confidence || 0;
      
      // Build portfolio summary if available
      let portfolioSummary = '';
      if (userContext?.portfolio && userContext.portfolio.length > 0) {
        const totalValue = userContext.risk?.portfolioValue || 0;
        const totalPnl = userContext.risk?.unrealizedPnl || 0;
        const holdingCount = userContext.portfolio.length;
        portfolioSummary = `\n\n📊 Your Portfolio: ${holdingCount} holdings | Value: PKR ${totalValue.toLocaleString()} | P&L: ${totalPnl >= 0 ? '+' : ''}PKR ${totalPnl.toLocaleString()}`;
        
        // Check if user holds this stock
        const holding = userContext.portfolio.find(h => h.symbol === stockContext.symbol);
        if (holding) {
          portfolioSummary += `\n📍 You hold ${holding.quantity} shares of ${stockContext.symbol} (P&L: ${holding.pnl >= 0 ? '+' : ''}${holding.pnlPct.toFixed(2)}%)`;
        }
      }
      
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `👋 Hi! I'm your PSX Assistant. I've analyzed **${stockContext.symbol}** (${stockContext.name}).

Current advisory: **${advisoryLabel}** with ${confidence}% confidence.

Current price: PKR ${stockContext.currentPrice?.toLocaleString() || 'N/A'} (LDCP: ${stockContext.ldcp?.toLocaleString() || 'N/A'})
Sector: ${stockContext.sector || 'N/A'}${portfolioSummary}

I have full context of your portfolio, trades, settings, and latest market news. How can I help?`
      };
      
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [isOpen, stockContext, userContext, hasShownWelcome]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build clean stock context for API - handle undefined values
      const cleanContext = stockContext ? {
        symbol: stockContext.symbol || '',
        name: stockContext.name || stockContext.symbol || '',
        sector: stockContext.sector || '',
        currentPrice: stockContext.currentPrice || 0,
        ldcp: stockContext.ldcp || 0,
        change: stockContext.currentPrice && stockContext.ldcp 
          ? Number((stockContext.currentPrice - stockContext.ldcp).toFixed(2))
          : 0,
        changePct: stockContext.currentPrice && stockContext.ldcp 
          ? Number(((stockContext.currentPrice - stockContext.ldcp) / stockContext.ldcp * 100).toFixed(2))
          : 0,
        advisory: stockContext.advisory ? {
          label: stockContext.advisory.label || '',
          confidence: stockContext.advisory.confidence || 0,
          reasoning: Array.isArray(stockContext.advisory.reasoning) ? stockContext.advisory.reasoning : [],
          suggestedAction: stockContext.advisory.suggestedAction || '',
          riskLevel: stockContext.advisory.riskLevel || '',
          targetEntry: stockContext.advisory.targetEntry ?? null,
          targetExit: stockContext.advisory.targetExit ?? null,
          stopLoss: stockContext.advisory.stopLoss ?? null,
        } : undefined,
        technicals: stockContext.technicals ? {
          rsi: stockContext.technicals.rsi || null,
          macd: stockContext.technicals.macd || null,
          compositeScore: stockContext.technicals.compositeScore || 0,
        } : undefined,
        sentiment: stockContext.sentiment ? {
          label: stockContext.sentiment.label || 'neutral',
          score: stockContext.sentiment.score || 0,
          headlines: Array.isArray(stockContext.sentiment.headlines) 
            ? stockContext.sentiment.headlines.slice(0, 5) 
            : [],
        } : undefined,
        trend: stockContext.trend ? {
          overallLabel: stockContext.trend.overallLabel || '',
          volatility: stockContext.trend.volatility || 0,
        } : undefined,
      } : undefined;
      
      // Get only user messages from history (skip welcome and error messages)
      const chatHistory = messages
        .filter(m => m.role === 'user')
        .map(m => ({ role: 'user' as const, content: m.content }));
      
      const requestBody = {
        messages: [...chatHistory, { role: 'user' as const, content: content.trim() }],
        stockContext: cleanContext,
        userContext: userContext || undefined,
        newsContext: newsContext || undefined,
      };
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Chat API error:', res.status, errorData);
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again.',
        },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Chat Panel - Side panel without blur overlay */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col
          w-full md:w-[400px] lg:w-[440px]
          bg-[var(--bg-primary)] border-l border-[var(--border-light)]
          shadow-2xl animate-[slide-in-panel_0.3s_ease-out]"
        style={{
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[#A29BFE] flex items-center justify-center shadow-md">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 
                className="font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                PSX Assistant
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {stockContext 
                  ? `AI analysis for ${stockContext.symbol}` 
                  : 'Select a stock to analyze'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center
              text-[var(--text-secondary)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-secondary)] transition-all duration-200"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        {stockContext && messages.length <= 1 && (
          <div className="px-4 py-3 border-b border-[var(--border-light)] bg-[var(--bg-card)]/50">
            <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide font-medium">
              Quick Questions
            </p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(action.message)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                    rounded-full border border-[var(--border-light)] bg-[var(--bg-card)]
                    text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
                    hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scroll-smooth">
          {messages.length === 0 && !stockContext && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <h3 
                className="text-lg font-semibold text-[var(--text-primary)] mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                No Stock Selected
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Select a stock from the advisor page to start an AI-powered analysis conversation.
              </p>
            </div>
          )}

          {messages.map((message, idx) => (
            <MessageBubble key={idx} message={message} />
          ))}

          {loading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 py-4 border-t border-[var(--border-light)] bg-[var(--bg-card)]">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={stockContext ? `Ask about ${stockContext.symbol}...` : 'Select a stock first...'}
                disabled={loading || !stockContext}
                rows={1}
                className="w-full px-4 py-3 pr-12 text-sm rounded-xl resize-none
                  bg-[var(--input-bg)] border border-[var(--border-light)]
                  text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30
                  focus:border-[var(--accent-primary)] transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  max-h-32 overflow-y-auto"
                style={{
                  fontFamily: 'var(--font-body)',
                  minHeight: '48px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim() || !stockContext}
              className="w-12 h-12 rounded-xl flex items-center justify-center
                bg-[var(--accent-primary)] text-white shadow-md
                hover:bg-[var(--accent-primary)]/90 hover:shadow-lg
                active:scale-95 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              aria-label="Send message"
            >
              <SendHorizontal className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Keyframe animations injected via style tag */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-in-panel {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-4px);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />
    </>
  );
}
