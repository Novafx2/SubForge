import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { CodeEditor } from '../components/common/CodeEditor';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { autoDetectAndParse, serializeToVtt } from '../utils/vttParser';
import { serializeToSrt } from '../utils/srtParser';
import { validateSubtitles, autoFixSubtitleCues } from '../utils/validator';
import { SAMPLE_PROBLEMATIC_SRT } from '../utils/sampleSubtitles';
import { TOOL_FAQS } from '../utils/seoData';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Wrench, Filter } from 'lucide-react';

export function ValidatorPage() {
  const [inputContent, setInputContent] = useState<string>(SAMPLE_PROBLEMATIC_SRT);
  const [fileName, setFileName] = useState<string>('problematic_sample.srt');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [hasAutoFixed, setHasAutoFixed] = useState(false);

  const parsed = useMemo(() => {
    if (!inputContent.trim()) return null;
    return autoDetectAndParse(inputContent);
  }, [inputContent]);

  const validation = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return null;
    return validateSubtitles(parsed.cues);
  }, [parsed]);

  const handleAutoFix = () => {
    if (!parsed || parsed.cues.length === 0) return;
    const fixedCues = autoFixSubtitleCues(parsed.cues);
    const fixedOutput = parsed.format === 'vtt' ? serializeToVtt(fixedCues) : serializeToSrt(fixedCues);
    setInputContent(fixedOutput);
    setHasAutoFixed(true);
  };

  const filteredIssues = useMemo(() => {
    if (!validation) return [];
    if (severityFilter === 'all') return validation.issues;
    return validation.issues.filter((i) => i.severity === severityFilter);
  }, [validation, severityFilter]);

  const targetFilename = fileName.replace(/\.[^/.]+$/, '') + '_validated' + (parsed?.format === 'vtt' ? '.vtt' : '.srt');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="Subtitle Validator & Linter – Quality & Broadcast Syntax Auditor"
        description="Audit SRT and WebVTT subtitle files for overlapping timestamps, excessive reading speeds (CPS), line length violations, and syntax errors. Includes 1-click Auto-Fix."
        canonicalPath="/tools/validator"
        faqs={TOOL_FAQS['validator']}
      />

      <ToolHeader
        title="Subtitle Validator &amp; Linter"
        tagline="Audit SRT and WebVTT files against international broadcast guidelines (Netflix, BBC). Detect overlaps, reading speed spikes, and line-length overflows."
        categoryName="Audit &amp; Quality"
        breadcrumbLabel="Subtitle Validator"
        supportedFormats=".srt, .vtt"
      />

      {/* Main Tool Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Issue Explorer */}
        <div className="lg:col-span-6 space-y-6">
          <FileDropzone
            onContentLoaded={(content, name) => {
              setInputContent(content);
              setFileName(name);
              setHasAutoFixed(false);
            }}
            acceptedFormats={['.srt', '.vtt', '.txt']}
            sampleContent={SAMPLE_PROBLEMATIC_SRT}
            sampleFilename="problematic_sample.srt"
            label="Upload subtitle file to audit"
          />

          {/* Validation Scorecard */}
          {validation && (
            <div className="bg-[#0f172a]/70 rounded-xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <span>Audit Results</span>
                </div>
                {validation.issues.some((i) => i.autoFixable) && (
                  <button
                    type="button"
                    onClick={handleAutoFix}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full glass-pill-btn text-white text-xs font-semibold shadow-md transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Auto-Fix Errors</span>
                  </button>
                )}
              </div>

              {/* Status summary metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 text-rose-400 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-lg font-bold font-mono tabular-nums">{validation.errorCount}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Errors</div>
                </div>

                <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-lg font-bold font-mono tabular-nums">{validation.warningCount}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Warnings</div>
                </div>

                <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                    <Info className="w-4 h-4" />
                    <span className="text-lg font-bold font-mono tabular-nums">{validation.infoCount}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Notices</div>
                </div>
              </div>

              {/* CPS & Technical Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-[#080d1a] p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400">Avg Reading Speed: </span>
                  <span className="text-white font-semibold tabular-nums">{validation.avgCps} CPS</span>
                </div>
                <div>
                  <span className="text-slate-400">Peak Reading Speed: </span>
                  <span className={`font-semibold tabular-nums ${validation.maxCps > 22 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {validation.maxCps} CPS
                  </span>
                </div>
              </div>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-400 mr-2 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter:
                </span>
                {(['all', 'error', 'warning', 'info'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSeverityFilter(tab)}
                    className={`px-3 py-1 text-xs rounded-full capitalize transition-all ${
                      severityFilter === tab
                        ? 'glass-pill-btn text-white font-semibold'
                        : 'text-slate-400 hover:text-white fintech-btn-secondary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Issues List */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredIssues.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <span>No issues found matching this filter.</span>
                  </div>
                ) : (
                  filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                        issue.severity === 'error'
                          ? 'bg-rose-950/20 border-rose-900/60'
                          : issue.severity === 'warning'
                          ? 'bg-amber-950/20 border-amber-900/60'
                          : 'bg-blue-950/20 border-blue-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {issue.severity === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : issue.severity === 'warning' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-200">{issue.title}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          Cue #{issue.cueIndex}
                        </span>
                      </div>

                      <p className="text-slate-300 text-xs leading-relaxed pl-5">
                        {issue.message}
                      </p>

                      {issue.timestamp && (
                        <div className="pl-5 text-[11px] font-mono text-slate-400">
                          {issue.timestamp}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Editor Output */}
        <div className="lg:col-span-6">
          <CodeEditor
            value={inputContent}
            filename={targetFilename}
            formatName="Validated Subtitle"
            cueCount={parsed?.cues.length}
            onValueChange={setInputContent}
            readOnly={false}
            mimeType="text/plain;charset=utf-8"
          />
        </div>
      </div>

      <AdPlaceholder format="horizontal" />

      {/* Guide Section */}
      <section className="mt-16 bg-[#0c1322] border border-slate-800 rounded-xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Broadcast Subtitle Specifications Guide
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Major streaming platforms like Netflix, BBC iPlayer, Amazon Prime Video, and Apple TV+ enforce strict quality requirements to ensure captions are comfortable to read for all viewers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Reading Speed (CPS)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard broadcast target is 17 to 20 Characters Per Second. Above 25 CPS, viewers cannot process both the video imagery and the caption text simultaneously.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Line Length &amp; Count</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maximum 2 lines per subtitle cue, and a maximum of 37 to 42 characters per line (CPL). Three or more lines block critical visual action on the screen.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Shot Changes &amp; Gaps</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintain a minimum 2-frame gap (approx 80ms) between adjacent cues so the human eye registers the transition between distinct sentences.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={TOOL_FAQS['validator']} />
    </div>
  );
}
