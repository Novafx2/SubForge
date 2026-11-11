import { useState } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Mail, MessageSquare, Bug, Sparkles, CheckCircle2 } from 'lucide-react';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEOHead
        title="Contact & Feedback – SubForge"
        description="Contact the SubForge developer team. Report subtitle bugs, request new format converters, or ask questions about subtitle specifications."
        canonicalPath="/contact"
      />

      <Breadcrumbs items={[{ label: 'Contact & Feedback' }]} />

      <header className="mb-10 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
          <Mail className="w-3.5 h-3.5" />
          <span>Get in Touch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Contact &amp; Feedback
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Have an idea for a new creator utility, found a bug in a subtitle parser, or need help with a custom framerate? We'd love to hear from you.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="md:col-span-7 bg-[#0c1322] border border-slate-800 rounded-xl p-6">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Message Received!</h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Thank you for your feedback. We review user bug reports and feature suggestions to continuously improve our subtitle utilities.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="contact-name" className="block text-slate-300 font-medium mb-1">
                  Your Name (Optional)
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-slate-300 font-medium mb-1">
                  Email Address *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-slate-300 font-medium mb-1">
                  Topic
                </label>
                <select
                  id="contact-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Bug Report">Bug Report (Parser or Tool Issue)</option>
                  <option value="Feature Request">Feature Request (New Subtitle Tool)</option>
                  <option value="Feedback">General Feedback &amp; Suggestions</option>
                  <option value="Business">Advertising / Business Inquiry</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-slate-300 font-medium mb-1">
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your suggestion, or if reporting a bug, paste the first few lines of the problematic subtitle..."
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={!message.trim() || !email.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                Send Message
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Support Guidelines */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <Bug className="w-4 h-4" />
              <span>Reporting a Parsing Bug?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              To help us fix parser issues quickly, please let us know:
            </p>
            <ul className="list-disc pl-4 text-slate-400 space-y-1">
              <li>Which tool you were using</li>
              <li>Whether the file is SubRip (.srt) or WebVTT (.vtt)</li>
              <li>A sample timestamp line that failed to convert</li>
            </ul>
          </div>

          <div className="bg-[#0c1322] border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Requesting a New Tool?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              We frequently add creator tools. If there is a caption or video workflow you perform repeatedly, let us know and we'll evaluate adding it to SubForge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
