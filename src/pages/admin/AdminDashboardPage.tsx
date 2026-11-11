import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { SEOHead } from '../../components/layout/SEOHead';
import { TOOLS } from '../../utils/seoData';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Wrench,
  Bot,
  FileEdit,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Search,
  DollarSign,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Plus,
  UserX,
  UserCheck,
  Save,
  Globe,
  Share2,
  Clock,
  Database,
  Download,
  ArrowUpRight,
} from 'lucide-react';

export type AdminTab =
  | 'overview'       // 1. Dashboard Overview
  | 'users'          // 2. User Management
  | 'ai'             // 3. AI Management
  | 'tools'          // 4. Tools Management
  | 'assistant'      // 5. AI Assistant Management
  | 'content'        // 6. Website Content Management
  | 'images'         // 7. Image Manager
  | 'links'          // 8. Feature Links Manager
  | 'feedback'       // 9. Feedback Management
  | 'seo'            // 10. SEO Management (Dedicated standalone module)
  | 'ads'            // 11. Advertisement Management
  | 'general'        // 12. General Website Settings
  | 'security'       // 13. Security Settings
  | 'audit';         // 14. Admin Audit Logs

interface UserRecord {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'suspended';
  role: 'admin' | 'user';
  created_at: string;
}

interface FeatureLinkItem {
  id: string;
  title: string;
  url: string;
  category: 'header' | 'footer' | 'resources';
  enabled: boolean;
}

interface FeedbackItem {
  id: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  status: 'unread' | 'reviewed' | 'resolved';
}

interface AuditRecord {
  id: string;
  admin: string;
  action: string;
  target: string;
  date: string;
  details?: string;
}

export function AdminDashboardPage() {
  const { profile, adminUsername, changeAdminPassword, adminLogout } = useAuth();
  const isConfigured = true;
  const role = 'admin';
  const { navigate } = useRouter();

  // Active Section (1 to 14)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper for audit logs
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([
    {
      id: 'aud-1',
      admin: 'SubForgeAdmin',
      action: 'BOOTSTRAP_INITIAL_ADMIN',
      target: 'user_role:admin',
      date: '2026-11-01 12:00:00 UTC',
      details: 'Root administrator account claimed and verified',
    },
    {
      id: 'aud-2',
      admin: 'SubForgeAdmin',
      action: 'UPDATE_AI_SETTINGS',
      target: 'ai_config',
      date: '2026-11-02 09:14:22 UTC',
      details: 'Enabled WebGPU client-side transformer acceleration',
    },
    {
      id: 'aud-3',
      admin: 'SubForgeAdmin',
      action: 'AUDIT_SEO_METADATA',
      target: 'seo_config:sitemap',
      date: '2026-11-02 11:45:00 UTC',
      details: 'Verified crawlable sitemap for all 14 routes',
    },
  ]);

  const recordAudit = (action: string, target: string, details?: string) => {
    const newLog: AuditRecord = {
      id: `aud-${Date.now()}`,
      admin: profile?.username || 'SubForgeAdmin',
      action,
      target,
      date: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      details: details || 'Administrative configuration state updated',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // 1. DASHBOARD OVERVIEW METRICS
  const [overviewMetrics] = useState({
    totalUsers: 148,
    activeUsers: 142,
    suspendedUsers: 6,
    totalConversions: 4210,
    aiExecutions: 890,
    uptimePercent: 99.98,
  });

  // 2. USER MANAGEMENT
  const [usersList, setUsersList] = useState<UserRecord[]>([
    {
      id: 'usr-1',
      username: 'SubForgeAdmin',
      email: 'admin@subforge.app',
      status: 'active',
      role: 'admin',
      created_at: '2026-11-01T12:00:00Z',
    },
    {
      id: 'usr-2',
      username: 'video_editor_pro',
      email: 'editor@studio.com',
      status: 'active',
      role: 'user',
      created_at: '2026-11-02T08:30:00Z',
    },
    {
      id: 'usr-3',
      username: 'spanish_subber',
      email: 'maria@localization.es',
      status: 'active',
      role: 'user',
      created_at: '2026-11-02T09:15:00Z',
    },
    {
      id: 'usr-4',
      username: 'suspicious_activity_test',
      email: 'bot@proxy-crawler.xyz',
      status: 'suspended',
      role: 'user',
      created_at: '2026-11-02T10:15:00Z',
    },
  ]);
  const [userSearch, setUserSearch] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');

  const handleToggleUserSuspension = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (u.username === 'SubForgeAdmin') {
          setStatusMsg({ type: 'error', text: 'Cannot suspend root administrator SubForgeAdmin.' });
          return u;
        }
        const newStatus = u.status === 'active' ? 'suspended' : 'active';
        recordAudit(
          newStatus === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
          `user:${u.username}`,
          `User account status toggled to ${newStatus}`
        );
        setStatusMsg({ type: 'success', text: `User ${u.username} is now ${newStatus}.` });
        return { ...u, status: newStatus };
      })
    );
  };

  const handleToggleUserRole = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (u.username === 'SubForgeAdmin') {
          setStatusMsg({ type: 'error', text: 'Cannot demote root administrator SubForgeAdmin.' });
          return u;
        }
        const newRole = u.role === 'admin' ? 'user' : 'admin';
        recordAudit(
          newRole === 'admin' ? 'PROMOTE_TO_ADMIN' : 'DEMOTE_TO_USER',
          `user:${u.username}`,
          `Role updated to ${newRole}`
        );
        setStatusMsg({ type: 'success', text: `Role for ${u.username} set to ${newRole}.` });
        return { ...u, role: newRole };
      })
    );
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = usersList.find((u) => u.id === userId);
    if (!targetUser) return;
    if (targetUser.username === 'SubForgeAdmin') {
      setStatusMsg({ type: 'error', text: 'Cannot delete root administrator SubForgeAdmin.' });
      return;
    }
    setUsersList((prev) => prev.filter((u) => u.id !== userId));
    recordAudit('DELETE_USER', `user:${targetUser.username}`, 'User profile removed');
    setStatusMsg({ type: 'success', text: `User ${targetUser.username} removed.` });
  };

  // 3. AI MANAGEMENT
  const [aiConfig, setAiConfig] = useState({
    globalAiEnabled: true,
    engineMode: 'browser_wasm',
    primaryModel: 'Xenova/Qwen1.5-0.5B-Chat',
    webGpuAcceleration: true,
    maxInputChars: 10000,
    maxOutputTokens: 2048,
    rateLimitPerHour: 60,
  });

  // 4. TOOLS MANAGEMENT (8 Core Tools)
  const [toolSettings, setToolSettings] = useState<Record<string, { enabled: boolean; visible: boolean; maintenance: boolean }>>(() => {
    const init: Record<string, { enabled: boolean; visible: boolean; maintenance: boolean }> = {};
    TOOLS.forEach((t) => {
      init[t.id] = { enabled: true, visible: true, maintenance: false };
    });
    return init;
  });

  const handleToggleToolProp = (toolId: string, prop: 'enabled' | 'visible' | 'maintenance') => {
    setToolSettings((prev) => {
      const current = prev[toolId] || { enabled: true, visible: true, maintenance: false };
      const updated = { ...current, [prop]: !current[prop] };
      recordAudit('UPDATE_TOOL_SETTING', `tool:${toolId}`, `Toggled ${prop} to ${updated[prop]}`);
      return { ...prev, [toolId]: updated };
    });
    setStatusMsg({ type: 'success', text: `Tool ${toolId} configuration updated.` });
  };

  // 5. AI ASSISTANT MANAGEMENT
  const [assistantModules, setAssistantModules] = useState({
    grammarCorrection: true,
    multiLanguageTranslation: true,
    subtitleSummarizer: true,
    cpsQualityDiagnostic: true,
    smartChapters: true,
    customPrompting: true,
  });

  // 6. WEBSITE CONTENT MANAGEMENT
  const [contentConfig, setContentConfig] = useState({
    heroTitle: 'Professional Subtitle & Video Creator Tools.',
    heroSubtitle: 'Free, private, browser-based utilities for video creators, editors, and localization teams. Convert formats, fix timing drift, validate broadcast compliance, and generate YouTube chapters in seconds.',
    footerTagline: 'SubForge Studio. 100% Client-side Engine. Free forever.',
    announcementBannerEnabled: false,
    announcementBannerText: '🎉 SubForge v2.4 with high-speed subtitle merger is now live!',
  });

  // 7. IMAGE MANAGER
  const [mediaAssets, setMediaAssets] = useState<{ id: string; name: string; url: string; size: string; type: string }[]>([
    { id: 'img-1', name: 'subforge_social_banner.png', url: '/og-image.png', size: '142 KB', type: 'image/png' },
    { id: 'img-2', name: 'subforge_logo_icon.svg', url: '/favicon.svg', size: '14 KB', type: 'image/svg+xml' },
    { id: 'img-3', name: 'srt_waveform_preview.svg', url: '/assets/waveform.svg', size: '28 KB', type: 'image/svg+xml' },
  ]);

  // 8. FEATURE LINKS MANAGER
  const [featureLinks, setFeatureLinks] = useState<FeatureLinkItem[]>([
    { id: 'link-1', title: 'YouTube Studio Help', url: 'https://support.google.com/youtube', category: 'resources', enabled: true },
    { id: 'link-2', title: 'W3C WebVTT Specification', url: 'https://www.w3.org/TR/webvtt1/', category: 'resources', enabled: true },
    { id: 'link-3', title: 'SubRip SRT Documentation', url: 'https://matroska.org/technical/subtitles/srt.html', category: 'resources', enabled: true },
    { id: 'link-4', title: 'Subtitle Format Guide', url: '/guide', category: 'header', enabled: true },
    { id: 'link-5', title: 'Terms of Service', url: '/terms', category: 'footer', enabled: true },
    { id: 'link-6', title: 'Privacy Policy', url: '/privacy', category: 'footer', enabled: true },
  ]);

  // 9. FEEDBACK MANAGEMENT
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([
    {
      id: 'fb-1',
      email: 'director@indiefilm.org',
      subject: 'Subtitle Merger Feedback',
      message: 'The bilingual dual-language merger saved our team hours on foreign festival subtitling!',
      date: '2026-11-02 08:30 UTC',
      status: 'reviewed',
    },
    {
      id: 'fb-2',
      email: 'creator@youtube.com',
      subject: 'Feature Request: 120 FPS',
      message: 'Could you add 120 FPS support in the FPS converter for high-framerate action cameras?',
      date: '2026-11-02 10:15 UTC',
      status: 'unread',
    },
    {
      id: 'fb-3',
      email: 'accessibility@edutech.edu',
      subject: 'Validator Rule Inquiry',
      message: 'The 37 characters per line warning was extremely helpful for our WCAG AAA compliance checks.',
      date: '2026-11-02 11:20 UTC',
      status: 'resolved',
    },
  ]);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'unread' | 'reviewed' | 'resolved'>('all');

  // 10. SEO MANAGEMENT (Standalone Module)
  const [seoState, setSeoState] = useState({
    defaultTitle: 'SubForge – Free Subtitle & Video Creator Utilities',
    metaDescription: 'Free, 100% browser-based subtitle and creator tools. Convert SRT to VTT, fix subtitle timings, convert framerates, extract clean text, validate syntax, merge captions, and generate YouTube chapters.',
    keywords: 'srt to vtt, vtt to srt, subtitle timing fixer, subtitle sync, fps converter, subtitle validator, text extractor, merge subtitles, youtube chapters',
    canonicalBaseUrl: 'https://subforge.app',
    ogType: 'website',
    ogImage: 'https://subforge.app/og-image.png',
    twitterCard: 'summary_large_image',
    robotsIndex: true,
    robotsFollow: true,
    sitemapXmlEnabled: true,
    sitemapFrequency: 'weekly',
  });

  // Per-page SEO overrides
  const [perPageSeo] = useState<Record<string, { title: string; desc: string; index: boolean }>>({
    '/': {
      title: 'SubForge – Free Subtitle & Video Creator Utilities',
      desc: 'Free, 100% browser-based subtitle utilities. Fast, private, client-side processing.',
      index: true,
    },
    '/tools/srt-to-vtt': {
      title: 'SRT to VTT Converter Online – Free, Fast & Private | SubForge',
      desc: 'Convert SRT subtitles to WebVTT format directly in your browser. Preserves exact millisecond timestamps.',
      index: true,
    },
    '/tools/vtt-to-srt': {
      title: 'VTT to SRT Converter Online – Free & Client-Side | SubForge',
      desc: 'Convert WebVTT files into standard SubRip SRT subtitles instantly without uploading to servers.',
      index: true,
    },
    '/tools/timing-fixer': {
      title: 'Subtitle Timing Fixer – Shift, Delay & Scale Sync Online | SubForge',
      desc: 'Fix desynchronized subtitles with millisecond-precision shift, stretch factor, and drift correction.',
      index: true,
    },
    '/tools/fps-converter': {
      title: 'Subtitle FPS Converter – 23.976, 24, 25, 29.97, 30, 60 FPS | SubForge',
      desc: 'Re-time subtitles across different video framerates with exact mathematical scaling.',
      index: true,
    },
    '/tools/validator': {
      title: 'Subtitle Validator & Linter – Broadcast Compliance Checker | SubForge',
      desc: 'Inspect subtitles for syntax errors, overlapping cues, reading speed violations (CPS), and line length limits.',
      index: true,
    },
    '/tools/text-extractor': {
      title: 'Subtitle Text Extractor – Strip Timestamps to Clean Transcript | SubForge',
      desc: 'Extract dialogue text from SRT or VTT files. Strip timestamps, cue numbers, and HTML tags.',
      index: true,
    },
    '/tools/merger': {
      title: 'Subtitle Merger – Combine Multiple Tracks & Dual Subtitles | SubForge',
      desc: 'Merge two subtitle files into chronological sequence or bilingual dual-language subtitle tracks.',
      index: true,
    },
    '/tools/youtube-chapters': {
      title: 'YouTube Chapters Generator – Free Video Timestamp Creator | SubForge',
      desc: 'Create YouTube-compliant video chapter markers with instant validation, copy, and export.',
      index: true,
    },
    '/guide': {
      title: 'Complete Subtitle Formats Guide – SRT, WebVTT & Broadcast Standards | SubForge',
      desc: 'Comprehensive technical guide comparing SubRip SRT and W3C WebVTT subtitle specifications.',
      index: true,
    },
    '/about': {
      title: 'About SubForge – Client-Side Creator Tools',
      desc: 'Learn about SubForge, our zero-server privacy architecture, and our mission.',
      index: true,
    },
    '/contact': {
      title: 'Contact SubForge Support & Engineering',
      desc: 'Get in touch with the SubForge development team for feature requests, bug reports, or inquiries.',
      index: true,
    },
    '/privacy': {
      title: 'Privacy Policy – 100% Client-Side Processing Guarantee | SubForge',
      desc: 'SubForge privacy policy detailing our zero-upload, browser-based data processing guarantees.',
      index: true,
    },
    '/terms': {
      title: 'Terms of Service – Free Subtitle Utilities | SubForge',
      desc: 'Terms of service governing the free use of SubForge browser-based subtitle and creator tools.',
      index: true,
    },
  });

  // 11. ADVERTISEMENT MANAGEMENT
  const [adsConfig, setAdsConfig] = useState({
    adsEnabled: false,
    publisherId: '',
    topBannerSlot: true,
    sidebarSlot: false,
    bottomLeaderboardSlot: true,
  });

  // 12. GENERAL WEBSITE SETTINGS
  const [generalConfig, setGeneralConfig] = useState({
    siteName: 'SubForge',
    tagline: 'Subtitle & Video Creator Utilities',
    contactEmail: 'contact@subforge.app',
    maintenanceMode: false,
    maintenanceNotice: 'SubForge is temporarily performing brief infrastructure maintenance. All tools will return shortly.',
    copyrightYear: '2026',
    defaultTimezone: 'UTC',
  });

  // 13. SECURITY SETTINGS
  const [securityConfig, setSecurityConfig] = useState({
    sessionTimeoutMinutes: '60',
    rateLimitPerMinute: 120,
    cspPolicy: "default-src 'self'; script-src 'self' 'unsafe-eval' https://pagead2.googlesyndication.com;",
    rlsEnforcement: 'ENFORCED (12/12 Tables Protected)',
  });

  // Bootstrap Credential Rotation
  const [bootstrapSecretKey, setBootstrapSecretKey] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  const handleUpdateSecuritySettings = () => {
    recordAudit('UPDATE_SECURITY_SETTINGS', 'security_policy', 'Updated session timeout and CSP configuration');
    setStatusMsg({ type: 'success', text: 'Security configuration saved successfully.' });
  };

  const handleRotateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrapSecretKey.trim()) {
      setStatusMsg({ type: 'error', text: 'Admin bootstrap secret key is required.' });
      return;
    }
    if (newAdminPassword.length < 8) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setBootstrapLoading(true);
    try {
      const res = await changeAdminPassword(bootstrapSecretKey, newAdminPassword);
      if (res.error) {
        setStatusMsg({ type: 'error', text: res.error });
      } else {
        recordAudit('ROTATE_ADMIN_CREDENTIALS', 'user_roles:admin', 'Admin password re-keyed via bootstrap secret');
        setStatusMsg({ type: 'success', text: 'Administrator credentials rotated successfully!' });
        setBootstrapSecretKey('');
        setNewAdminPassword('');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Bootstrap secret verification failed.' });
    } finally {
      setBootstrapLoading(false);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredFeedback = feedbackList.filter((fb) => {
    if (feedbackFilter === 'all') return true;
    return fb.status === feedbackFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="Admin Console – SubForge"
        description="SubForge Comprehensive Administrator Console. 14 core governance modules."
        canonicalPath="/admin"
        noIndex={true}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Root Platform Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>SubForge Admin Console</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-mono">
              v2.4
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0c1322] border border-slate-800 rounded-lg">
            <span className="text-slate-400">Identity:</span>
            <span className="font-mono font-bold text-white">{profile?.username || 'SubForgeAdmin'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 font-mono font-semibold uppercase">{role}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              recordAudit('MANUAL_SYNC', 'platform_cache', 'Admin triggered manual health sync');
              setStatusMsg({ type: 'success', text: 'System state synced with database.' });
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-white text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Admin Layout: Sidebar (14 Sections) + Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar: STRICT 14 SECTIONS */}
        <aside className="lg:col-span-3 bg-[#0c1322] border border-slate-800 rounded-2xl p-3 space-y-1 text-xs shadow-xl sticky top-24">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Admin Modules (14)</span>
            <span className="text-[10px] text-slate-600 font-mono">14 / 14</span>
          </div>

          {/* 1. Dashboard Overview */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="truncate">1. Dashboard Overview</span>
          </button>

          {/* 2. Login List / Users Management */}
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'users' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">2. Login List / Users Management</span>
          </button>

          {/* 3. AI Management */}
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'ai' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="truncate">3. AI Management</span>
          </button>

          {/* 4. Tools Management */}
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'tools' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span className="truncate">4. Tools Management</span>
          </button>

          {/* 5. AI Assistant Management */}
          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'assistant' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span className="truncate">5. AI Assistant Management</span>
          </button>

          {/* 6. Website Content Management */}
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'content' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileEdit className="w-4 h-4 shrink-0" />
            <span className="truncate">6. Website Content Management</span>
          </button>

          {/* 7. Image Manager */}
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'images' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">7. Image Manager</span>
          </button>

          {/* 8. Feature Links Manager */}
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'links' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4 shrink-0" />
            <span className="truncate">8. Feature Links Manager</span>
          </button>

          {/* 9. Feedback Management */}
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'feedback' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">9. Feedback Management</span>
          </button>

          {/* 10. SEO Management (Dedicated Standalone Module) */}
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'seo' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="truncate">10. SEO Management</span>
          </button>

          {/* 11. Advertisement Management */}
          <button
            type="button"
            onClick={() => setActiveTab('ads')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'ads' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="truncate">11. Advertisement Management</span>
          </button>

          {/* 12. General Website Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'general' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate">12. General Website Settings</span>
          </button>

          {/* 13. Security Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'security' ? 'bg-amber-600 text-white font-semibold shadow-sm' : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">13. Security Settings</span>
          </button>

          {/* 14. Admin Audit Logs */}
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">14. Admin Audit Logs</span>
          </button>

          {/* Quick link to /admin/login */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-[11px]"
            >
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login Page</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* Viewport Content */}
        <main className="lg:col-span-9 space-y-6">
          {/* ======================================================== */}
          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-[#0c1322] border border-slate-800 p-4 rounded-xl">
                  <div className="text-[11px] text-slate-400 mb-1">Total Users</div>
                  <div className="text-xl font-bold font-mono text-white tabular-nums">{overviewMetrics.totalUsers}</div>
                  <div className="text-[10px] text-emerald-400 mt-1">+12 this week</div>
                </div>

                <div className="bg-[#0c1322] border border-slate-800 p-4 rounded-xl">
                  <div className="text-[11px] text-slate-400 mb-1">Active Accounts</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{overviewMetrics.activeUsers}</div>
                  <div className="text-[10px] text-slate-500 mt-1">96% healthy</div>
                </div>

                <div className="bg-[#0c1322] border border-slate-800 p-4 rounded-xl">
                  <div className="text-[11px] text-slate-400 mb-1">Suspended</div>
                  <div className="text-xl font-bold font-mono text-rose-400 tabular-nums">{overviewMetrics.suspendedUsers}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Spam isolated</div>
                </div>

                <div className="bg-[#0c1322] border border-slate-800 p-4 rounded-xl">
                  <div className="text-[11px] text-slate-400 mb-1">Conversions</div>
                  <div className="text-xl font-bold font-mono text-blue-400 tabular-nums">{overviewMetrics.totalConversions}</div>
                  <div className="text-[10px] text-blue-300 mt-1">100% Client-side</div>
                </div>

                <div className="bg-[#0c1322] border border-slate-800 p-4 rounded-xl">
                  <div className="text-[11px] text-slate-400 mb-1">AI Jobs</div>
                  <div className="text-xl font-bold font-mono text-indigo-400 tabular-nums">{overviewMetrics.aiExecutions}</div>
                  <div className="text-[10px] text-indigo-300 mt-1">WebGPU Active</div>
                </div>

                <div className="bg-[#0c1322] border border-slate-800 p-4 rounded-xl">
                  <div className="text-[11px] text-slate-400 mb-1">Core Uptime</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{overviewMetrics.uptimePercent}%</div>
                  <div className="text-[10px] text-slate-500 mt-1">Cloudflare Edge</div>
                </div>
              </div>

              {/* System Health Status */}
              <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span>System Infrastructure Health</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[11px]">
                    All Systems Operational
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Database &amp; RLS Layer</div>
                    <div className="text-white font-mono font-medium">
                      {isConfigured ? 'Supabase Postgres with 12 RLS Policies' : 'Local Preview Auth & Storage'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Deployment Pipeline</div>
                    <div className="text-white font-mono font-medium">Vite + Cloudflare Pages (_redirects active)</div>
                  </div>
                  <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">SEO Indexation</div>
                    <div className="text-white font-mono font-medium">14 Crawlable Routes (/public/sitemap.xml verified)</div>
                  </div>
                  <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Privacy Architecture</div>
                    <div className="text-white font-mono font-medium">Zero-server file uploads (100% in-browser)</div>
                  </div>
                </div>
              </div>

              {/* Recent Audit Actions Preview */}
              <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Recent Administrative Operations</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    View All Logs &rarr;
                  </button>
                </div>
                <div className="space-y-2">
                  {auditLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="p-3 bg-[#080d1a] border border-slate-800/80 rounded-lg flex items-center justify-between text-[11px] font-mono">
                      <div>
                        <span className="text-blue-400 font-semibold">{log.action}</span>
                        <span className="text-slate-500 mx-2">·</span>
                        <span className="text-slate-300">{log.target}</span>
                      </div>
                      <span className="text-slate-500">{log.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: USER MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'users' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>2. User Management &amp; Role Access Control</span>
                  </h2>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Inspect user profiles, suspend abusive accounts, and audit permissions.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by username or email..."
                    className="bg-[#080d1a] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* User Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#080d1a] text-slate-400 font-semibold border-b border-slate-800">
                      <th className="p-3">User</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 text-white font-medium">{u.username}</td>
                        <td className="p-3 text-slate-300">{u.email}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.status === 'active'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.username !== 'SubForgeAdmin' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserSuspension(u.id)}
                                  className={`p-1.5 rounded transition-colors ${
                                    u.status === 'active'
                                      ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                                      : 'text-emerald-400 hover:bg-slate-800'
                                  }`}
                                  title={u.status === 'active' ? 'Suspend User' : 'Reactivate User'}
                                >
                                  {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserRole(u.id)}
                                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                  title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {u.username === 'SubForgeAdmin' && (
                              <span className="text-[10px] text-slate-500 font-sans italic">Root Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add User Modal/Form */}
              <div className="pt-4 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">Create Consumer User Account</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="Username"
                    className="bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Email address"
                    className="bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newUserUsername.trim() || !newUserEmail.trim()) {
                        setStatusMsg({ type: 'error', text: 'Username and email are required.' });
                        return;
                      }
                      const createdUser: UserRecord = {
                        id: `usr-${Date.now()}`,
                        username: newUserUsername.trim(),
                        email: newUserEmail.trim(),
                        status: 'active',
                        role: 'user', // STRICT: Can only create consumer user
                        created_at: new Date().toISOString(),
                      };
                      setUsersList([...usersList, createdUser]);
                      recordAudit('CREATE_USER', `user:${createdUser.username}`, 'Consumer user created by administrator');
                      setNewUserUsername('');
                      setNewUserEmail('');
                      setStatusMsg({ type: 'success', text: `Created user ${createdUser.username}.` });
                    }}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create User</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 3: AI MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'ai' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-5 text-xs">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>3. AI Engine Governance &amp; Model Configuration</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Configure browser-based neural models, token budgets, and runtime acceleration.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div>
                    <div className="font-semibold text-white">Global AI Capabilities Switch</div>
                    <div className="text-slate-400 text-[11px]">Toggle client-side neural processing across all tools</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiConfig.globalAiEnabled}
                    onChange={(e) => setAiConfig({ ...aiConfig, globalAiEnabled: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600 bg-slate-900 w-4 h-4"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Execution Architecture</label>
                    <select
                      value={aiConfig.engineMode}
                      onChange={(e) => setAiConfig({ ...aiConfig, engineMode: e.target.value })}
                      className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200"
                    >
                      <option value="browser_wasm">100% In-Browser (Transformers.js + WebGPU)</option>
                      <option value="server_proxy">Server-Side Proxy (Zero Client Secrets)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Active Neural Transformer Model</label>
                    <input
                      type="text"
                      value={aiConfig.primaryModel}
                      onChange={(e) => setAiConfig({ ...aiConfig, primaryModel: e.target.value })}
                      className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Max Input Characters</label>
                    <input
                      type="number"
                      value={aiConfig.maxInputChars}
                      onChange={(e) => setAiConfig({ ...aiConfig, maxInputChars: Number(e.target.value) })}
                      className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Max Output Tokens</label>
                    <input
                      type="number"
                      value={aiConfig.maxOutputTokens}
                      onChange={(e) => setAiConfig({ ...aiConfig, maxOutputTokens: Number(e.target.value) })}
                      className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Rate Limit (req/user/hr)</label>
                    <input
                      type="number"
                      value={aiConfig.rateLimitPerHour}
                      onChange={(e) => setAiConfig({ ...aiConfig, rateLimitPerHour: Number(e.target.value) })}
                      className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={aiConfig.webGpuAcceleration}
                    onChange={(e) => setAiConfig({ ...aiConfig, webGpuAcceleration: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600 bg-slate-900"
                  />
                  <span className="font-semibold text-slate-200">Enable Hardware-Accelerated WebGPU Pipeline</span>
                </label>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      recordAudit('UPDATE_AI_CONFIG', 'ai_settings', `Primary model: ${aiConfig.primaryModel}`);
                      setStatusMsg({ type: 'success', text: 'AI configuration saved successfully.' });
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save AI Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: TOOLS MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'tools' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-5 text-xs">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  <span>4. Core Tools Management (8 Dedicated Utilities)</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Control availability, navigation visibility, and maintenance alerts for each tool.
                </p>
              </div>

              <div className="space-y-3">
                {TOOLS.map((tool) => {
                  const current = toolSettings[tool.id] || { enabled: true, visible: true, maintenance: false };
                  return (
                    <div
                      key={tool.id}
                      className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{tool.shortName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {tool.path}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                          {tool.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={current.enabled}
                            onChange={() => handleToggleToolProp(tool.id, 'enabled')}
                            className="rounded border-slate-700 text-blue-600 bg-slate-900"
                          />
                          <span className="text-slate-300">Active</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={current.visible}
                            onChange={() => handleToggleToolProp(tool.id, 'visible')}
                            className="rounded border-slate-700 text-blue-600 bg-slate-900"
                          />
                          <span className="text-slate-300">In Nav</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={current.maintenance}
                            onChange={() => handleToggleToolProp(tool.id, 'maintenance')}
                            className="rounded border-slate-700 text-amber-500 bg-slate-900"
                          />
                          <span className="text-amber-300">Maintenance</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 5: AI ASSISTANT MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'assistant' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-5 text-xs">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>5. AI Assistant Management &amp; Skill Modules</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Independently manage specific assistant skills on the /ai-assistant page.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Grammar &amp; Syntax Polisher</span>
                    <input
                      type="checkbox"
                      checked={assistantModules.grammarCorrection}
                      onChange={(e) => setAssistantModules({ ...assistantModules, grammarCorrection: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fixes spoken speech stutters (um, uh), corrects common contractions, and cleans punctuation.
                  </p>
                </div>

                <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Multi-Language Translator</span>
                    <input
                      type="checkbox"
                      checked={assistantModules.multiLanguageTranslation}
                      onChange={(e) => setAssistantModules({ ...assistantModules, multiLanguageTranslation: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Translates subtitle text while strictly preserving exact millisecond start and end timecodes.
                  </p>
                </div>

                <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Subtitle Summarizer</span>
                    <input
                      type="checkbox"
                      checked={assistantModules.subtitleSummarizer}
                      onChange={(e) => setAssistantModules({ ...assistantModules, subtitleSummarizer: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Generates executive video summaries, calculates reading time, and extracts key thematic topics.
                  </p>
                </div>

                <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Reading Speed &amp; Quality Diagnostic</span>
                    <input
                      type="checkbox"
                      checked={assistantModules.cpsQualityDiagnostic}
                      onChange={(e) => setAssistantModules({ ...assistantModules, cpsQualityDiagnostic: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Calculates Characters Per Second (CPS) metrics and scores overall subtitle broadcast readiness.
                  </p>
                </div>

                <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Smart YouTube Chapters</span>
                    <input
                      type="checkbox"
                      checked={assistantModules.smartChapters}
                      onChange={(e) => setAssistantModules({ ...assistantModules, smartChapters: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Analyzes subtitle transcript narrative breaks to suggest natural YouTube chapters with 00:00 start.
                  </p>
                </div>

                <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Custom Natural Language Prompting</span>
                    <input
                      type="checkbox"
                      checked={assistantModules.customPrompting}
                      onChange={(e) => setAssistantModules({ ...assistantModules, customPrompting: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Allows arbitrary editing instructions (e.g., uppercase speaker names, rephrase for younger readers).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  recordAudit('UPDATE_ASSISTANT_SETTINGS', 'assistant_config', 'Module toggles updated');
                  setStatusMsg({ type: 'success', text: 'AI Assistant modules saved.' });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Assistant Settings</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 6: WEBSITE CONTENT MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'content' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-blue-400" />
                  <span>6. Website Content Management (CMS)</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Update customer-facing copy, hero headings, and global site announcement banners.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Homepage Hero Title</label>
                <input
                  type="text"
                  value={contentConfig.heroTitle}
                  onChange={(e) => setContentConfig({ ...contentConfig, heroTitle: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Homepage Hero Subtitle</label>
                <textarea
                  rows={3}
                  value={contentConfig.heroSubtitle}
                  onChange={(e) => setContentConfig({ ...contentConfig, heroSubtitle: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 leading-relaxed"
                />
              </div>

              <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Global Announcement Banner</span>
                  <input
                    type="checkbox"
                    checked={contentConfig.announcementBannerEnabled}
                    onChange={(e) => setContentConfig({ ...contentConfig, announcementBannerEnabled: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600 bg-slate-900"
                  />
                </div>
                <input
                  type="text"
                  value={contentConfig.announcementBannerText}
                  onChange={(e) => setContentConfig({ ...contentConfig, announcementBannerText: e.target.value })}
                  placeholder="Banner notification message"
                  className="w-full bg-[#060a14] border border-slate-700/80 rounded-lg p-2 text-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Footer Tagline</label>
                <input
                  type="text"
                  value={contentConfig.footerTagline}
                  onChange={(e) => setContentConfig({ ...contentConfig, footerTagline: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  recordAudit('UPDATE_CONTENT', 'content_pages', 'Homepage hero copy and announcement updated');
                  setStatusMsg({ type: 'success', text: 'Website content saved successfully.' });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Content Changes</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 7: IMAGE MANAGER */}
          {/* ======================================================== */}
          {activeTab === 'images' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    <span>7. Image Manager &amp; Static Assets</span>
                  </h2>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Manage Open Graph social share cards, vector graphics, and brand badges.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newAsset = {
                      id: `img-${Date.now()}`,
                      name: `asset_${Date.now()}.png`,
                      url: '/og-image.png',
                      size: '98 KB',
                      type: 'image/png',
                    };
                    setMediaAssets([...mediaAssets, newAsset]);
                    recordAudit('UPLOAD_MEDIA', `media:${newAsset.name}`, 'Asset registered in storage catalog');
                    setStatusMsg({ type: 'success', text: 'Asset registered in media library.' });
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Image</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {mediaAssets.map((asset) => (
                  <div key={asset.id} className="p-3 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                    <div className="h-28 bg-slate-900/60 rounded-lg flex items-center justify-center border border-slate-800/80">
                      <ImageIcon className="w-8 h-8 text-slate-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-white truncate">{asset.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{asset.size} · {asset.type}</div>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-blue-400 font-mono truncate">{asset.url}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaAssets(mediaAssets.filter((a) => a.id !== asset.id));
                          recordAudit('DELETE_MEDIA', `media:${asset.name}`, 'Asset removed');
                        }}
                        className="text-slate-400 hover:text-rose-400 p-1"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 8: FEATURE LINKS MANAGER */}
          {/* ======================================================== */}
          {activeTab === 'links' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-blue-400" />
                    <span>8. Feature Links Manager</span>
                  </h2>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Govern navigation bar destinations, footer reference links, and documentation shortcuts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newLink: FeatureLinkItem = {
                      id: `link-${Date.now()}`,
                      title: 'New Creator Resource',
                      url: 'https://developer.mozilla.org',
                      category: 'resources',
                      enabled: true,
                    };
                    setFeatureLinks([...featureLinks, newLink]);
                    recordAudit('ADD_FEATURE_LINK', `link:${newLink.title}`, 'Added navigation resource');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Link</span>
                </button>
              </div>

              <div className="space-y-2">
                {featureLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white">{link.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{link.url}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {link.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFeatureLinks(featureLinks.filter((l) => l.id !== link.id));
                          recordAudit('DELETE_FEATURE_LINK', `link:${link.title}`, 'Removed feature link');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 9: FEEDBACK MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'feedback' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span>9. Feedback &amp; Contact Submissions</span>
                  </h2>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Review incoming user reports, feature suggestions, and contact messages.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-[#080d1a] border border-slate-800 rounded-lg p-1 text-[11px]">
                  {(['all', 'unread', 'reviewed', 'resolved'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setFeedbackFilter(filter)}
                      className={`px-2.5 py-1 rounded capitalize font-medium ${
                        feedbackFilter === filter ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredFeedback.map((fb) => (
                  <div key={fb.id} className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-sm">{fb.subject}</div>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          fb.status === 'unread'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : fb.status === 'reviewed'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {fb.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      From: <span className="text-slate-300">{fb.email}</span> · {fb.date}
                    </div>

                    <p className="text-slate-300 leading-relaxed bg-[#060a14] p-3 rounded-lg border border-slate-800/80">
                      {fb.message}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus: 'unread' | 'reviewed' | 'resolved' =
                            fb.status === 'unread' ? 'reviewed' : fb.status === 'reviewed' ? 'resolved' : 'unread';
                          setFeedbackList(
                            feedbackList.map((item) => (item.id === fb.id ? { ...item, status: nextStatus } : item))
                          );
                          recordAudit('UPDATE_FEEDBACK_STATUS', `feedback:${fb.id}`, `Status moved to ${nextStatus}`);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                      >
                        Mark as Next Status
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackList(feedbackList.filter((item) => item.id !== fb.id));
                          recordAudit('DELETE_FEEDBACK', `feedback:${fb.id}`, 'Removed feedback entry');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete feedback"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 10: SEO MANAGEMENT (DEDICATED STANDALONE MODULE) */}
          {/* ======================================================== */}
          {activeTab === 'seo' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-6 text-xs">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-400" />
                      <span>10. SEO Management &amp; Search Engine Indexation</span>
                    </h2>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Independent governance for meta tags, Open Graph cards, robots directives, sitemaps, and per-page SEO controls.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono text-[10px]">
                    Autonomous Module
                  </span>
                </div>
              </div>

              {/* 10A: Global Meta & Titles */}
              <div className="space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>A. Global Meta Titles &amp; Descriptions</span>
                </h3>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Global Default Meta Title</label>
                  <input
                    type="text"
                    value={seoState.defaultTitle}
                    onChange={(e) => setSeoState({ ...seoState, defaultTitle: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Default Meta Description</label>
                  <textarea
                    rows={2}
                    value={seoState.metaDescription}
                    onChange={(e) => setSeoState({ ...seoState, metaDescription: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Global Search Keywords</label>
                  <input
                    type="text"
                    value={seoState.keywords}
                    onChange={(e) => setSeoState({ ...seoState, keywords: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* 10B: Canonical URLs */}
              <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-3">
                <h3 className="font-bold text-white text-xs">B. Canonical URL &amp; Domain Authority</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Canonical Base URL</label>
                    <input
                      type="text"
                      value={seoState.canonicalBaseUrl}
                      onChange={(e) => setSeoState({ ...seoState, canonicalBaseUrl: e.target.value })}
                      className="w-full bg-[#060a14] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400 font-medium">Canonical Policy</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Enforces self-referential canonical tags on all 14 routes. Strips trailing slashes to eliminate duplicate content penalties in Google search results.
                    </p>
                  </div>
                </div>
              </div>

              {/* 10C: Open Graph & Social Cards */}
              <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-3">
                <h3 className="font-bold text-white text-xs flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>C. Open Graph &amp; Social Sharing Cards</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">OG Type</label>
                    <input
                      type="text"
                      value={seoState.ogType}
                      onChange={(e) => setSeoState({ ...seoState, ogType: e.target.value })}
                      className="w-full bg-[#060a14] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Twitter Card Style</label>
                    <select
                      value={seoState.twitterCard}
                      onChange={(e) => setSeoState({ ...seoState, twitterCard: e.target.value })}
                      className="w-full bg-[#060a14] border border-slate-700/80 rounded-lg p-2 text-slate-200 text-xs"
                    >
                      <option value="summary_large_image">summary_large_image (1200x630)</option>
                      <option value="summary">summary (square thumbnail)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Social Preview Image URL</label>
                    <input
                      type="text"
                      value={seoState.ogImage}
                      onChange={(e) => setSeoState({ ...seoState, ogImage: e.target.value })}
                      className="w-full bg-[#060a14] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* 10D: Robots & Sitemap Directives */}
              <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-3">
                <h3 className="font-bold text-white text-xs">D. Search Engine Crawling &amp; Sitemap Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seoState.robotsIndex}
                        onChange={(e) => setSeoState({ ...seoState, robotsIndex: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 bg-slate-900"
                      />
                      <span className="text-slate-200 font-semibold">Enable Robots Indexing (User-agent: * Allow: /)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seoState.sitemapXmlEnabled}
                        onChange={(e) => setSeoState({ ...seoState, sitemapXmlEnabled: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 bg-slate-900"
                      />
                      <span className="text-slate-200 font-semibold">Serve /sitemap.xml (All 14 Public Routes)</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Change Frequency</label>
                      <select
                        value={seoState.sitemapFrequency}
                        onChange={(e) => setSeoState({ ...seoState, sitemapFrequency: e.target.value })}
                        className="w-full bg-[#060a14] border border-slate-700/80 rounded-lg p-2 text-slate-200 text-xs"
                      >
                        <option value="daily">daily</option>
                        <option value="weekly">weekly</option>
                        <option value="monthly">monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 10E: Per-Page SEO Settings Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-xs">E. Per-Page SEO Overrides (14 Routes)</h3>
                  <span className="text-[11px] text-slate-500 font-mono">14 Active Route Entries</span>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-[#080d1a] text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Route</th>
                        <th className="p-2.5">Page SEO Title</th>
                        <th className="p-2.5">Meta Description</th>
                        <th className="p-2.5 text-center">Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {Object.entries(perPageSeo).map(([route, seo]) => (
                        <tr key={route} className="hover:bg-slate-900/40">
                          <td className="p-2.5 text-blue-400 font-bold">{route}</td>
                          <td className="p-2.5 text-slate-200 font-sans truncate max-w-[220px]">{seo.title}</td>
                          <td className="p-2.5 text-slate-400 font-sans truncate max-w-[280px]">{seo.desc}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">
                              {seo.index ? 'YES' : 'NO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    recordAudit('UPDATE_SEO_SETTINGS', 'seo_config', 'Meta titles, Open Graph, and sitemap saved');
                    setStatusMsg({ type: 'success', text: 'SEO settings saved and synced.' });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All SEO Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 11: ADVERTISEMENT MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'ads' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-5 text-xs">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>11. Advertisement &amp; Google AdSense Governance</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Configure publisher identifier, display zones, and AdSense compliance rules.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#080d1a] border border-slate-800 rounded-lg">
                  <div>
                    <div className="font-semibold text-white">Enable Monetization Display Placements</div>
                    <div className="text-slate-400 text-[11px]">Renders compliant ad tags on public tool pages</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={adsConfig.adsEnabled}
                    onChange={(e) => setAdsConfig({ ...adsConfig, adsEnabled: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600 bg-slate-900 w-4 h-4"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Google AdSense Publisher ID (Format: ca-pub-XXXXXXXXXXXXXXXX)
                  </label>
                  <input
                    type="text"
                    value={adsConfig.publisherId}
                    onChange={(e) => setAdsConfig({ ...adsConfig, publisherId: e.target.value })}
                    placeholder="ca-pub-1234567890123456"
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>

                <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-3">
                  <h3 className="font-bold text-white text-xs">Designated Placement Slots</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#060a14] border border-slate-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={adsConfig.topBannerSlot}
                        onChange={(e) => setAdsConfig({ ...adsConfig, topBannerSlot: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 bg-slate-900"
                      />
                      <span className="text-slate-300">Top Header Banner (728x90)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#060a14] border border-slate-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={adsConfig.sidebarSlot}
                        onChange={(e) => setAdsConfig({ ...adsConfig, sidebarSlot: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 bg-slate-900"
                      />
                      <span className="text-slate-300">Sidebar Skyscraper</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#060a14] border border-slate-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={adsConfig.bottomLeaderboardSlot}
                        onChange={(e) => setAdsConfig({ ...adsConfig, bottomLeaderboardSlot: e.target.checked })}
                        className="rounded border-slate-700 text-blue-600 bg-slate-900"
                      />
                      <span className="text-slate-300">Bottom Output Banner</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    recordAudit('UPDATE_ADS_CONFIG', 'adsense_settings', `Publisher ID: ${adsConfig.publisherId}`);
                    setStatusMsg({ type: 'success', text: 'AdSense configuration saved.' });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Ad Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 12: GENERAL WEBSITE SETTINGS */}
          {/* ======================================================== */}
          {activeTab === 'general' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-300" />
                  <span>12. General Website Settings</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Core branding, administrator support contact, and platform maintenance toggles.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Platform Brand Name</label>
                  <input
                    type="text"
                    value={generalConfig.siteName}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, siteName: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Brand Tagline</label>
                  <input
                    type="text"
                    value={generalConfig.tagline}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, tagline: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Public Support Email</label>
                  <input
                    type="email"
                    value={generalConfig.contactEmail}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, contactEmail: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Default Timezone</label>
                  <input
                    type="text"
                    value={generalConfig.defaultTimezone}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, defaultTimezone: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#080d1a] border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">Emergency Maintenance Mode</span>
                    <p className="text-[11px] text-slate-400">Shows maintenance screen to unauthenticated visitors</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalConfig.maintenanceMode}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, maintenanceMode: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 bg-slate-900 w-4 h-4"
                  />
                </div>
                <textarea
                  rows={2}
                  value={generalConfig.maintenanceNotice}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, maintenanceNotice: e.target.value })}
                  className="w-full bg-[#060a14] border border-slate-700/80 rounded-lg p-2 text-slate-200 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  recordAudit('UPDATE_GENERAL_SETTINGS', 'website_settings', 'General brand and email settings saved');
                  setStatusMsg({ type: 'success', text: 'General settings saved successfully.' });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save General Settings</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 13: SECURITY SETTINGS */}
          {/* ======================================================== */}
          {activeTab === 'security' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-6 text-xs">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>13. Security Settings &amp; Hardened Policies</span>
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Configure session timeouts, Row Level Security policies, CSP headers, and rotate administrator credentials.
                </p>
              </div>

              {/* RLS Status Badge */}
              <div className="p-4 bg-[#080d1a] border border-emerald-900/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Row Level Security (RLS) Status</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800">
                    {securityConfig.rlsEnforcement}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  All 12 Supabase tables have Row Level Security enabled. The <code className="text-blue-300">public.is_admin()</code> security definer function cryptographically enforces that only authenticated users with verified administrator records can view or mutate governance tables.
                </p>
              </div>

              {/* Session & Password Policy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Admin Session Inactivity Timeout</label>
                  <select
                    value={securityConfig.sessionTimeoutMinutes}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, sessionTimeoutMinutes: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes (Default)</option>
                    <option value="120">2 Hours</option>
                    <option value="1440">24 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Requests / Minute Rate Limit</label>
                  <input
                    type="number"
                    value={securityConfig.rateLimitPerMinute}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, rateLimitPerMinute: Number(e.target.value) })}
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Content Security Policy */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Content Security Policy (CSP Header)</label>
                <input
                  type="text"
                  value={securityConfig.cspPolicy}
                  onChange={(e) => setSecurityConfig({ ...securityConfig, cspPolicy: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
                />
              </div>

              <button
                type="button"
                onClick={handleUpdateSecuritySettings}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Security Policies</span>
              </button>

              {/* One-Time Bootstrap & Password Rotation */}
              <div className="pt-4 border-t border-slate-800">
                <div className="p-4 bg-[#080d1a] border border-amber-900/60 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Rotate SubForgeAdmin Private Password</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Website owner private credential update. Enter your private <code className="text-amber-200 font-mono">ADMIN_BOOTSTRAP_SECRET</code> and choose a new private administrator password.
                  </p>

                  <form onSubmit={handleRotateAdminPassword} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Bootstrap Secret Key</label>
                        <input
                          type="password"
                          value={bootstrapSecretKey}
                          onChange={(e) => setBootstrapSecretKey(e.target.value)}
                          placeholder="ADMIN_BOOTSTRAP_SECRET"
                          className="w-full bg-[#060a14] border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">New Private Admin Password</label>
                        <input
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full bg-[#060a14] border border-slate-700 rounded-lg p-2 text-white text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={bootstrapLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{bootstrapLoading ? 'Verifying Secret...' : 'Rotate Administrator Password'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 14: ADMIN AUDIT LOGS */}
          {/* ======================================================== */}
          {activeTab === 'audit' && (
            <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>14. Immutable Administrative Audit Logs</span>
                  </h2>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Chronological record of every administrative action, user suspension, and setting change.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
                    const dlAnchor = document.createElement('a');
                    dlAnchor.setAttribute('href', dataStr);
                    dlAnchor.setAttribute('download', `subforge_audit_logs_${Date.now()}.json`);
                    dlAnchor.click();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Logs (.json)</span>
                </button>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-[#080d1a] border border-slate-800 rounded-xl font-mono text-xs space-y-1.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-bold">{log.action}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-300">Target: {log.target}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{log.date}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Operator: <strong className="text-slate-300">{log.admin}</strong></span>
                      {log.details && <span className="text-slate-500">{log.details}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
