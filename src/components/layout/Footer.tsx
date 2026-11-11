import { Link } from '../../context/RouterContext';
import { ShieldCheck, Lock, Cpu, Globe } from 'lucide-react';
import { SubForgeLogo } from '../common/SubForgeLogo';

export function Footer() {
  return (
    <footer className="relative bg-[#070410]/90 backdrop-blur-xl border-t border-purple-500/20 text-slate-400 text-sm mt-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
      {/* Privacy & Trust Bar */}
      <div className="border-b border-purple-500/15 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600/25 to-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Zero Server Uploads</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Files are parsed directly in your browser. Audio, video, and subtitle text never leave your computer.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600/25 to-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Instant Local Processing</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Powered by high-performance JavaScript engine. Process files of any size without queueing or network latency.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600/25 to-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-cyan-300">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">100% Free &amp; Open Standards</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  No account registration, no credit cards, no subscriptions, and no watermarks on exported files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
          {/* Brand info */}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center gap-2.5 text-slate-100 font-bold text-lg mb-3">
              <SubForgeLogo size={32} />
              <span>SubForge</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              Professional, private, browser-based subtitle and video creator tools. Built for video editors, YouTube creators, educational institutions, and localization teams.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Client-side Engine</span>
              <span>·</span>
              <span>No signup required</span>
              <span>·</span>
              <span>Free forever</span>
            </div>
          </div>

          {/* Column 1: Converters */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Format Converters
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/tools/srt-to-vtt" className="hover:text-blue-400 transition-colors">
                  SRT to VTT Converter
                </Link>
              </li>
              <li>
                <Link to="/tools/vtt-to-srt" className="hover:text-blue-400 transition-colors">
                  VTT to SRT Converter
                </Link>
              </li>
              <li>
                <Link to="/tools/fps-converter" className="hover:text-blue-400 transition-colors">
                  Subtitle FPS Converter
                </Link>
              </li>
              <li>
                <Link to="/tools/text-extractor" className="hover:text-blue-400 transition-colors">
                  Subtitle to Plain Text
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Sync & Creator Tools */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Sync &amp; Creator
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/tools/timing-fixer" className="hover:text-blue-400 transition-colors">
                  Subtitle Timing Fixer
                </Link>
              </li>
              <li>
                <Link to="/tools/validator" className="hover:text-blue-400 transition-colors">
                  Subtitle Syntax Validator
                </Link>
              </li>
              <li>
                <Link to="/tools/merger" className="hover:text-blue-400 transition-colors">
                  Subtitle Merger (Bilingual)
                </Link>
              </li>
              <li>
                <Link to="/tools/youtube-chapters" className="hover:text-blue-400 transition-colors">
                  YouTube Chapters Generator
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources & Legal */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Resources &amp; Info
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/guide" className="hover:text-blue-400 transition-colors">
                  Subtitle Format Guide
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-blue-400 transition-colors">
                  Privacy Policy &amp; Security
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition-colors">
                  Contact &amp; Feedback
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-400 transition-colors">
                  About SubForge
                </Link>
              </li>
              <li>
                <a href="/sitemap.xml" className="hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                  XML Sitemap
                </a>
              </li>
              <li>
                <a href="/robots.txt" className="hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                  Robots.txt
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="border-t border-slate-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} SubForge. All rights reserved. Free tool for content creators.</p>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Files processed locally in-browser</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
