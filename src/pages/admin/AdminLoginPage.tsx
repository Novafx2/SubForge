import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter, Link } from '../../context/RouterContext';
import { SEOHead } from '../../components/layout/SEOHead';
import { Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

export function AdminLoginPage() {
  const { adminLogin, isAdmin } = useAuth();
  const { navigate, currentPath } = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryParams = new URLSearchParams(currentPath.split('?')[1] || '');
  const redirectTarget = queryParams.get('redirect') || '/admin';

  useEffect(() => {
    if (isAdmin) {
      navigate(redirectTarget);
    }
  }, [isAdmin, navigate, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both Admin Username and Admin Password.');
      return;
    }

    setLoading(true);
    const { error } = await adminLogin(username.trim(), password);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
    } else {
      navigate(redirectTarget);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Admin Login – SubForge"
        description="SubForge Administrator Login."
        canonicalPath="/admin/login"
        noIndex={true}
      />

      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to SubForge</span>
          </Link>
        </div>

        <div className="fintech-panel rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(147,51,234,0.5)]">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Admin Login
            </h1>
            <p className="text-[11px] text-slate-400">
              Identity: <span className="text-purple-300 font-mono font-semibold">SubForgeAdmin</span> • Platform Governance
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-950/40 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username (SubForgeAdmin)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="SubForgeAdmin"
                  className="w-full pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Admin Password"
                  className="w-full pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 glass-pill-btn rounded-full text-white text-xs font-semibold disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Private Bootstrap Mode */}
          <div className="mt-6 pt-5 border-t border-purple-500/20 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-[11px] font-mono text-purple-300 mb-2">
              <span>Private Bootstrap Mode Available</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Security notice: Never post or disclose your private password or bootstrap keys in chat. Use your secure browser session to access administrator console.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
