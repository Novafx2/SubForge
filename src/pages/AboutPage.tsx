import { SEOHead } from '../components/layout/SEOHead';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Link } from '../context/RouterContext';
import { Sparkles, Terminal, Globe, Heart } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEOHead
        title="About SubForge – Free Subtitle & Creator Utilities Platform"
        description="Learn about SubForge's mission to provide fast, private, free subtitle editing tools and video creator utilities with zero subscriptions and zero ads traps."
        canonicalPath="/about"
      />

      <Breadcrumbs items={[{ label: 'About SubForge' }]} />

      <header className="mb-10 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Our Mission</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          About SubForge Studio
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Engineered for video creators, editors, educators, and language localization teams around the world.
        </p>
      </header>

      <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Why We Built SubForge</h2>
          <p>
            Almost every online subtitle converter on the internet today is bloated with aggressive popup ads, forced registration, artificial file limits, or subscription paywalls. Even worse, many of them secretly upload your video transcripts to external cloud servers, exposing private scripts and confidential media.
          </p>
          <p>
            SubForge was created with a straightforward philosophy: <strong>Fast, private, production-grade tools that run entirely in your web browser.</strong>
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div className="bg-[#0c1322] border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-3">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-xs mb-1">Open Standards</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Built on strict adherence to W3C WebVTT, Matroska SubRip, and Netflix broadcast guidelines.
            </p>
          </div>

          <div className="bg-[#0c1322] border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-3">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-xs mb-1">Global Accessibility</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Subtitles make video content accessible to deaf and hard-of-hearing viewers and multilingual audiences globally.
            </p>
          </div>

          <div className="bg-[#0c1322] border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-3">
              <Heart className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-white text-xs mb-1">100% Free Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No account creation required. No artificial limits or watermarked downloads.
            </p>
          </div>
        </section>

        <section className="bg-[#0c1322] border border-slate-800 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-white">Explore the SubForge Tool Suite</h2>
          <p className="text-xs text-slate-400">
            Check out our complete suite of browser-based utilities:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/tools/srt-to-vtt" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              SRT to VTT
            </Link>
            <Link to="/tools/vtt-to-srt" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              VTT to SRT
            </Link>
            <Link to="/tools/timing-fixer" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              Timing Fixer
            </Link>
            <Link to="/tools/fps-converter" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              FPS Converter
            </Link>
            <Link to="/tools/validator" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              Validator
            </Link>
            <Link to="/tools/text-extractor" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              Text Extractor
            </Link>
            <Link to="/tools/merger" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              Subtitle Merger
            </Link>
            <Link to="/tools/youtube-chapters" className="px-3 py-1.5 bg-[#080d1a] border border-slate-800 rounded text-slate-300 hover:text-white hover:border-slate-700">
              YouTube Chapters
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
