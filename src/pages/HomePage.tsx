import { useState, useMemo } from 'react';
import { Link } from '../context/RouterContext';
import { SEOHead } from '../components/layout/SEOHead';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { TOOLS } from '../utils/seoData';
import {
  FileCode2,
  FileText,
  Clock,
  FastForward,
  ShieldAlert,
  FileSpreadsheet,
  Layers,
  Video,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Search,
} from 'lucide-react';
import heroBgImage from '../assets/hero-bg.jpg';

const ICON_MAP: Record<string, any> = {
  FileCode2,
  FileText,
  Clock,
  FastForward,
  ShieldAlert,
  FileSpreadsheet,
  Layers,
  Video,
};

const HOME_FAQS = [
  {
    question: 'Are subtitle files uploaded to a remote server?',
    answer: 'No. All subtitle conversions, timing adjustments, text extractions, and validations happen 100% locally in your web browser using client-side JavaScript. Your files never touch a remote server, ensuring total confidentiality for unreleased films, corporate training, and private videos.',
  },
  {
    question: 'Which subtitle formats are supported?',
    answer: 'SubForge natively supports SubRip (.srt), WebVTT (.vtt), and plain text (.txt) subtitle files. You can convert between them, shift timings, convert framerates, merge files, and generate YouTube video chapters.',
  },
  {
    question: 'Is SubForge completely free to use?',
    answer: 'Yes, SubForge is 100% free with no account registration, no credit cards, no monthly subscription fees, and no file quantity or size restrictions.',
  },
  {
    question: 'How do I fix subtitles that gradually drift out of sync?',
    answer: 'Gradual drift is typically caused by a video framerate mismatch (for instance, a 23.976 fps film release converted to 25 fps PAL television). Use our Subtitle FPS Converter tool to mathematically adjust the subtitle speed, or use the Timing Fixer drift slider.',
  },
];

export function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEOHead
        title="SubForge – Free Subtitle & Video Creator Utilities"
        description="Free, 100% browser-based subtitle and creator tools. Convert SRT to VTT, fix subtitle timings, convert framerates, extract clean text, validate syntax, merge captions, and generate YouTube chapters."
        canonicalPath="/"
        faqs={HOME_FAQS}
      />

      {/* Hero Section Container */}
      <section
        id="hero-section"
        className="relative text-center max-w-4xl mx-auto pt-8 sm:pt-12 pb-10 sm:pb-14 px-4 sm:px-8 rounded-3xl overflow-hidden border border-purple-500/40 mb-10"
        style={{
          backgroundImage: `url("${heroBgImage}"), url('/assets/aistudio/images__4__f49af4e7.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative">
          {/* Unboxed Metadata & Trust Kicker */}
          <div
            className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-200 mb-3 sm:mb-4 animate-hero-kicker motion-reduce:animate-none"
            style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.95), 0 4px 12px rgba(0, 0, 0, 0.85), 0 1px 2px #000000' }}
          >
            <span className="text-purple-300 uppercase tracking-wider font-bold">Creator Studio Utilities</span>
            <span aria-hidden="true">·</span>
            <span>100% In-Browser</span>
            <span aria-hidden="true" className="hidden xs:inline">·</span>
            <span className="hidden xs:inline">Zero Server Uploads</span>
          </div>

          <h1
            className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 sm:mb-6 leading-tight animate-hero-heading motion-reduce:animate-none"
            style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.95), 0 6px 18px rgba(0, 0, 0, 0.9), 0 1px 2px #000000' }}
          >
            Professional Subtitle &amp; Video Creator Tools.
          </h1>

          <p
            className="text-xs xs:text-sm sm:text-base md:text-lg text-slate-100 max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 px-2 font-medium animate-hero-subtitle motion-reduce:animate-none"
            style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.95), 0 4px 14px rgba(0, 0, 0, 0.85), 0 1px 2px #000000' }}
          >
            Free, private, browser-based utilities for video creators, editors, and localization teams. Convert formats, fix timing drift, validate broadcast compliance, and generate YouTube chapters in seconds.
          </p>

          {/* Search & Category Filter Bar */}
          <div className="max-w-xl mx-auto mb-8 sm:mb-10 space-y-3 animate-hero-search motion-reduce:animate-none">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools (e.g. srt to vtt, delay, fps, chapters)..."
                aria-label="Search creator tools"
                className="w-full bg-[#100920]/80 backdrop-blur-md border border-purple-500/30 rounded-full pl-11 pr-5 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400/50 shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all min-h-[44px]"
              />
            </div>

            {/* Interactive Filter Tabs */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 p-1 bg-[#100920]/80 backdrop-blur-md rounded-2xl sm:rounded-full border border-purple-500/25 max-w-md mx-auto shadow-inner">
              {[
                { id: 'all', label: 'All (8)' },
                { id: 'convert', label: 'Converters' },
                { id: 'sync', label: 'Sync & FPS' },
                { id: 'creator', label: 'Creator' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-full transition-all min-h-[36px] flex-1 sm:flex-none text-center ${
                    selectedCategory === tab.id
                      ? 'fintech-btn-primary text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredTools.map((tool) => {
            const IconComponent = ICON_MAP[tool.icon] || FileText;
            return (
              <Link
                key={tool.id}
                to={tool.path}
                className="group fintech-panel rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600/25 to-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 group-hover:text-cyan-300 group-hover:border-purple-400/60 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      {tool.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-purple-300 transition-colors">
                    {tool.shortName}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {tool.tagline}
                  </p>
                </div>

                <div className="flex items-center text-xs font-semibold text-purple-400 group-hover:text-cyan-300 pt-3 border-t border-purple-500/15">
                  <span>Open Tool</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* AdSense Unit */}
      <AdPlaceholder format="horizontal" />

      {/* Workflow & Architecture Features Section */}
      <section className="mt-16 fintech-panel rounded-2xl p-8 lg:p-10">
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Architecture &amp; Security</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            Why Creators Trust SubForge
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Standard online converter websites upload your confidential media files to third-party cloud servers. SubForge is engineered from the ground up to process files completely inside your web browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#070410]/80 border border-purple-500/15 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-400/25 flex items-center justify-center text-purple-300 mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Zero Data Exposure</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your subtitle transcripts, speech text, and timecodes never leave your device. Compliant with strict corporate confidentiality and HIPAA/GDPR requirements.
            </p>
          </div>

          <div className="bg-[#070410]/80 border border-purple-500/15 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-400/25 flex items-center justify-center text-cyan-300 mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Zero Conversion Queues</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No server queues or "waiting for slot" timeouts. Processing executes instantly using your computer's local hardware threads.
            </p>
          </div>

          <div className="bg-[#070410]/80 border border-purple-500/15 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-400/25 flex items-center justify-center text-purple-300 mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">100% Free &amp; Open</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No account registration, no credit cards, no subscriptions, and no watermarks on exported files.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <FAQSection faqs={HOME_FAQS} />
    </div>
  );
}
