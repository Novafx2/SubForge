import { useState } from 'react';
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

  const navItems = [
    { label: 'All Tools', path: '/' },
    { label: 'SRT to VTT', path: '/tools/srt-to-vtt' },
    { label: 'Timing Fixer', path: '/tools/timing-fixer' },
    { label: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
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
              <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8px] md:text-[8.5px] font-medium tracking-tight text-purple-300/80 uppercase mt-1 leading-tight line-clamp-1 max-w-[155px] xs:max-w-[230px] sm:max-w-[360px] md:max-w-none">
                AI TOOLS, WEBSITE BUILDING, HOSTING, SEO, AND SMARTER ONLINE GROWTH START HERE.
              </span>
            </div>
          </Link>

          {/* Center: Floating Glassmorphic Pill-Rail Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[#100920]/80 border border-purple-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/90 to-purple-600/90 text-white shadow-[0_0_16px_rgba(147,51,234,0.45)] font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-cyan-300" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Notifications, Admin Panel & Single Login Button / User Profile */}
          <div className="hidden sm:flex items-center gap-2.5 sm:gap-3 shrink-0">
            <NotificationsWidget />

            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full fintech-btn-secondary text-amber-300 hover:text-amber-200 text-xs font-semibold whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Panel</span>
            </Link>

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
