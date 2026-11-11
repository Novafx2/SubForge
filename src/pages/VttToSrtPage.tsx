import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { CodeEditor } from '../components/common/CodeEditor';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { parseVtt } from '../utils/vttParser';
import { serializeToSrt } from '../utils/srtParser';
import { formatDurationHuman } from '../utils/timeUtils';
import { SAMPLE_VTT } from '../utils/sampleSubtitles';
import { TOOL_FAQS } from '../utils/seoData';
import { SlidersHorizontal } from 'lucide-react';
import { ToolAiEnhancement } from '../components/ai/ToolAiEnhancement';

export function VttToSrtPage() {
  const [inputContent, setInputContent] = useState<string>(SAMPLE_VTT);
  const [fileName, setFileName] = useState<string>('sample_subtitles.vtt');

  // Conversion options
  const [reindex, setReindex] = useState<boolean>(true);
  const [stripHtml, setStripHtml] = useState<boolean>(false);

  const parsed = useMemo(() => {
    if (!inputContent.trim()) return null;
    return parseVtt(inputContent);
  }, [inputContent]);

  const outputSrt = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return '';
    return serializeToSrt(parsed.cues, {
      reindex,
      stripTags: stripHtml,
    });
  }, [parsed, reindex, stripHtml]);

  const totalDuration = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return '0s';
    const lastCue = parsed.cues[parsed.cues.length - 1];
    return formatDurationHuman(lastCue.endMs);
  }, [parsed]);

  const targetFilename = fileName.replace(/\.[^/.]+$/, '') + '.srt';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="VTT to SRT Converter – Convert WebVTT to SubRip Online"
        description="Convert WebVTT (.vtt) files to SubRip (.srt) subtitle format instantly in your browser. Cleans WebVTT headers, removes cue settings, and fixes comma timestamps for Premiere Pro, VLC, and TV players."
        canonicalPath="/tools/vtt-to-srt"
        faqs={TOOL_FAQS['vtt-to-srt']}
      />

      <ToolHeader
        title="VTT to SRT Converter"
        tagline="Convert WebVTT (.vtt) files into universal SubRip (.srt) subtitles for Premiere Pro, DaVinci Resolve, VLC, and television media players."
        categoryName="Format Converter"
        breadcrumbLabel="VTT to SRT Converter"
        supportedFormats=".vtt → .srt"
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
            acceptedFormats={['.vtt', '.txt']}
            sampleContent={SAMPLE_VTT}
            sampleFilename="sample_subtitles.vtt"
            label="Upload WebVTT (.vtt) subtitle file"
          />

          {/* Configuration Options */}
          <div className="fintech-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Conversion Settings</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={reindex}
                  onChange={(e) => setReindex(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <div>
                  <span className="font-medium text-slate-200">Re-index Sequential Numbers</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Ensures cue numbers increment sequentially from 1 to N without missing numbers or string identifiers.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={stripHtml}
                  onChange={(e) => setStripHtml(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <div>
                  <span className="font-medium text-slate-200">Strip WebVTT Styling &amp; HTML Tags</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Strips cue position tags and inline &lt;c&gt; or &lt;v&gt; classes that cause import errors in older NLE video editors.
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
            toolName="WebVTT Subtitles"
          />
        </div>

        {/* Right Column: Live Output Code Viewer */}
        <div className="lg:col-span-7">
          <CodeEditor
            value={outputSrt}
            filename={targetFilename}
            formatName="SubRip (.srt)"
            cueCount={parsed?.cues.length}
            mimeType="text/plain;charset=utf-8"
          />
        </div>
      </div>

      <AdPlaceholder format="horizontal" />

      {/* Educational & Guide Section */}
      <section className="mt-16 fintech-panel rounded-3xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Why Convert WebVTT (.vtt) back to SubRip (.srt)?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            While WebVTT is optimized for online streaming, virtually all desktop video editing suites (such as Adobe Premiere Pro, Final Cut Pro, and DaVinci Resolve) and traditional media playback devices require SubRip (.srt). Converting WebVTT to SRT eliminates header syntax conflicts, strips complex CSS classes that can garble on-screen text, and guarantees cross-platform hardware playback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Video Editor Import Errors</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Many editors reject .vtt files because of the "WEBVTT" declaration line or cue metadata flags like <code className="text-blue-400 font-mono">line:0 position:20%</code>. Our tool purges all incompatible headers and produces pristine SubRip syntax.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Universal TV &amp; Player Compatibility</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart TVs, streaming boxes, and media servers (like Plex and Jellyfin) read .srt files automatically when placed in the same folder as the video file with matching filenames.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={TOOL_FAQS['vtt-to-srt']} />
    </div>
  );
}
