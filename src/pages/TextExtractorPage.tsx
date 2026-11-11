import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { CodeEditor } from '../components/common/CodeEditor';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { autoDetectAndParse } from '../utils/vttParser';
import { extractTextFromCues, TextExtractionOptions } from '../utils/textExtractor';
import { SAMPLE_SRT } from '../utils/sampleSubtitles';
import { TOOL_FAQS } from '../utils/seoData';
import { FileSpreadsheet, SlidersHorizontal, BookOpen, Clock, AlignLeft } from 'lucide-react';

export function TextExtractorPage() {
  const [inputContent, setInputContent] = useState<string>(SAMPLE_SRT);
  const [fileName, setFileName] = useState<string>('sample_subtitles.srt');

  // Extraction options
  const [mode, setMode] = useState<TextExtractionOptions['mode']>('paragraphs');
  const [removeSpeakers, setRemoveSpeakers] = useState<boolean>(true);
  const [removeSounds, setRemoveSounds] = useState<boolean>(true);
  const [deduplicate, setDeduplicate] = useState<boolean>(true);
  const [stripHtml, setStripHtml] = useState<boolean>(true);

  const parsed = useMemo(() => {
    if (!inputContent.trim()) return null;
    return autoDetectAndParse(inputContent);
  }, [inputContent]);

  const extraction = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return null;
    return extractTextFromCues(parsed.cues, {
      mode,
      removeSpeakerLabels: removeSpeakers,
      removeSoundEffects: removeSounds,
      deduplicateLines: deduplicate,
      stripHtmlTags: stripHtml,
    });
  }, [parsed, mode, removeSpeakers, removeSounds, deduplicate, stripHtml]);

  const targetFilename = fileName.replace(/\.[^/.]+$/, '') + '_transcript.txt';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="Subtitle Text Extractor – Convert SRT & VTT to Clean Plain Text"
        description="Extract clean readable text from SRT or VTT subtitle files. Removes timestamps, cue numbers, sound effect brackets, and speaker labels. Groups into natural paragraphs."
        canonicalPath="/tools/text-extractor"
        faqs={TOOL_FAQS['text-extractor']}
      />

      <ToolHeader
        title="Subtitle Text Extractor"
        tagline="Strip timestamps, numbers, sound effects, and speaker labels to transform subtitle files into clean, readable text transcripts."
        categoryName="Creator Utilities"
        breadcrumbLabel="Subtitle Text Extractor"
        supportedFormats=".srt, .vtt, .txt"
      />

      {/* Main Tool Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Options */}
        <div className="lg:col-span-5 space-y-6">
          <FileDropzone
            onContentLoaded={(content, name) => {
              setInputContent(content);
              setFileName(name);
            }}
            acceptedFormats={['.srt', '.vtt', '.txt']}
            sampleContent={SAMPLE_SRT}
            sampleFilename="sample_subtitles.srt"
            label="Upload subtitle file to extract text"
          />

          {/* Configuration Settings */}
          <div className="fintech-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Formatting Options</span>
            </div>

            {/* Layout Mode Segmented Tabs */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-2">
                Output Text Layout:
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-purple-950/20 rounded-full border border-purple-500/20 text-xs">
                <button
                  type="button"
                  onClick={() => setMode('paragraphs')}
                  className={`py-2 px-3 rounded-full font-semibold transition-all ${
                    mode === 'paragraphs'
                      ? 'glass-pill-btn text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Paragraphs
                </button>
                <button
                  type="button"
                  onClick={() => setMode('lines')}
                  className={`py-2 px-3 rounded-full font-semibold transition-all ${
                    mode === 'lines'
                      ? 'glass-pill-btn text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Line-by-Line
                </button>
                <button
                  type="button"
                  onClick={() => setMode('single-string')}
                  className={`py-2 px-3 rounded-full font-semibold transition-all ${
                    mode === 'single-string'
                      ? 'glass-pill-btn text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Continuous
                </button>
              </div>
            </div>

            {/* Cleaning Toggles */}
            <div className="space-y-2.5 text-xs pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={removeSounds}
                  onChange={(e) => setRemoveSounds(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <span>Remove sound effects [music], (applause), ♪ notes</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={removeSpeakers}
                  onChange={(e) => setRemoveSpeakers(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <span>Remove speaker labels (e.g. "SPEAKER 1:", "&gt;&gt; Host:")</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={deduplicate}
                  onChange={(e) => setDeduplicate(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <span>Deduplicate rolling captions (repeated consecutive lines)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={stripHtml}
                  onChange={(e) => setStripHtml(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <span>Strip HTML / styling tags (&lt;i&gt;, &lt;b&gt;, etc.)</span>
              </label>
            </div>

            {/* Transcript Statistics Bar */}
            {extraction && (
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-[#080d1a] p-2 rounded border border-slate-800">
                  <div className="text-blue-400 font-bold tabular-nums">{extraction.wordCount}</div>
                  <div className="text-[10px] text-slate-400">Words</div>
                </div>
                <div className="bg-[#080d1a] p-2 rounded border border-slate-800">
                  <div className="text-slate-200 font-bold tabular-nums">{extraction.characterCount}</div>
                  <div className="text-[10px] text-slate-400">Characters</div>
                </div>
                <div className="bg-[#080d1a] p-2 rounded border border-slate-800">
                  <div className="text-emerald-400 font-bold tabular-nums">~{extraction.readingTimeMinutes} min</div>
                  <div className="text-[10px] text-slate-400">Read Time</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor Output */}
        <div className="lg:col-span-7">
          <CodeEditor
            value={extraction?.text || ''}
            filename={targetFilename}
            formatName="Plain Text Transcript (.txt)"
            cueCount={parsed?.cues.length}
            mimeType="text/plain;charset=utf-8"
          />
        </div>
      </div>

      <AdPlaceholder format="horizontal" />

      {/* Guide Section */}
      <section className="mt-16 bg-[#0c1322] border border-slate-800 rounded-xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Turn Subtitles into Blog Posts, Articles &amp; Summaries
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Content creators often need to repurpose video dialogue into articles, show notes, and social posts. Extracting raw captions manually takes hours of deleting timestamp numbers and bracketed notes. SubForge strips all formatting and joins fragmented speech into fluid, readable prose paragraphs automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">YouTube Transcripts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-generated YouTube captions frequently duplicate lines in a scrolling "teleprompter" style. Our deduplicator eliminates every repeated line automatically.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Podcast Show Notes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transform interview subtitle tracks into clean prose for email newsletters, blog posts, and website accessibility transcripts.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Academic &amp; Research</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clean recorded lectures and conference proceedings for textual analysis, quotes, and reading time estimation.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={TOOL_FAQS['text-extractor']} />
    </div>
  );
}
