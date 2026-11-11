import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { CodeEditor } from '../components/common/CodeEditor';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { parseSrt } from '../utils/srtParser';
import { serializeToVtt } from '../utils/vttParser';
import { formatDurationHuman } from '../utils/timeUtils';
import { SAMPLE_SRT } from '../utils/sampleSubtitles';
import { TOOL_FAQS } from '../utils/seoData';
import { SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { ToolAiEnhancement } from '../components/ai/ToolAiEnhancement';

export function SrtToVttPage() {
  const [inputContent, setInputContent] = useState<string>(SAMPLE_SRT);
  const [fileName, setFileName] = useState<string>('sample_subtitles.srt');

  // Conversion options
  const [stripHtml, setStripHtml] = useState<boolean>(false);
  const [includeCueIds, setIncludeCueIds] = useState<boolean>(false);
  const [customHeader, setCustomHeader] = useState<string>('');

  const parsed = useMemo(() => {
    if (!inputContent.trim()) return null;
    return parseSrt(inputContent);
  }, [inputContent]);

  const outputVtt = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return '';
    return serializeToVtt(parsed.cues, {
      stripTags: stripHtml,
      includeCueIds: includeCueIds,
      includeHeaderTitle: customHeader || undefined,
    });
  }, [parsed, stripHtml, includeCueIds, customHeader]);

  const totalDuration = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return '0s';
    const lastCue = parsed.cues[parsed.cues.length - 1];
    return formatDurationHuman(lastCue.endMs);
  }, [parsed]);

  const targetFilename = fileName.replace(/\.[^/.]+$/, '') + '.vtt';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="SRT to VTT Converter – Free Online WebVTT Generator"
        description="Convert SubRip (.srt) subtitle files to standard WebVTT (.vtt) format with millisecond accuracy. 100% private in-browser tool for HTML5 video, Vimeo, and web players."
        canonicalPath="/tools/srt-to-vtt"
        faqs={TOOL_FAQS['srt-to-vtt']}
      />

      <ToolHeader
        title="SRT to VTT Converter"
        tagline="Transform SubRip (.srt) subtitle files into standard WebVTT (.vtt) captions for HTML5 video players, Vimeo, and web applications."
        categoryName="Format Converter"
        breadcrumbLabel="SRT to VTT Converter"
        supportedFormats=".srt → .vtt"
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
            acceptedFormats={['.srt', '.txt']}
            sampleContent={SAMPLE_SRT}
            sampleFilename="sample_subtitles.srt"
            label="Upload SubRip (.srt) subtitle file"
          />

          {/* Configuration Options */}
          <div className="fintech-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Conversion Settings</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="vtt-header-label" className="block text-slate-300 font-medium mb-1">
                  Optional WebVTT Header Label
                </label>
                <input
                  id="vtt-header-label"
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  placeholder="e.g. English Subtitles (Track 1)"
                  aria-label="Optional WebVTT header label"
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-md px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={stripHtml}
                  onChange={(e) => setStripHtml(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <div>
                  <span className="font-medium text-slate-200">Strip HTML Styling Tags</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Removes &lt;i&gt;, &lt;b&gt;, &lt;u&gt;, and &lt;font&gt; tags for clean plaintext display.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={includeCueIds}
                  onChange={(e) => setIncludeCueIds(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <div>
                  <span className="font-medium text-slate-200">Include Sequential Cue IDs</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Adds numerical cue identifiers (1, 2, 3...) above timestamp lines.
                  </p>
                </div>
              </label>
            </div>

            {/* Subtitle Statistics */}
            {parsed && parsed.cues.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <div>
                  <span>Cues: </span>
                  <span className="text-blue-400 font-semibold">{parsed.cues.length}</span>
                </div>
                <div>
                  <span>Duration: </span>
                  <span className="text-slate-200">{totalDuration}</span>
                </div>
              </div>
            )}
          </div>

          {/* Optional Local AI Subtitle Assistant */}
          <ToolAiEnhancement
            currentText={inputContent}
            onApplyOutput={(newText) => setInputContent(newText)}
            toolName="SRT Subtitles"
          />
        </div>

        {/* Right Column: Live Output Code Viewer */}
        <div className="lg:col-span-7">
          <CodeEditor
            value={outputVtt}
            filename={targetFilename}
            formatName="WebVTT (.vtt)"
            cueCount={parsed?.cues.length}
            mimeType="text/vtt;charset=utf-8"
          />
        </div>
      </div>

      {/* AdSense Unit */}
      <AdPlaceholder format="horizontal" />

      {/* High-Value Educational & SEO Content Section */}
      <section className="mt-16 fintech-panel rounded-3xl p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
            How to Convert SubRip (.srt) to WebVTT (.vtt)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            SubRip (.srt) has long been the gold standard for desktop media players and video editing packages. However, modern web standards require <strong>WebVTT (Web Video Text Tracks)</strong> for HTML5 &lt;video&gt; playback, video hosting platforms, and browser accessibility compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded-md bg-blue-950 border border-blue-800/60 text-blue-400 flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Load Subtitle File</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag your .srt file into the box or copy and paste the raw caption text directly into the editor.
            </p>
          </div>

          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded-md bg-blue-950 border border-blue-800/60 text-blue-400 flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Configure Options</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose whether to keep HTML formatting tags or strip them for strict plain-text caption tracks.
            </p>
          </div>

          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded-md bg-blue-950 border border-blue-800/60 text-blue-400 flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">Download .VTT</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly download your validated .vtt file ready to embed in video tags or upload to your CMS.
            </p>
          </div>
        </div>

        {/* Technical Comparison Table */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Technical Differences: SRT vs WebVTT</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60 text-slate-300">
                  <th className="py-2.5 px-4 font-semibold">Specification</th>
                  <th className="py-2.5 px-4 font-semibold">SubRip (.srt)</th>
                  <th className="py-2.5 px-4 font-semibold">WebVTT (.vtt)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-400">
                <tr>
                  <td className="py-2.5 px-4 font-medium text-slate-300">Header Requirement</td>
                  <td className="py-2.5 px-4">None (starts with cue #1)</td>
                  <td className="py-2.5 px-4 text-blue-400">Mandatory "WEBVTT" first line</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-slate-300">Millisecond Separator</td>
                  <td className="py-2.5 px-4 font-mono">Comma (00:01:23,456)</td>
                  <td className="py-2.5 px-4 font-mono text-blue-400">Period / Dot (00:01:23.456)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-slate-300">HTML5 Native Support</td>
                  <td className="py-2.5 px-4">Requires custom JS parser</td>
                  <td className="py-2.5 px-4 text-emerald-400 font-medium">Native &lt;track&gt; support</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-slate-300">Cue Positioning &amp; CSS</td>
                  <td className="py-2.5 px-4">Not officially supported</td>
                  <td className="py-2.5 px-4 text-blue-400">Supports align, line, position, and CSS styling</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection faqs={TOOL_FAQS['srt-to-vtt']} />
    </div>
  );
}
