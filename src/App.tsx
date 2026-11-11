import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { AiSupportChatWidget } from './components/widgets/AiSupportChatWidget';

// Public Pages
import { HomePage } from './pages/HomePage';
import { GuidePage } from './pages/GuidePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AboutPage } from './pages/AboutPage';
import { TermsPage } from './pages/TermsPage';
import { ContactPage } from './pages/ContactPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Protected User Pages
import { UserDashboardPage } from './pages/dashboard/UserDashboardPage';
import { AiAssistantPage } from './pages/ai/AiAssistantPage';
import { SrtToVttPage } from './pages/SrtToVttPage';
import { VttToSrtPage } from './pages/VttToSrtPage';
import { TimingFixerPage } from './pages/TimingFixerPage';
import { FpsConverterPage } from './pages/FpsConverterPage';
import { ValidatorPage } from './pages/ValidatorPage';
import { TextExtractorPage } from './pages/TextExtractorPage';
import { MergerPage } from './pages/MergerPage';
import { YoutubeChaptersPage } from './pages/YoutubeChaptersPage';

// Protected Admin Page
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';

// Fallback & SEO
import { SEOHead } from './components/layout/SEOHead';
import { Link } from './context/RouterContext';
import { AlertCircle } from 'lucide-react';

function AppRoutes() {
  const { currentPath } = useRouter();

  // Normalize path by stripping query params and trailing slash for route matching
  const pathOnly = currentPath.split('?')[0];
  const normalizedPath = pathOnly.length > 1 && pathOnly.endsWith('/')
    ? pathOnly.slice(0, -1)
    : pathOnly;

  switch (normalizedPath) {
    // Public Informational & Legal Pages
    case '/':
      return <HomePage />;
    case '/guide':
      return <GuidePage />;
    case '/privacy':
      return <PrivacyPage />;
    case '/about':
      return <AboutPage />;
    case '/terms':
      return <TermsPage />;
    case '/contact':
      return <ContactPage />;

    // Authentication Pages
    case '/login':
      return <LoginPage />;
    case '/signup':
      return <SignupPage />;
    case '/forgot-password':
      return <ForgotPasswordPage />;
    case '/reset-password':
      return <ResetPasswordPage />;
    case '/admin/login':
      return <AdminLoginPage />;

    // Protected User Pages
    case '/dashboard':
      return (
        <ProtectedRoute>
          <UserDashboardPage />
        </ProtectedRoute>
      );
    case '/ai-assistant':
      return (
        <ProtectedRoute>
          <AiAssistantPage />
        </ProtectedRoute>
      );

    // Protected 8 Core Subtitle Tools
    case '/tools/srt-to-vtt':
      return (
        <ProtectedRoute>
          <SrtToVttPage />
        </ProtectedRoute>
      );
    case '/tools/vtt-to-srt':
      return (
        <ProtectedRoute>
          <VttToSrtPage />
        </ProtectedRoute>
      );
    case '/tools/timing-fixer':
      return (
        <ProtectedRoute>
          <TimingFixerPage />
        </ProtectedRoute>
      );
    case '/tools/fps-converter':
      return (
        <ProtectedRoute>
          <FpsConverterPage />
        </ProtectedRoute>
      );
    case '/tools/validator':
      return (
        <ProtectedRoute>
          <ValidatorPage />
        </ProtectedRoute>
      );
    case '/tools/text-extractor':
      return (
        <ProtectedRoute>
          <TextExtractorPage />
        </ProtectedRoute>
      );
    case '/tools/merger':
      return (
        <ProtectedRoute>
          <MergerPage />
        </ProtectedRoute>
      );
    case '/tools/youtube-chapters':
      return (
        <ProtectedRoute>
          <YoutubeChaptersPage />
        </ProtectedRoute>
      );

    // Admin-Only Route
    case '/admin':
      return (
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboardPage />
        </ProtectedRoute>
      );

    // 404 Route
    default:
      return (
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <SEOHead
            title="Page Not Found – SubForge"
            description="The page or tool you requested could not be found."
            canonicalPath="/404"
          />
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-400 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
          <p className="text-sm text-slate-400 mb-6">
            The page or utility route you requested does not exist or may have moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
          >
            Return to All Tools
          </Link>
        </div>
      );
  }
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-transparent text-slate-100">
          <Header />
          <main className="flex-1">
            <AppRoutes />
          </main>
          <Footer />
          <AiSupportChatWidget />
        </div>
      </AuthProvider>
    </RouterProvider>
  );
}
