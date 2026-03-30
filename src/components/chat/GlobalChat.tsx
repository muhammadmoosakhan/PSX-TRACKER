'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  label: string;
  prompt: string;
}

// Page context for AI
interface PageContext {
  page: string;
  symbol?: string;
  tab?: string;
  description: string;
}

export default function GlobalChat() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth pages to exclude
  const authPaths = ['/login', '/signup', '/forgot-password', '/auth/callback'];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  // Extract symbol from path if on stock detail page
  const stockMatch = pathname.match(/^\/stocks\/([A-Z]+)$/i);
  const currentSymbol = stockMatch ? stockMatch[1].toUpperCase() : null;
  
  // Get current tab from URL hash or default
  const currentTab = searchParams.get('tab') || (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '') || 'live';

  // Build page context for AI
  const getPageContext = useCallback((): PageContext => {
    if (pathname === '/' || pathname === '/dashboard') {
      return { page: 'dashboard', description: 'User is on the main dashboard viewing portfolio overview and market summary.' };
    }
    
    if (pathname.startsWith('/stocks') && currentSymbol) {
      const tabDescriptions: Record<string, string> = {
        live: `User is viewing LIVE tab for ${currentSymbol} showing real-time price, volume, bid/ask spread, and intraday movement.`,
        fundamentals: `User is viewing FUNDAMENTALS tab for ${currentSymbol} showing PE ratio, EPS, book value, dividend yield, market cap, and financial ratios.`,
        technicals: `User is viewing TECHNICALS tab for ${currentSymbol} showing RSI gauge (overbought >70, oversold <30), MACD histogram with signal line crossovers, Stochastic oscillator (%K/%D), Price with SMA overlays (20/50/200 day), and Support/Resistance levels from pivot points. The charts visualize momentum, trend strength, and key price levels.`,
        news: `User is viewing NEWS tab for ${currentSymbol} showing recent news articles and announcements affecting this stock.`,
        profile: `User is viewing PROFILE tab for ${currentSymbol} showing company information, sector, listing date, and corporate details.`,
        peers: `User is viewing PEERS tab for ${currentSymbol} showing comparison with other stocks in the same sector.`,
      };
      return { 
        page: 'stock-detail', 
        symbol: currentSymbol, 
        tab: currentTab,
        description: tabDescriptions[currentTab] || `User is viewing ${currentSymbol} stock details.`
      };
    }
    
    if (pathname.startsWith('/analysis')) {
      return { 
        page: 'analysis', 
        description: 'User is on the Analysis page viewing Monthly/Quarterly/Yearly performance charts including Net Investment Trend (line chart) and Realized P&L (bar chart with green/red for profit/loss). Charts show trading performance over time.'
      };
    }
    
    if (pathname.startsWith('/portfolio')) {
      return { page: 'portfolio', description: 'User is viewing their portfolio holdings, current positions, and unrealized P&L.' };
    }
    
    if (pathname.startsWith('/risk')) {
      return { page: 'risk', description: 'User is on the Risk Dashboard viewing concentration metrics, exposure analysis, and risk thresholds.' };
    }
    
    if (pathname.startsWith('/news')) {
      return { page: 'news', description: 'User is browsing Pakistan business news from Dawn, Tribune, Business Recorder, and Profit.' };
    }
    
    if (pathname.startsWith('/settings')) {
      return { page: 'settings', description: 'User is on Settings page configuring trading costs, capital, and risk thresholds.' };
    }
    
    if (pathname.startsWith('/advisor')) {
      return { page: 'advisor', description: 'User is on the Stock Advisor page for AI-powered stock analysis and recommendations.' };
    }
    
    return { page: 'other', description: `User is on ${pathname} page.` };
  }, [pathname, currentSymbol, currentTab]);

  // Get page-aware quick actions
  const getQuickActions = useCallback((): QuickAction[] => {
    if (pathname === '/' || pathname === '/dashboard') {
      return [
        { label: 'Market Overview', prompt: 'Give me a quick overview of the PSX market today' },
        { label: 'Top Gainers', prompt: 'What are the top gaining stocks on PSX today?' },
        { label: 'News Summary', prompt: 'Summarize the latest Pakistan business news' },
      ];
    }

    if (pathname.startsWith('/stocks') && currentSymbol) {
      // Different quick actions based on current tab
      if (currentTab === 'technicals') {
        return [
          { label: 'Explain Charts', prompt: `Explain what the technical charts (RSI, MACD, Stochastic) are showing for ${currentSymbol}. What do these indicators suggest about the stock's momentum and trend?` },
          { label: 'RSI Analysis', prompt: `What does the RSI indicator show for ${currentSymbol}? Is it overbought, oversold, or neutral? What does this mean for trading?` },
          { label: 'MACD Signal', prompt: `Explain the MACD chart for ${currentSymbol}. Are there any crossover signals? What does the histogram indicate about momentum?` },
          { label: 'Support/Resistance', prompt: `What are the key support and resistance levels for ${currentSymbol}? How should I use these for entry/exit points?` },
        ];
      }
      if (currentTab === 'fundamentals') {
        return [
          { label: 'Valuation Check', prompt: `Is ${currentSymbol} undervalued or overvalued based on PE ratio and other fundamentals?` },
          { label: 'Financial Health', prompt: `Analyze the financial health of ${currentSymbol} based on its fundamental metrics.` },
          { label: 'Dividend Analysis', prompt: `What's the dividend history and yield for ${currentSymbol}? Is it a good dividend stock?` },
        ];
      }
      return [
        { label: `Analyze ${currentSymbol}`, prompt: `Give me a complete analysis of ${currentSymbol}` },
        { label: 'Technical Analysis', prompt: `What do the technical indicators say about ${currentSymbol}?` },
        { label: `${currentSymbol} News`, prompt: `What's the latest news affecting ${currentSymbol}?` },
      ];
    }

    if (pathname.startsWith('/stocks')) {
      return [
        { label: 'Find Stocks', prompt: 'Help me find stocks to invest in based on my criteria' },
        { label: 'Sector Analysis', prompt: 'Which sectors are performing best right now?' },
        { label: 'Market Trends', prompt: 'What are the current market trends on PSX?' },
      ];
    }

    if (pathname.startsWith('/analysis') || pathname.startsWith('/portfolio')) {
      return [
        { label: 'Explain Portfolio', prompt: 'Analyze my current portfolio allocation and performance' },
        { label: 'Risk Analysis', prompt: 'What are the risk factors in my portfolio?' },
        { label: 'Suggestions', prompt: 'Suggest improvements to my portfolio based on my holdings' },
      ];
    }

    if (pathname.startsWith('/news')) {
      return [
        { label: 'News Summary', prompt: 'Summarize the key headlines and their market impact' },
        { label: 'Market Impact', prompt: 'How might current news affect PSX stocks?' },
        { label: 'Sector News', prompt: 'Which sectors are in the news today?' },
      ];
    }

    // Default actions
    return [
      { label: 'Help', prompt: 'What can you help me with on PSX Tracker?' },
      { label: 'Market Status', prompt: 'Is the PSX market open? What are the trading hours?' },
    ];
  }, [pathname, currentSymbol, currentTab]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Get current page context
      const pageContext = getPageContext();
      
      // Enhance the message with page context
      const enhancedContent = `[PAGE CONTEXT: ${pageContext.description}]

User question: ${content.trim()}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: enhancedContent }],
          conversationHistory,
          // Pass stock context if on stock page
          ...(pageContext.symbol && { stockContext: { symbol: pageContext.symbol } }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Don't render on auth pages
  if (isAuthPage) return null;

  const quickActions = getQuickActions();

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed right-4 bottom-20 lg:bottom-6 z-[60]
          w-14 h-14 rounded-full
          bg-[#6C5CE7] text-white
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:scale-110 active:scale-95
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
        `}
        aria-label="Open chat"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>

      {/* Chat Panel */}
      <div
        className={`
          fixed z-[60] transition-all duration-300 ease-out
          ${isMinimized 
            ? 'right-4 bottom-20 lg:bottom-6 w-64 h-12' 
            : 'right-4 bottom-20 lg:bottom-6 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] max-h-[600px]'
          }
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
        `}
      >
        <div
          className={`
            w-full h-full flex flex-col
            bg-[var(--bg-card)] border border-[var(--border-light)]
            rounded-2xl shadow-2xl overflow-hidden
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#6C5CE7] text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l.94 2.06a2.25 2.25 0 002.012 1.244h8.096a2.25 2.25 0 002.012-1.244l.94-2.06M5 14.5a2.25 2.25 0 01-1.125-1.875V10.5a2.25 2.25 0 011.125-1.875m14 0V10.5a2.25 2.25 0 01-1.125 1.875M5 14.5v5.25A2.25 2.25 0 007.25 22h9.5A2.25 2.25 0 0019 19.75V14.5"
                  />
                </svg>
              </div>
              <span className="font-semibold text-sm">PSX Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {isMinimized ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  )}
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-8 h-8 text-[#6C5CE7]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                      Hi! I&apos;m your PSX Assistant
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Ask me anything about stocks, market trends, or your portfolio.
                    </p>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {quickActions.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => handleQuickAction(action)}
                          className="
                            px-3 py-1.5 text-xs font-medium
                            bg-[#6C5CE7]/10 text-[#6C5CE7]
                            rounded-full border border-[#6C5CE7]/20
                            hover:bg-[#6C5CE7]/20 transition-colors
                          "
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`
                            max-w-[85%] px-3 py-2 rounded-2xl text-sm
                            ${
                              message.role === 'user'
                                ? 'bg-[#6C5CE7] text-white rounded-br-md'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-md'
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[var(--bg-secondary)] px-4 py-3 rounded-2xl rounded-bl-md">
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-bounce" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Quick Actions (when there are messages) */}
              {messages.length > 0 && !isLoading && (
                <div className="px-4 pb-2">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {quickActions.slice(0, 3).map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action)}
                        className="
                          px-2.5 py-1 text-xs font-medium whitespace-nowrap
                          bg-[var(--bg-secondary)] text-[var(--text-secondary)]
                          rounded-full border border-[var(--border-light)]
                          hover:bg-[#6C5CE7]/10 hover:text-[#6C5CE7] hover:border-[#6C5CE7]/20
                          transition-colors flex-shrink-0
                        "
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-[var(--border-light)]">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about PSX..."
                    disabled={isLoading}
                    className="
                      flex-1 px-4 py-2.5 text-sm
                      bg-[var(--bg-secondary)] text-[var(--text-primary)]
                      placeholder:text-[var(--text-muted)]
                      border border-[var(--border-light)] rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7]
                      disabled:opacity-50
                    "
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="
                      px-4 py-2.5 rounded-xl
                      bg-[#6C5CE7] text-white
                      hover:bg-[#5B4ED6] active:scale-95
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6C5CE7]
                      transition-all
                    "
                    aria-label="Send message"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
