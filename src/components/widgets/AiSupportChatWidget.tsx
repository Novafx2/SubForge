import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useRouter } from '../../context/RouterContext';
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
  AlertCircle,
  WifiOff,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider?: string;
  isLiveAi?: boolean;
  isError?: boolean;
  retryPrompt?: string;
}

type AiServiceStatus = 'checking' | 'online' | 'offline';

const CHAT_STORAGE_KEY = 'subforge_ai_chat_history_v1';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: "Welcome to SubForge AI Support! Ask me anything about SRT/WebVTT subtitle syntax, timing & FPS sync, subtitle translation, video editing workflows, or any of SubForge's 8 creator tools.",
    timestamp: 'Ready',
    provider: 'SubForge Assistant',
    isLiveAi: true,
  },
];

const SUGGESTED_PROMPTS = [
  'How do I convert SRT to WebVTT?',
  'Why do my subtitles drift at 23.976 vs 25 fps?',
  'How do I translate subtitles without breaking timestamps?',
  'What are YouTube chapter rules & CPS limits?',
];

function loadSavedMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return INITIAL_MESSAGES;
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(-50);
      }
    }
  } catch {
    // ignore storage parse failures
  }
  return INITIAL_MESSAGES;
}

function renderInlineFormatting(
  line: string,
  onNavigate?: (path: string) => void
): React.ReactNode[] {
  // Safely render **bold**, `inline code`, and [label](url) without dangerouslySetInnerHTML
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:\/|https?:\/\/)[^)\s]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2);
      const nestedLink = inner.match(/^\[([^\]]+)\]\(((?:\/|https?:\/\/)[^)\s]+)\)$/);
      if (nestedLink) {
        const [, label, href] = nestedLink;
        return (
          <a
            key={idx}
            href={href}
            onClick={(e) => {
              if (href.startsWith('/') && onNavigate) {
                e.preventDefault();
                onNavigate(href);
              }
            }}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="font-semibold text-cyan-300 underline decoration-cyan-400/50 hover:text-cyan-200"
          >
            {label}
          </a>
        );
      }
      return (
        <strong key={idx} className="font-semibold text-white">
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 font-mono text-[11px] text-cyan-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(((?:\/|https?:\/\/)[^)\s]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          key={idx}
          href={href}
          onClick={(e) => {
            if (href.startsWith('/') && onNavigate) {
              e.preventDefault();
              onNavigate(href);
            }
          }}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="font-medium text-cyan-300 underline decoration-cyan-400/50 hover:text-cyan-200"
        >
          {label}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedMessageBody({
  text,
  onNavigate,
}: {
  text: string;
  onNavigate?: (path: string) => void;
}) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');
        const isBulletList = lines.every((l) => /^\s*[-*•]\s+/.test(l) || !l.trim());
        if (isBulletList) {
          return (
            <ul key={pIdx} className="list-disc pl-4 space-y-1">
              {lines
                .filter((l) => l.trim())
                .map((l, lIdx) => (
                  <li key={lIdx}>{renderInlineFormatting(l.replace(/^\s*[-*•]\s+/, ''), onNavigate)}</li>
                ))}
            </ul>
          );
        }
        return (
          <p key={pIdx} className="whitespace-pre-wrap leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInlineFormatting(line, onNavigate)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// Memoized individual message item to prevent re-renders on every keystroke
const ChatMessageItem = memo(function ChatMessageItem({
  msg,
  onRetry,
  onNavigate,
  disabled,
}: {
  msg: ChatMessage;
  onRetry?: (prompt: string) => void;
  onNavigate?: (path: string) => void;
  disabled?: boolean;
}) {
  const isUser = msg.sender === 'user';
  const isError = Boolean(msg.isError);

  return (
    <div className={`flex gap-2.5 items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${
            isError
              ? 'bg-rose-950 border border-rose-500/50 text-rose-300'
              : 'bg-gradient-to-br from-violet-600 to-purple-600'
          }`}
        >
          {isError ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> : <Sparkles className="w-3 h-3 text-cyan-300" />}
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words ${
          isUser
            ? 'glass-pill-btn text-white rounded-br-sm'
            : isError
            ? 'bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-bl-sm shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
            : 'bg-[#120a22]/90 border border-purple-500/25 text-slate-200 rounded-bl-sm shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
        }`}
      >
        <FormattedMessageBody text={msg.text} onNavigate={onNavigate} />

        {isError && msg.retryPrompt && onRetry && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRetry(msg.retryPrompt!)}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-[10px] font-semibold text-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry request</span>
          </button>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-slate-400 border-t border-white/10 pt-1">
          <span className="font-mono">{msg.timestamp}</span>
          {msg.provider && (
            <span className={`truncate max-w-[160px] ${isError ? 'text-rose-300' : 'text-purple-300/80'}`}>
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
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="px-3 pb-2 pt-1.5 border-t border-purple-500/15">
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1.5 font-medium">
        <HelpCircle className="w-3 h-3 text-purple-400" />
        <span>Quick Creator Questions:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="text-[10px] px-2.5 py-1 rounded-full fintech-btn-secondary text-purple-200 hover:text-white transition-all text-left cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
});

export function AiSupportChatWidget() {
  const { navigate } = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadSavedMessages);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiServiceStatus>('checking');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkAiStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status', { cache: 'no-store' });
      if (!res.ok) {
        setAiStatus('offline');
        return;
      }
      const data = await res.json();
      setAiStatus(data.online && data.configured ? 'online' : 'offline');
    } catch {
      setAiStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkAiStatus();
  }, [checkAiStatus]);

  useEffect(() => {
    if (isOpen) {
      checkAiStatus();
    }
  }, [isOpen, checkAiStatus]);

  // Persist conversation history
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore storage quota failures
    }
  }, [messages]);

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
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom(false);
    }
  }, [messages, loading, isOpen, isMinimized, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? inputValue).trim();
      if (!text || loading) return;

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text,
        timestamp,
      };

      // Build conversation history from prior real turns (exclude welcome & error bubbles)
      const priorHistory = messages
        .filter((m) => m.id !== 'msg-welcome' && !m.isError)
        .slice(-12)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text,
        }));

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) {
        setInputValue('');
      }
      setLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const clientTimeout = setTimeout(() => controller.abort(), 42000);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: text,
            messages: [...priorHistory, { role: 'user', text }],
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.isLiveAi && typeof data.message === 'string' && data.message.trim()) {
          setAiStatus('online');
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: data.message.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            provider: data.provider || 'Google Gemini AI',
            isLiveAi: true,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          setAiStatus('offline');
          const errText =
            data.error ||
            'AI service is currently offline or unavailable. Please check your connection and try again.';
          const errorMsg: ChatMessage = {
            id: `ai-err-${Date.now()}`,
            sender: 'assistant',
            text: errText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            provider: 'AI Service Offline',
            isLiveAi: false,
            isError: true,
            retryPrompt: text,
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } catch (err: any) {
        setAiStatus('offline');
        const isAbort = err?.name === 'AbortError';
        const errorMsg: ChatMessage = {
          id: `ai-net-${Date.now()}`,
          sender: 'assistant',
          text: isAbort
            ? 'The AI request timed out while waiting for a response. Please retry.'
            : 'Unable to reach the AI backend server. Please verify your network connection and retry.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'Connection Failed',
          isLiveAi: false,
          isError: true,
          retryPrompt: text,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        clearTimeout(clientTimeout);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 40);
      }
    },
    [inputValue, loading, messages]
  );

  const handleResetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setMessages(INITIAL_MESSAGES);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
    checkAiStatus();
  }, [checkAiStatus]);

  const statusDotClass =
    aiStatus === 'online'
      ? 'bg-emerald-400 animate-pulse'
      : aiStatus === 'checking'
      ? 'bg-amber-400 animate-pulse'
      : 'bg-rose-500';

  const statusLabel =
    aiStatus === 'online'
      ? 'AI Online · Live Gemini'
      : aiStatus === 'checking'
      ? 'Checking AI status...'
      : 'AI Offline · Unavailable';

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        aria-label="Open SubForge AI Support Chat"
        aria-expanded={isOpen}
        className={`fixed bottom-4 sm:bottom-5 right-3 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full glass-pill-btn text-white text-xs font-semibold shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(168,85,247,0.55)] cursor-pointer group hover:scale-105 active:scale-95 transition-all duration-200 min-h-[44px] ${
          isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 pointer-events-auto scale-100'
        }`}
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-cyan-300" />
          <span
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-[#030108] ${statusDotClass}`}
            title={statusLabel}
          />
        </div>
        <span className="tracking-wider font-semibold">AI Support</span>
      </button>

      {/* Floating Chat Window - Responsive on Mobile & Desktop */}
      <aside
        role="complementary"
        aria-label="AI Support Chat"
        aria-hidden={!isOpen}
        className={`fixed inset-x-3 sm:inset-x-auto sm:right-6 z-40 w-auto sm:w-[400px] fintech-panel rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(147,51,234,0.35)] transition-all duration-200 ease-out flex flex-col overflow-hidden font-['Poppins',sans-serif] ${
          !isOpen
            ? 'bottom-3 sm:bottom-5 opacity-0 scale-95 translate-y-3 pointer-events-none'
            : isMinimized
            ? 'bottom-3 sm:bottom-5 h-14 opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'bottom-3 sm:bottom-6 h-[min(540px,82dvh)] sm:h-[540px] sm:max-h-[85vh] opacity-100 scale-100 translate-y-0 pointer-events-auto'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-950/40 border-b border-purple-500/20 shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] shrink-0">
              <Bot className="w-4 h-4 text-white" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#070412] ${statusDotClass}`}
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-xs tracking-wider flex items-center gap-1.5 leading-none">
                <span>SubForge AI</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-500/30 font-mono">
                  Assistant
                </span>
              </h3>
              <span
                className={`text-[10px] flex items-center gap-1 mt-1 leading-none truncate ${
                  aiStatus === 'offline' ? 'text-rose-300' : 'text-slate-400'
                }`}
              >
                {aiStatus === 'offline' ? (
                  <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                )}
                <span className="truncate">{statusLabel}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Clear conversation history"
              aria-label="Clear conversation history"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={isMinimized ? 'Expand chat' : 'Minimize chat'}
              aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
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
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 text-xs text-slate-200 overscroll-contain">
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  msg={msg}
                  onRetry={handleSendMessage}
                  onNavigate={navigate}
                  disabled={loading}
                />
              ))}

              {/* AI Loading / Typing Indicator */}
              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1" role="status" aria-live="polite">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Sparkles className="w-3 h-3 text-cyan-300 animate-spin" />
                  </div>
                  <div className="bg-[#120a22]/90 border border-purple-500/25 rounded-2xl px-3.5 py-2 text-slate-300 flex items-center gap-2 shadow-sm">
                    <span className="text-[11px] font-medium text-purple-300">Thinking</span>
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

            {/* Quick Suggested Prompts */}
            {messages.length <= 2 && (
              <SuggestedPromptChips onSelect={handleSendMessage} disabled={loading} />
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
                  placeholder="Ask about SRT, VTT, sync, translation..."
                  aria-label="Type your message"
                  disabled={loading}
                  className="flex-1 bg-[#100920]/80 border border-purple-500/30 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400 min-h-[42px]"
                />
                <button
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className="p-2.5 glass-pill-btn rounded-full text-white disabled:opacity-40 cursor-pointer transition-transform active:scale-95 shrink-0 min-h-[42px] min-w-[42px] flex items-center justify-center"
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
