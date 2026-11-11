import { useAuth } from '../../context/AuthContext';
import { useRouter, Link } from '../../context/RouterContext';
import { SEOHead } from '../../components/layout/SEOHead';
import { TOOLS } from '../../utils/seoData';
import {
  User,
  Calendar,
  Shield,
  LogOut,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export function UserDashboardPage() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { navigate } = useRouter();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formattedDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  const displayName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Creator';

  const avatarUrl = user?.photoURL;
  const providerName = profile?.provider || 'OAuth';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEOHead
        title="Creator Dashboard – SubForge"
        description="Manage your SubForge account settings and launch subtitle tools."
        canonicalPath="/dashboard"
      />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <span>User Dashboard</span>
            {isAdmin && (
              <>
                <span>·</span>
                <span className="text-amber-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Administrator
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {displayName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 rounded-full fintech-btn-secondary text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Panel</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 rounded-full fintech-btn-secondary text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profile Card & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Overview Card */}
          <div className="fintech-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-purple-500/15">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover border border-purple-400/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center font-bold text-white text-lg shadow-[0_0_16px_rgba(147,51,234,0.4)]">
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="font-bold text-white text-sm truncate">
                  {displayName}
                </div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Member Since:</span>
                </span>
                <span className="text-slate-200 font-mono">{formattedDate}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Account Status:</span>
                </span>
                <span className="text-emerald-400 font-medium capitalize">
                  {profile?.status || 'Active'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sign-In Provider:</span>
                </span>
                <span className="text-slate-200 font-medium">{providerName}</span>
              </div>
            </div>
          </div>

          {/* AI Assistant Quick Launcher */}
          <div className="fintech-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>SubForge AI</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Translate subtitles, rewrite for readability, correct grammar, and generate video chapters with our zero-cost local browser AI.
            </p>
            <Link
              to="/ai-assistant"
              className="inline-flex items-center gap-2 w-full justify-center py-2.5 px-4 glass-pill-btn rounded-full text-white text-xs font-semibold transition-all"
            >
              <span>Open AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Tools Launcher */}
        <div className="lg:col-span-8 space-y-8">
          <div className="fintech-panel rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
              Your Subtitle Creator Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOOLS.map((t) => (
                <Link
                  key={t.id}
                  to={t.path}
                  className="p-3 bg-[#100920]/70 border border-purple-500/20 hover:border-purple-400/50 rounded-xl flex items-center justify-between transition-all group hover:-translate-y-0.5"
                >
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-purple-300 transition-colors">
                      {t.shortName}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{t.tagline}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
