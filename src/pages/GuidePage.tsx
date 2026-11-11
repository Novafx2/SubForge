import { SEOHead } from '../components/layout/SEOHead';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Link } from '../context/RouterContext';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { BookOpen, FileCode, CheckCircle, ExternalLink } from 'lucide-react';

export function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEOHead
        title="Subtitle Format Guide – SRT vs WebVTT vs SBV & Broadcast Standards"
        description="Complete reference guide to video subtitle formats. Understand the differences between SubRip (.srt), WebVTT (.vtt), and SBV, along with broadcast reading speeds (CPS) and sync rules."
        canonicalPath="/guide"
      />

      <Breadcrumbs items={[{ label: 'Guides', path: '/guide' }, { label: 'Subtitle Format Specifications' }]} />

      <header className="mb-10 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Knowledge Encyclopedia</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          The Definitive Guide to Subtitle Formats &amp; Standards
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Everything you need to know about SubRip (.srt), WebVTT (.vtt), framerate synchronization, and broadcast caption specifications.
        </p>
      </header>

      <div className="space-y-12 text-sm text-slate-300 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            1. SubRip Subtitle Format (.srt)
          </h2>
          <p>
            Created in the early 2000s alongside the open-source SubRip DVD ripping utility, the <code className="text-blue-400 font-mono">.srt</code> format is the most universally supported subtitle standard on Earth. Every major desktop player (VLC, MPV, Windows Media Player) and video editing suite (Premiere Pro, DaVinci Resolve, Final Cut Pro) supports SRT.
          </p>

          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1">
            <div className="text-slate-500">// Example SRT Cue Structure:</div>
            <div className="text-blue-400">1</div>
            <div>00:01:20,500 --&gt; 00:01:24,200</div>
            <div className="text-white">This is the first subtitle line.</div>
            <div className="text-white">And this is the second line.</div>
          </div>

          <p>
            <strong>Key SRT Attributes:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
            <li>Comma as millisecond separator: <code className="text-blue-400">00:01:20,500</code></li>
            <li>Sequential numeric cue identifiers: 1, 2, 3...</li>
            <li>Limited formatting support: basic <code className="text-slate-300">&lt;i&gt;</code>, <code className="text-slate-300">&lt;b&gt;</code>, <code className="text-slate-300">&lt;u&gt;</code> tags.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            2. Web Video Text Tracks (.vtt)
          </h2>
          <p>
            Developed by the W3C and WHATWG as part of the HTML5 specification, WebVTT is engineered specifically for modern web browsers and streaming media. It is natively consumed by the HTML5 <code className="text-blue-400 font-mono">&lt;track&gt;</code> element, Vimeo, Coursera, and mobile Safari.
          </p>

          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1">
            <div className="text-slate-500">// Example WebVTT Cue Structure:</div>
            <div className="text-emerald-400 font-semibold">WEBVTT - Chapter 1</div>
            <div className="text-slate-500 py-1"></div>
            <div>00:01:20.500 --&gt; 00:01:24.200 position:10% align:left</div>
            <div className="text-white">&lt;v Narrator&gt;This is a styled WebVTT voice cue.&lt;/v&gt;</div>
          </div>

          <p>
            <strong>Key WebVTT Differences:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
            <li>Mandatory <code className="text-emerald-400">WEBVTT</code> header declaration on line 1.</li>
            <li>Period / dot as millisecond separator: <code className="text-blue-400">00:01:20.500</code></li>
            <li>Supports cue positioning: <code className="text-slate-300">line:0 position:50% align:start</code></li>
            <li>Supports CSS pseudo-element styling with <code className="text-slate-300">::cue</code> in web stylesheets.</li>
          </ul>

          <div className="pt-2">
            <Link
              to="/tools/srt-to-vtt"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-semibold hover:underline"
            >
              <span>Convert SRT to WebVTT with SubForge</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        <AdPlaceholder format="horizontal" />

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            3. Broadcast Subtitling Rules &amp; Best Practices
          </h2>
          <p>
            To guarantee accessibility for hard-of-hearing audiences and viewers in noisy environments, broadcasters and streaming services adhere to strict guidelines:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#0c1322] border border-slate-800 rounded-lg p-4">
              <h3 className="font-semibold text-white text-xs mb-1">Characters Per Second (CPS)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aim for <strong>17 to 20 CPS</strong>. Anything above 25 CPS forces viewers to speed-read, missing the facial expressions and cinematography.
              </p>
            </div>

            <div className="bg-[#0c1322] border border-slate-800 rounded-lg p-4">
              <h3 className="font-semibold text-white text-xs mb-1">Line Limits &amp; Wrapping</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Never exceed <strong>2 lines per cue</strong> and keep line length below <strong>42 characters</strong>. Break lines naturally at grammatical pauses.
              </p>
            </div>
          </div>
        </section>

        {/* Quick links to tools */}
        <section className="bg-[#0c1322] border border-slate-800 rounded-xl p-6">
          <h3 className="font-bold text-white text-base mb-3">Explore Recommended Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Link to="/tools/validator" className="p-2.5 rounded bg-[#080d1a] border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white transition-colors">
              <span className="font-semibold text-blue-400 block mb-0.5">Subtitle Validator</span>
              <span>Test files for CPS speed and line length violations</span>
            </Link>
            <Link to="/tools/timing-fixer" className="p-2.5 rounded bg-[#080d1a] border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white transition-colors">
              <span className="font-semibold text-blue-400 block mb-0.5">Timing Fixer</span>
              <span>Fix delay or advance cues with millisecond accuracy</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
