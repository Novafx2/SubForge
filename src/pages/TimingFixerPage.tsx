import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { CodeEditor } from '../components/common/CodeEditor';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { autoDetectAndParse, serializeToVtt } from '../utils/vttParser';
import { serializeToSrt } from '../utils/srtParser';
import { msToSrtTimestamp, msToVttTimestamp } from '../utils/timeUtils';
import { SAMPLE_SRT } from '../utils/sampleSubtitles';
import { TOOL_FAQS } from '../utils/seoData';
import { Clock, Sliders, ArrowRight, RotateCcw } from 'lucide-react';
import { ToolAiEnhancement } from '../components/ai/ToolAiEnhancement';

export function TimingFixerPage() {
  const [inputContent, setInputContent] = useState<string>(SAMPLE_SRT);
  const [fileName, setFileName] = useState<string>('sample_subtitles.srt');

  // Shift settings
  const [shiftMs, setShiftMs] = useState<number>(1500); // default +1.5s
  const [driftFactor, setDriftFactor] = useState<number>(1.0); // 1.0 = no drift

  const parsed = useMemo(() => {
    if (!inputContent.trim()) return null;
    return autoDetectAndParse(inputContent);
  }, [inputContent]);

  const shiftedCues = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return [];
    const firstCueStart = parsed.cues[0].startMs;

    return parsed.cues.map((cue) => {
      // Linear drift stretch: time relative to first cue is multiplied by driftFactor
      const relativeStart = (cue.startMs - firstCueStart) * driftFactor;
      const relativeEnd = (cue.endMs - firstCueStart) * driftFactor;

      const newStart = Math.max(0, Math.round(firstCueStart + relativeStart + shiftMs));
      const duration = Math.max(200, Math.round((cue.endMs - cue.startMs) * driftFactor));
      const newEnd = Math.max(newStart + 200, newStart + duration);

      return {
        ...cue,
        startMs: newStart,
        endMs: newEnd,
      };
    });
  }, [parsed, shiftMs, driftFactor]);

  const outputContent = useMemo(() => {
    if (!parsed || shiftedCues.length === 0) return '';
    if (parsed.format === 'vtt') {
      return serializeToVtt(shiftedCues);
    }
    return serializeToSrt(shiftedCues);
  }, [parsed, shiftedCues]);

  const targetFilename = fileName.replace(/\.[^/.]+$/, '') + '_synced' + (parsed?.format === 'vtt' ? '.vtt' : '.srt');

  const addShift = (delta: number) => {
    setShiftMs((prev) => prev + delta);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="Subtitle Timing Fixer – Shift, Delay & Fix Subtitle Sync"
        description="Easily fix out-of-sync subtitles. Delay or advance subtitle cues by exact milliseconds or seconds. Correct gradual audio-video drift with linear time stretching. Works with SRT and VTT."
        canonicalPath="/tools/timing-fixer"
        faqs={TOOL_FAQS['timing-fixer']}
      />

      <ToolHeader
        title="Subtitle Timing Fixer"
        tagline="Shift subtitle cues forward or backward with millisecond accuracy. Correct sync lag and progressive drift across your entire video file."
        categoryName="Sync &amp; Timing"
        breadcrumbLabel="Subtitle Timing Fixer"
        supportedFormats=".srt, .vtt"
      />

      {/* Main Tool Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Sync Controls */}
        <div className="lg:col-span-5 space-y-6">
          <FileDropzone
            onContentLoaded={(content, name) => {
              setInputContent(content);
              setFileName(name);
            }}
            acceptedFormats={['.srt', '.vtt', '.txt']}
            sampleContent={SAMPLE_SRT}
            sampleFilename="sample_subtitles.srt"
            label="Upload SRT or WebVTT subtitle file"
          />

          {/* Time Offset Controller */}
          <div className="fintech-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Shift Offset</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShiftMs(0);
                  setDriftFactor(1.0);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full fintech-btn-secondary text-[11px] text-slate-300 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Shift Numeric Input */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Time Offset:</span>
                <span className="font-mono text-purple-300 font-semibold tabular-nums">
                  {shiftMs > 0 ? `+${shiftMs} ms (+${(shiftMs / 1000).toFixed(2)}s)` : `${shiftMs} ms (${(shiftMs / 1000).toFixed(2)}s)`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="100"
                  value={shiftMs}
                  onChange={(e) => setShiftMs(parseInt(e.target.value, 10) || 0)}
                  aria-label="Time offset in milliseconds"
                  className="w-full pl-3 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none tabular-nums"
                />
                <span className="text-xs text-slate-400 shrink-0">milliseconds</span>
              </div>
            </div>

            {/* Quick Shift Button Matrix */}
            <div>
              <div className="text-[11px] text-slate-400 font-medium mb-2">
                Quick Adjustments:
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => addShift(-1000)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  -1.0s
                </button>
                <button
                  type="button"
                  onClick={() => addShift(-500)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  -500ms
                </button>
                <button
                  type="button"
                  onClick={() => addShift(500)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  +500ms
                </button>
                <button
                  type="button"
                  onClick={() => addShift(1000)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  +1.0s
                </button>
                <button
                  type="button"
                  onClick={() => addShift(-2000)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  -2.0s
                </button>
                <button
                  type="button"
                  onClick={() => addShift(-250)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  -250ms
                </button>
                <button
                  type="button"
                  onClick={() => addShift(250)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  +250ms
                </button>
                <button
                  type="button"
                  onClick={() => addShift(2000)}
                  className="px-2.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 hover:text-white transition-colors text-center"
                >
                  +2.0s
                </button>
              </div>
            </div>

            {/* Optional Drift Stretch */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Linear Drift Ratio:</span>
                <span className="font-mono text-slate-400 tabular-nums">{(driftFactor * 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0.95"
                max="1.05"
                step="0.001"
                value={driftFactor}
                onChange={(e) => setDriftFactor(parseFloat(e.target.value))}
                aria-label="Linear drift ratio slider"
                className="w-full accent-blue-600 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0.95 (Speed Up 5%)</span>
                <span>1.0 (Normal)</span>
                <span>1.05 (Slow Down 5%)</span>
              </div>
            </div>
          </div>

          {/* Timestamp Comparison Inspector */}
          {parsed && parsed.cues.length > 0 && (
            <div className="fintech-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>Live Timestamp Comparison</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {parsed.cues.slice(0, 3).map((originalCue, idx) => {
                  const shifted = shiftedCues[idx];
                  if (!shifted) return null;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Cue #{idx + 1}</span>
                        <span className="text-slate-500 truncate max-w-[150px]">{originalCue.text.slice(0, 20)}...</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300 tabular-nums">
                        <span className="text-slate-400">{msToSrtTimestamp(originalCue.startMs)}</span>
                        <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-purple-300 font-semibold">{msToSrtTimestamp(shifted.startMs)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Local AI Subtitle Assistant */}
          <ToolAiEnhancement
            currentText={inputContent}
            onApplyOutput={(newText) => setInputContent(newText)}
            toolName="Subtitle Timing"
          />
        </div>

        {/* Right Column: Code Editor Output */}
        <div className="lg:col-span-7">
          <CodeEditor
            value={outputContent}
            filename={targetFilename}
            formatName={parsed?.format === 'vtt' ? 'WebVTT (.vtt)' : 'SubRip (.srt)'}
            cueCount={shiftedCues.length}
            mimeType="text/plain;charset=utf-8"
          />
        </div>
      </div>

      <AdPlaceholder format="horizontal" />

      {/* Guide Section */}
      <section className="mt-16 fintech-panel rounded-3xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            How to Fix Out-of-Sync Subtitles
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            There are two primary types of subtitle synchronization issues: <strong>Constant Delay</strong> and <strong>Linear Drift</strong>. Knowing which issue you have makes fixing it simple.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">1. Constant Offset (Fixed Delay)</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              The subtitles are uniformly delayed or premature throughout the entire video by the exact same amount of time from beginning to end.
            </p>
            <p className="text-xs text-purple-300 font-mono">
              Fix: Add a positive offset (+ms) if captions show up too early, or a negative offset (-ms) if they show up too late.
            </p>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">2. Progressive Drift (Framerate Mismatch)</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              The subtitles match at the start of the video, but gradually slip out of sync as the video plays, becoming completely out of sync by the end.
            </p>
            <p className="text-xs text-purple-300 font-mono">
              Fix: Use our Linear Drift Ratio slider or switch to our Subtitle FPS Converter tool to adjust the speed to match video framerate.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={TOOL_FAQS['timing-fixer']} />
    </div>
  );
}
