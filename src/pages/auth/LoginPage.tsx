import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { SEOHead } from '../../components/layout/SEOHead';
import { SubForgeLogo } from '../../components/common/SubForgeLogo';
import { AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { user, signInWithGoogle, signInWithFacebook } = useAuth();
  const { navigate } = useRouter();

  const [errorMsg, setErrorMsg] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);

  const getRedirectPath = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('redirect') || '/dashboard';
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
    setLoadingProvider('google');
    const { error } = await signInWithGoogle();
    setLoadingProvider(null);
    if (error) {
      setErrorMsg(error);
    } else {
      navigate(getRedirectPath());
    }
  };

  const handleFacebookLogin = async () => {
    setErrorMsg('');
    setLoadingProvider('facebook');
    const { error } = await signInWithFacebook();
    setLoadingProvider(null);
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
        description="Sign in to SubForge with Google or Facebook to access all 8 subtitle editing tools and creator utilities."
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
            Choose your account provider to continue.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3.5 text-sm">
          {/* Continue with Google */}
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={handleGoogleLogin}
            className="w-full py-3 px-5 rounded-full bg-white/95 hover:bg-white text-slate-900 font-semibold flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,1)] disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
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
              {loadingProvider === 'google' ? 'Opening Google...' : 'Continue with Google'}
            </span>
          </button>

          {/* Continue with Facebook */}
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={handleFacebookLogin}
            className="w-full py-3 px-5 rounded-full bg-[#1877F2]/90 hover:bg-[#1877F2] text-white font-semibold flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(24,119,242,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
            </svg>
            <span>
              {loadingProvider === 'facebook' ? 'Opening Facebook...' : 'Continue with Facebook'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
