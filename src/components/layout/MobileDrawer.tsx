import { Link } from '../../context/RouterContext';
import {
  ShieldCheck,
  User,
  LayoutDashboard,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  user: any;
  profile: any;
  signOut: () => Promise<void> | void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  currentPath,
  user,
  profile,
  signOut,
}: MobileDrawerProps) {
  const normalizedPath = currentPath.split('?')[0].replace(/\/+$/, '') || '/';

  return (
    <div
      className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
        isOpen
          ? 'max-h-[85vh] opacity-100 translate-y-0 border-b border-purple-500/20'
          : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="bg-[#070412]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 font-['Poppins',sans-serif] uppercase">
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to="/admin"
            onClick={onClose}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full fintech-btn-secondary text-amber-300 text-xs font-semibold"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Panel</span>
          </Link>

          {user ? (
            <Link
              to="/dashboard"
              onClick={onClose}
              className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full fintech-btn-primary text-white text-xs font-semibold"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full fintech-btn-primary text-white text-xs font-semibold"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          )}
        </div>

        {user && (
          <div className="p-3 rounded-xl fintech-panel flex items-center justify-between">
            <div className="text-xs font-semibold text-white truncate">
              {user.displayName || profile?.username || user.email}
            </div>
            <button
              type="button"
              onClick={() => {
                signOut();
                onClose();
              }}
              className="text-xs text-rose-400 hover:underline shrink-0 ml-2 py-1 px-2"
            >
              Sign Out
            </button>
          </div>
        )}

        <div className="space-y-1.5 pt-1">
          <Link
            to="/"
            onClick={onClose}
            className={`min-h-[44px] flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
              normalizedPath === '/'
                ? 'liquid-glass-active-pill text-white'
                : 'text-slate-200 hover:text-white hover:bg-[#A855F7]/15'
            }`}
          >
            <span>All 8 Creator Tools</span>
            <ChevronRight className="w-4 h-4 text-purple-300" />
          </Link>

          <Link
            to="/video-studio"
            onClick={onClose}
            className={`min-h-[44px] flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
              normalizedPath === '/video-studio'
                ? 'liquid-glass-active-pill text-white'
                : 'text-purple-200 hover:text-white hover:bg-[#A855F7]/15'
            }`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm leading-none">🎬</span>
              Video Studio
            </span>
            <ChevronRight className="w-4 h-4 text-purple-300" />
          </Link>

          <Link
            to="/ai-assistant"
            onClick={onClose}
            className={`min-h-[44px] flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
              normalizedPath === '/ai-assistant'
                ? 'liquid-glass-active-pill text-white'
                : 'text-purple-200 hover:text-white hover:bg-[#A855F7]/15'
            }`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm leading-none">🤖</span>
              AI Subtitle Assistant
            </span>
            <ChevronRight className="w-4 h-4 text-purple-300" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-purple-500/15 text-xs">
          {[
            { label: 'SRT to VTT', path: '/tools/srt-to-vtt' },
            { label: 'VTT to SRT', path: '/tools/vtt-to-srt' },
            { label: 'Timing Fixer', path: '/tools/timing-fixer' },
            { label: 'FPS Converter', path: '/tools/fps-converter' },
            { label: 'Validator', path: '/tools/validator' },
            { label: 'Text Extractor', path: '/tools/text-extractor' },
            { label: 'Subtitle Merger', path: '/tools/merger' },
            { label: 'YouTube Chapters', path: '/tools/youtube-chapters' },
          ].map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              onClick={onClose}
              className={`min-h-[40px] flex items-center px-3 rounded-lg transition-all active:scale-[0.98] ${
                normalizedPath === tool.path
                  ? 'liquid-glass-active-pill text-white font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#A855F7]/15'
              }`}
            >
              {tool.label}
            </Link>
          ))}
        </div>

        <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between text-xs">
          <Link
            to="/guide"
            onClick={onClose}
            className={`py-1.5 px-2.5 rounded-full transition-colors ${
              normalizedPath === '/guide'
                ? 'liquid-glass-active-pill text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Format Guide
          </Link>
          <Link
            to="/privacy"
            onClick={onClose}
            className="py-1.5 text-slate-400 hover:text-white flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            100% Private
          </Link>
        </div>
      </div>
    </div>
  );
}
