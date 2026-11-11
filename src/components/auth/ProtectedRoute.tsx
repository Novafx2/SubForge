import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { AlertTriangle } from 'lucide-react';
import { Link } from '../../context/RouterContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isSuspended, loading } = useAuth();
  const { currentPath, navigate } = useRouter();

  useEffect(() => {
    if (loading) return;

    if (requireAdmin) {
      if (!isAdmin) {
        navigate(`/admin/login?redirect=${encodeURIComponent(currentPath)}`);
      }
      return;
    }

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [user, isAdmin, loading, currentPath, navigate, requireAdmin]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-sm">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span>Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (requireAdmin) {
    if (!isAdmin) {
      return null;
    }
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  if (isSuspended) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-[#0c1322] border border-rose-900/60 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Account Suspended</h1>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your account has been suspended by an administrator. You cannot access subtitle processing or AI tools.
        </p>
        <div className="pt-2">
          <Link
            to="/contact"
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
