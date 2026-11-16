import { useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { Link, useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationsWidget } from '../widgets/NotificationsWidget';
import {
  Menu,
  X,
  Sparkles,
  User,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
} from 'lucide-react';
import { MobileDrawer } from './MobileDrawer';
import { SubForgeLogo } from '../common/SubForgeLogo';

export function Header() {
  const { currentPath } = useRouter();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const normalizedPath = currentPath.split('?')[0].replace(/\/+$/, '') || '/';

  const navItems = [
    { label: 'All Tools', path: '/' },
    { label: 'Video Studio', path: '/video-studio', emoji: '🎬' },
    { label: 'SRT to VTT', path: '/tools/srt-to-vtt' },
    { label: 'Timing Fixer', path: '/tools/timing-fixer' },
    { label: 'AI Assistant', path: '/ai-assistant', emoji: '🤖' },
    { label: 'Format Guide', path: '/guide' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#04020A]/80 backdrop-blur-2xl border-b border-purple-500/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-18 py-3">
          {/* Left: Redesigned SUBFORGE Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-2.5 sm:gap-3 shrink min-w-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-xl"
          >
            <SubForgeLogo size={36} className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold tracking-wider text-white text-sm sm:text-base leading-none">
                SUBFORGE
              </span>
              <span className="text-[9px] sm:text-[9.5px] font-semibold tracking-[0.2em] text-[#B56BFF] drop-shadow-[0_0_8px_rgba(181,107,255,0.45)] uppercase mt-1 leading-none">
                FREE AI TOOLS
              </span>
            </div>
          </Link>

          {/* Center: Liquid Glass Pill-Rail Navigation */}
          <MotionConfig reducedMotion="user">
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-1 p-1 rounded-full liquid-glass-nav-rail"
            >
              {navItems.map((item) => {
                const isActive = normalizedPath === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`liquid-glass-nav-item px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap flex items-center gap-1.5 overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/80 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-[#F1EAFF]/80 font-medium hover:text-white hover:bg-[#A855F7]/14 hover:shadow-[0_0_16px_rgba(168,85,247,0.24)]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="subforge-liquid-glass-pill"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 32,
                          mass: 0.85,
                        }}
                        aria-hidden="true"
                        className="liquid-glass-active-pill absolute inset-0 rounded-full pointer-events-none"
                      >
                        <span key={normalizedPath} className="liquid-glass-sweep" />
                      </motion.span>
                    )}
                    {item.emoji && (
                      <span aria-hidden="true" className="relative z-10 text-xs leading-none">
                        {item.emoji}
                      </span>
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </MotionConfig>

          {/* Right: Notifications, Compact Admin Panel Icon Button & Single Login Button / User Profile */}
          <div className="hidden sm:flex items-center gap-2.5 sm:gap-3 shrink-0">
            <NotificationsWidget />

            <div className="relative group">
              <Link
                to="/admin"
                title="Admin Panel"
                aria-label="Admin Panel"
                className="liquid-glass-icon-btn w-10 h-10 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]"
              >
                <span aria-hidden="true" className="leading-none select-none">
                  👨‍💻
                </span>
              </Link>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider text-white whitespace-nowrap bg-[#120926]/95 border border-purple-400/40 backdrop-blur-xl shadow-[0_6px_18px_rgba(0,0,0,0.6),0_0_12px_rgba(168,85,247,0.35)] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150 z-50"
              >
                Admin Panel
              </span>
            </div>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full fintech-btn-secondary text-xs text-slate-100"
                >
                  {user.photoURL || profile?.avatarUrl ? (
                    <img
                      src={user.photoURL || profile?.avatarUrl || ''}
                      alt={user.displayName || profile?.fullName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover border border-purple-400/40"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-200 flex items-center justify-center font-bold text-[10px]">
                      {(user.displayName || profile?.fullName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[130px] truncate font-medium">
                    {user.displayName || profile?.fullName || user.email?.split('@')[0]}
                  </span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 bg-purple-500/25 text-purple-200 text-[10px] font-bold rounded-full">
                      ADMIN
                    </span>
                  )}
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 fintech-panel rounded-2xl py-2 z-50 text-xs"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3.5 py-2.5 border-b border-purple-500/15 flex items-center gap-2.5">
                      {user.photoURL || profile?.avatarUrl ? (
                        <img
                          src={user.photoURL || profile?.avatarUrl || ''}
                          alt="Profile"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-purple-400/40 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-600/40 text-purple-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {(user.displayName || profile?.fullName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {user.displayName || profile?.fullName || 'User'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      </div>
                    </div>

                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:text-white hover:bg-purple-500/10"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-purple-400" />
                      Dashboard &amp; Preferences
                    </Link>

                    <Link
                      to="/ai-assistant"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:text-white hover:bg-purple-500/10"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      AI Subtitle Assistant
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 px-3.5 py-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Admin Console
                      </Link>
                    )}

                    <div className="border-t border-purple-500/15 my-1" />

                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white fintech-btn-primary whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Right Controls: Notifications & Hamburger */}
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            <NotificationsWidget />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full fintech-btn-secondary text-slate-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <div className="hidden sm:flex md:hidden items-center shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full fintech-btn-secondary text-slate-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentPath={currentPath}
        user={user}
        profile={profile}
        signOut={signOut}
      />
    </header>
  );
}
