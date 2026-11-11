import { SEOHead } from '../components/layout/SEOHead';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { ShieldCheck, Lock, EyeOff, ServerOff, Database } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEOHead
        title="Privacy & Security Policy – 100% Local In-Browser Processing"
        description="SubForge runs 100% in your browser. We never upload, inspect, or store your subtitle files or video dialogue on any server. Read our privacy commitment."
        canonicalPath="/privacy"
      />

      <Breadcrumbs items={[{ label: 'Privacy & Security' }]} />

      <header className="mb-10 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Privacy Policy &amp; Client-Side Security Guarantee
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          How SubForge protects your confidential creative media, unreleased film scripts, and proprietary video transcripts.
        </p>
      </header>

      <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
        {/* Architecture Spotlight */}
        <div className="bg-[#0c1322] border border-blue-900/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Lock className="w-5 h-5 text-blue-400" />
            <span>Core Principle: Zero Server Transmission</span>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            When you use SubForge to convert, shift, merge, or validate subtitle files, the processing takes place entirely within your browser's JavaScript execution engine using Web APIs (FileReader, TextDecoder, and Blob).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="bg-[#080d1a] border border-slate-800 p-3 rounded-lg flex items-center gap-2.5">
              <ServerOff className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No Cloud Server Uploads</span>
            </div>
            <div className="bg-[#080d1a] border border-slate-800 p-3 rounded-lg flex items-center gap-2.5">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No Databases or Logs</span>
            </div>
            <div className="bg-[#080d1a] border border-slate-800 p-3 rounded-lg flex items-center gap-2.5">
              <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero Human or AI Inspection</span>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">1. Information We Do NOT Collect</h2>
          <p>
            Unlike typical online conversion utilities that upload your files to temporary Amazon S3 or Google Cloud storage buckets:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
            <li>We do not receive or store your uploaded SRT, VTT, or TXT subtitle files.</li>
            <li>We do not store your video dialogue, transcripts, or speaker names.</li>
            <li>We do not require user accounts, email addresses, or phone numbers.</li>
            <li>We do not train machine learning or AI models on your caption content.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">2. Local Browser Storage</h2>
          <p>
            Any temporary application states (such as active preview tabs or pasted text) exist solely within the volatile memory (RAM) of your current browser session and are immediately erased when you close the browser tab.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">3. Third-Party Advertising &amp; Cookies</h2>
          <p>
            To keep SubForge completely free and open to everyone without charging subscription fees, we may display unobtrusive advertisements through Google AdSense. Google AdSense may use cookies to serve ads based on prior visits to this or other websites. You can manage or disable personalized advertising by visiting Google's Ads Settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">4. GDPR and CCPA Compliance</h2>
          <p>
            Because we do not collect personal identifying information (PII) or transmit user files across the internet to our servers, SubForge inherently complies with the European General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
          </p>
        </section>
      </div>
    </div>
  );
}
