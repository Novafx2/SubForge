import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { SEOHead } from '../../components/layout/SEOHead';
import { SubForgeLogo } from '../../components/common/SubForgeLogo';
import { AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { user, signInWithGoogle } = useAuth();
  const { navigate } = useRouter();

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const getRedirectPath = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const target = params.get('redirect') || '/dashboard';
      if (target.startsWith('/') && !target.startsWith('//')) {
        return target;
      }
    }
    return '/dashboard';
  };

  useEffect(() => {
    if (user) {
      navigate(getRedirectPath());
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      setErrorMsg(error);
    } else {
      navigate(getRedirectPath());
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <SEOHead
        title="Sign In – SubForge"
        description="Sign in to SubForge with Google to access all 8 subtitle editing tools and creator utilities."
        canonicalPath="/login"
      />

      <div className="fintech-panel rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center mb-3">
            <SubForgeLogo size={48} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Sign In to SubForge
          </h1>
          <p className="text-xs text-slate-400">
            Sign in securely with your Google account to continue.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Centered Google Authentication Action */}
        <div className="flex flex-col items-center justify-center text-sm">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full max-w-xs mx-auto py-3.5 px-6 rounded-full bg-white/95 hover:bg-white text-slate-900 font-semibold flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(255,255,255,1)] disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0 min-h-[48px] cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>
              {loading ? 'Opening Google...' : 'Continue with Google'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
