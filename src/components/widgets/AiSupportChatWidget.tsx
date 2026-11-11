import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider?: string;
  isLiveAi?: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: "Welcome to SubForge Support! I can assist you with subtitle format conversion (SRT & WebVTT), framerate sync, timing drift, broadcast compliance (CPS limits), and YouTube video chapters. How can I help you today?",
    timestamp: 'Just now',
    provider: 'SubForge Support Assistant',
    isLiveAi: false,
  },
];

const SUGGESTED_PROMPTS = [
  'How do I convert SRT to WebVTT?',
  'Why do my subtitles drift over time?',
  'How do YouTube chapter timestamps work?',
  'What is the maximum CPS reading speed?',
];

// Memoized individual message item to prevent re-renders on every keystroke
const ChatMessageItem = memo(function ChatMessageItem({ msg }: { msg: ChatMessage }) {
  const isUser = msg.sender === 'user';
  return (
    <div className={`flex gap-2.5 items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
          <Sparkles className="w-3 h-3 text-cyan-300" />
        </div>
      )}

      <div
        className={`max-w-[84%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words ${
          isUser
            ? 'glass-pill-btn text-white rounded-br-sm'
            : 'bg-[#120a22]/90 border border-purple-500/25 text-slate-200 rounded-bl-sm shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.text}</p>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-slate-400 border-t border-white/10 pt-1">
          <span className="font-mono">{msg.timestamp}</span>
          {msg.provider && (
            <span className="text-purple-300/80 truncate max-w-[150px]">
              {msg.provider}
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-lg bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-200 shrink-0">
          <User className="w-3 h-3" />
        </div>
      )}
    </div>
  );
});

// Memoized suggested prompts chips
const SuggestedPromptChips = memo(function SuggestedPromptChips({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="px-3 pb-2 pt-1 border-t border-purple-500/15">
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1.5 font-medium">
        <HelpCircle className="w-3 h-3 text-purple-400" />
        <span>Frequently Asked Questions:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(prompt)}
            className="text-[10px] px-2.5 py-1 rounded-full fintech-btn-secondary text-purple-200 hover:text-white transition-all text-left cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
});

export function AiSupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fast scroll to bottom without layout thrashing
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      if (instant) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      } else {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }
  }, []);

  // When opening or receiving new messages, scroll and focus smoothly
  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom(true);
      // Fast focus with tiny deferral to allow transition to begin
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized, scrollToBottom]);

  // Scroll on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom(false);
    }
  }, [messages, isOpen, isMinimized, scrollToBottom]);

  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.message || data.reply || 'Request processed successfully.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: data.provider || (data.isLiveAi ? 'Google Gemini 3.8 Flash' : 'SubForge Offline Knowledge Engine'),
          isLiveAi: data.isLiveAi ?? false,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const fallbackMsg: ChatMessage = {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: errorData.message || "I'm temporarily operating offline. All 8 SubForge client-side tools remain fully functional in your browser.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'SubForge Offline Fallback',
          isLiveAi: false,
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai-net-${Date.now()}`,
        sender: 'assistant',
        text: 'Unable to connect to AI server. For instant subtitle conversions and framerate sync, use the navigation tools directly in your browser with 100% local processing.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'SubForge Local Engine',
        isLiveAi: false,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }, [inputValue, loading]);

  const handleResetChat = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
  }, []);

  return (
    <>
      {/* Floating Launcher Button - Smooth CSS opacity & scale transition */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        aria-label="Open SubForge AI Support Chat"
        aria-expanded={isOpen}
        className={`fixed bottom-4 sm:bottom-5 right-3 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full glass-pill-btn text-white text-xs font-semibold shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(168,85,247,0.55)] cursor-pointer group hover:scale-105 active:scale-95 transition-all duration-200 ${
          isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 pointer-events-auto scale-100'
        }`}
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-cyan-300" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#030108] animate-pulse" />
        </div>
        <span className="tracking-wider font-semibold">AI Support</span>
      </button>

      {/* Floating Chat Window - Pre-mounted with GPU-accelerated CSS Transitions */}
      <aside
        role="complementary"
        aria-label="AI Support Chat"
        aria-hidden={!isOpen}
        className={`fixed right-3 sm:right-6 z-40 w-[calc(100vw-24px)] max-w-sm sm:w-96 fintech-panel rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(147,51,234,0.35)] transition-all duration-200 ease-out flex flex-col overflow-hidden font-['Poppins',sans-serif] ${
          !isOpen
            ? 'bottom-4 opacity-0 scale-95 translate-y-3 pointer-events-none'
            : isMinimized
            ? 'bottom-4 sm:bottom-5 h-14 opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'bottom-4 sm:bottom-6 h-[520px] max-h-[85vh] opacity-100 scale-100 translate-y-0 pointer-events-auto'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-950/40 border-b border-purple-500/20 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]">
              <Bot className="w-4 h-4 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#070412]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs tracking-wider flex items-center gap-1.5 leading-none">
                <span>SubForge AI</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-500/30 font-mono">
                  Support
                </span>
              </h3>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 leading-none">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Private In-Browser Help</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Restart conversation"
              aria-label="Restart conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand chat' : 'Minimize chat'}
              aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content (hidden when minimized) */}
        {!isMinimized && (
          <>
            {/* Message Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-slate-200 overscroll-contain">
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} msg={msg} />
              ))}

              {/* Lightweight AI Processing / Typing Indicator */}
              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Sparkles className="w-3 h-3 text-cyan-300 animate-spin" />
                  </div>
                  <div className="bg-[#120a22]/90 border border-purple-500/25 rounded-2xl px-3.5 py-2 text-slate-300 flex items-center gap-2 shadow-sm">
                    <span className="text-[11px] font-medium text-purple-300">Processing</span>
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:200ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse [animation-delay:400ms]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggested Prompts (visible if only initial conversation) */}
            {messages.length <= 2 && (
              <SuggestedPromptChips onSelect={handleSendMessage} />
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-purple-950/25 border-t border-purple-500/20 shrink-0"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about subtitles, tools, or sync..."
                  aria-label="Type your message"
                  disabled={loading}
                  className="flex-1 bg-[#100920]/80 border border-purple-500/30 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400 min-h-[40px]"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className="p-2.5 glass-pill-btn rounded-full text-white disabled:opacity-40 cursor-pointer transition-transform active:scale-95 shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </aside>
    </>
  );
}
