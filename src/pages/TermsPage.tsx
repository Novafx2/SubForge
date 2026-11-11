import { SEOHead } from '../components/layout/SEOHead';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { FileCheck, Shield, HelpCircle } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEOHead
        title="Terms of Service – SubForge"
        description="Review the terms and conditions for using SubForge. Free, browser-based subtitle and creator tools with zero claims on your intellectual property."
        canonicalPath="/terms"
      />

      <Breadcrumbs items={[{ label: 'Terms of Service' }]} />

      <header className="mb-10 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
          <FileCheck className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Terms of Service
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Last revised: November 2026. Please review the simple, honest terms governing your use of SubForge.
        </p>
      </header>

      <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using SubForge, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may discontinue use of the platform at any time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">2. Your Content &amp; Intellectual Property</h2>
          <p>
            <strong>You retain 100% ownership and copyright</strong> over any subtitle files, dialogue, transcripts, video timestamps, and text you process on SubForge.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
            <li>SubForge does not claim any license, copyright, or ownership over your uploaded or pasted materials.</li>
            <li>Because all file processing happens locally inside your browser, we do not store, copy, or distribute your intellectual property.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">3. Acceptable Use</h2>
          <p>
            SubForge is provided free of charge for individual creators, educational institutions, video editors, and commercial organizations. You agree not to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
            <li>Attempt to reverse engineer, disrupt, or flood the website with automated denial-of-service traffic.</li>
            <li>Misrepresent SubForge as an official product of YouTube, Google, Netflix, Adobe, or Apple.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">4. Disclaimer of Warranties</h2>
          <p>
            SubForge is provided on an "as-is" and "as-available" basis. While we strive for extreme mathematical precision in timing calculations and subtitle syntax validation, we cannot guarantee that every third-party video editor or media player will render your output without custom user adjustments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">5. Limitation of Liability</h2>
          <p>
            In no event shall SubForge or its maintainers be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use this platform. Always preview and verify your subtitle synchronizations prior to broadcast or final video rendering.
          </p>
        </section>
      </div>
    </div>
  );
}
