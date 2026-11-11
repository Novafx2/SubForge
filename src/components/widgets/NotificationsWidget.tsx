import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Sparkles, Check, Info, ShieldCheck, Layers, X } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'system' | 'tools' | 'feature' | 'security';
  isRead: boolean;
  actionUrl?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'SubForge v2.4 Engine Active',
    description: '100% private in-browser subtitle processing and WebGPU client-side transformers are operational.',
    timestamp: 'Just now',
    category: 'system',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'Broadcast Compliance Linter',
    description: 'Automated WCAG AAA & BBC 37 CPS line length audits are active in the Subtitle Validator.',
    timestamp: '2 hours ago',
    category: 'tools',
    isRead: false,
    actionUrl: '/tools/validator',
  },
  {
    id: 'notif-3',
    title: 'Bilingual Dual Merger Ready',
    description: 'Merge foreign language tracks with automatic millisecond chronological cue alignment.',
    timestamp: '1 day ago',
    category: 'feature',
    isRead: false,
    actionUrl: '/tools/merger',
  },
  {
    id: 'notif-4',
    title: 'Zero-Upload Privacy Guarantee',
    description: 'All audio, video timestamps, and caption files remain strictly on your device.',
    timestamp: '2 days ago',
    category: 'security',
    isRead: true,
    actionUrl: '/privacy',
  },
];

const STORAGE_KEY = 'subforge_notifications_v1';

export function NotificationsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View system notifications"
        aria-expanded={isOpen}
        className="relative p-2 sm:p-2.5 rounded-full fintech-btn-secondary text-slate-200 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 group cursor-pointer"
      >
        <Bell className="w-4 h-4 text-purple-300 group-hover:text-cyan-300 transition-colors" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-mono font-bold text-[10px] flex items-center justify-center border border-white/30 shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed inset-x-3 top-20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-96 max-w-[calc(100vw-24px)] fintech-panel rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(147,51,234,0.3)] z-50 overflow-hidden text-xs font-['Poppins',sans-serif]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-950/30 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-xs tracking-wider uppercase">
                System Updates
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-600/30 border border-purple-400/30 text-purple-200 text-[10px] font-mono font-semibold">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-purple-500/15">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <Check className="w-8 h-8 mx-auto text-emerald-400/80" />
                <p className="text-white font-medium text-xs">All Caught Up</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  No new platform notifications. System is running at 100% operational health.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start group ${
                    item.isRead
                      ? 'bg-transparent hover:bg-white/[0.03]'
                      : 'bg-purple-950/20 hover:bg-purple-900/30'
                  }`}
                >
                  {/* Category icon */}
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600/30 to-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300">
                    {item.category === 'system' && <Sparkles className="w-3.5 h-3.5 text-purple-300" />}
                    {item.category === 'tools' && <Layers className="w-3.5 h-3.5 text-cyan-300" />}
                    {item.category === 'feature' && <Info className="w-3.5 h-3.5 text-blue-300" />}
                    {item.category === 'security' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-white truncate text-xs">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-purple-500/10">
                      <span className="text-[9px] font-mono text-purple-300/80 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(item.id, e)}
                        className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                        title="Dismiss notification"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!item.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5 shadow-[0_0_8px_#22d3ee]"
                      title="Unread notification"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-purple-950/30 border-t border-purple-500/20 text-center text-[10px] text-slate-400 flex items-center justify-between">
            <span>Client-side Engine Updates</span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Online
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
