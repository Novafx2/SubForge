import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { CodeEditor } from '../components/common/CodeEditor';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { autoDetectAndParse, serializeToVtt } from '../utils/vttParser';
import { serializeToSrt } from '../utils/srtParser';
import { msToSrtTimestamp, formatDurationHuman } from '../utils/timeUtils';
import { SAMPLE_SRT } from '../utils/sampleSubtitles';
import { TOOL_FAQS } from '../utils/seoData';
import { FastForward, Calculator, ArrowRight } from 'lucide-react';

interface FpsPreset {
  id: string;
  label: string;
  from: number;
  to: number;
  description: string;
}

const PRESETS: FpsPreset[] = [
  {
    id: '23.976-25',
    label: '23.976 → 25.000 FPS',
    from: 23.976,
    to: 25.0,
    description: 'Film/Web to European PAL TV (4.1% speedup)',
  },
  {
    id: '25-23.976',
    label: '25.000 → 23.976 FPS',
    from: 25.0,
    to: 23.976,
    description: 'European PAL TV to US Film/Web (4.1% slowdown)',
  },
  {
    id: '24-25',
    label: '24.000 → 25.000 FPS',
    from: 24.0,
    to: 25.0,
    description: 'Cinema 24fps to PAL TV (4% speedup)',
  },
  {
    id: '25-24',
    label: '25.000 → 24.000 FPS',
    from: 25.0,
    to: 24.0,
    description: 'PAL TV to Cinema 24fps',
  },
  {
    id: '23.976-29.97',
    label: '23.976 → 29.970 FPS',
    from: 23.976,
    to: 29.97,
    description: 'Film to NTSC Broadcast standard',
  },
  {
    id: '29.97-23.976',
    label: '29.970 → 23.976 FPS',
    from: 29.97,
    to: 23.976,
    description: 'NTSC Broadcast to Film',
  },
];

export function FpsConverterPage() {
  const [inputContent, setInputContent] = useState<string>(SAMPLE_SRT);
  const [fileName, setFileName] = useState<string>('sample_subtitles.srt');

  const [fromFps, setFromFps] = useState<number>(23.976);
  const [toFps, setToFps] = useState<number>(25.0);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('23.976-25');

  const ratio = useMemo(() => {
    if (!toFps || toFps <= 0 || isNaN(toFps) || !fromFps || isNaN(fromFps)) return 1;
    return fromFps / toFps;
  }, [fromFps, toFps]);

  const parsed = useMemo(() => {
    if (!inputContent.trim()) return null;
    return autoDetectAndParse(inputContent);
  }, [inputContent]);

  const convertedCues = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return [];

    return parsed.cues.map((cue) => {
      const newStart = Math.max(0, Math.round(cue.startMs * ratio));
      const duration = Math.max(200, Math.round((cue.endMs - cue.startMs) * ratio));
      const newEnd = newStart + duration;

      return {
        ...cue,
        startMs: newStart,
        endMs: newEnd,
      };
    });
  }, [parsed, ratio]);

  const outputContent = useMemo(() => {
    if (!parsed || convertedCues.length === 0) return '';
    if (parsed.format === 'vtt') {
      return serializeToVtt(convertedCues);
    }
    return serializeToSrt(convertedCues);
  }, [parsed, convertedCues]);

  const originalDuration = useMemo(() => {
    if (!parsed || parsed.cues.length === 0) return 0;
    return parsed.cues[parsed.cues.length - 1].endMs;
  }, [parsed]);

  const convertedDuration = useMemo(() => {
    if (convertedCues.length === 0) return 0;
    return convertedCues[convertedCues.length - 1].endMs;
  }, [convertedCues]);

  const handleSelectPreset = (preset: FpsPreset) => {
    setSelectedPresetId(preset.id);
    setFromFps(preset.from);
    setToFps(preset.to);
  };

  const targetFilename = fileName.replace(/\.[^/.]+$/, '') + `_${toFps}fps` + (parsed?.format === 'vtt' ? '.vtt' : '.srt');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="Subtitle FPS Converter – Convert Subtitle Framerates (23.976 to 25)"
        description="Convert subtitle framerates between 23.976, 24, 25, 29.97, and 30 FPS to fix timing drift. 100% private in-browser conversion for SRT and WebVTT."
        canonicalPath="/tools/fps-converter"
        faqs={TOOL_FAQS['fps-converter']}
      />

      <ToolHeader
        title="Subtitle FPS Converter"
        tagline="Convert subtitle framerates to fix cumulative drift caused by video speed differences (e.g. 23.976 fps film converted to 25 fps PAL broadcast)."
        categoryName="Sync &amp; Timing"
        breadcrumbLabel="Subtitle FPS Converter"
        supportedFormats=".srt, .vtt"
      />

      {/* Main Tool Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & FPS Controls */}
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

          {/* Framerate Selection Panel */}
          <div className="fintech-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <FastForward className="w-3.5 h-3.5 text-purple-400" />
              <span>Framerate Presets</span>
            </div>

            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`w-full text-left px-4 py-3 rounded-full border text-xs transition-all flex items-center justify-between ${
                    selectedPresetId === p.id
                      ? 'glass-pill-btn text-white'
                      : 'fintech-btn-secondary text-slate-300 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-[11px] text-purple-200/70">{p.description}</div>
                  </div>
                  {selectedPresetId === p.id && (
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#22d3ee]"></span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Framerate Numbers */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-300 mb-2">
                Custom Framerate Inputs:
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Source FPS:</label>
                  <input
                    type="number"
                    step="0.001"
                    value={fromFps}
                    onChange={(e) => {
                      setFromFps(parseFloat(e.target.value) || 0);
                      setSelectedPresetId('custom');
                    }}
                    aria-label="Source framerate in frames per second"
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-md px-3 py-1.5 font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target FPS:</label>
                  <input
                    type="number"
                    step="0.001"
                    value={toFps}
                    onChange={(e) => {
                      setToFps(parseFloat(e.target.value) || 0);
                      setSelectedPresetId('custom');
                    }}
                    aria-label="Target framerate in frames per second"
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-md px-3 py-1.5 font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Mathematical Ratio Display */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono bg-[#080d1a] p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-blue-400">
                <Calculator className="w-3.5 h-3.5" />
                <span>Multiplier:</span>
              </div>
              <span className="text-white font-semibold tabular-nums">{ratio.toFixed(6)}×</span>
            </div>

            {/* Duration delta stats */}
            {originalDuration > 0 && (
              <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                <span>Total Duration:</span>
                <span className="font-mono tabular-nums text-slate-300">
                  {formatDurationHuman(originalDuration)} → {formatDurationHuman(convertedDuration)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor Output */}
        <div className="lg:col-span-7">
          <CodeEditor
            value={outputContent}
            filename={targetFilename}
            formatName={parsed?.format === 'vtt' ? 'WebVTT (.vtt)' : 'SubRip (.srt)'}
            cueCount={convertedCues.length}
            mimeType="text/plain;charset=utf-8"
          />
        </div>
      </div>

      <AdPlaceholder format="horizontal" />

      {/* Guide Section */}
      <section className="mt-16 fintech-panel rounded-3xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Why Subtitle Framerate Conversion is Necessary
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Unlike audio and video tracks which store continuous waveform or frame sequences, subtitle files store static timestamp stamps (e.g., <code className="text-purple-300 font-mono">01:14:22,100</code>). When a movie filmed at 24 frames per second is converted to 25 frames per second for European PAL television, the film is sped up by approximately 4.1%. Over a 2-hour movie, this results in a desynchronization gap of almost <strong>5 full minutes</strong>!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">23.976 vs 24.000 FPS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              23.976 FPS (often referred to as 23.98) is the NTSC color standard derived from 24 FPS divided by 1.001. A 0.1% drift causes subtitles to lag by 7 seconds in a 2-hour movie.
            </p>
          </div>
          <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">25.000 FPS (PAL)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard for television broadcast in Europe, Australia, and parts of Asia. Converting film releases to PAL requires a 23.976 to 25 FPS scale adjustment.
            </p>
          </div>
          <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">29.970 FPS (NTSC)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard for television broadcast in North America and Japan. Converting theatrical films to 29.97 FPS without 3:2 pull-down requires precise retiming.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={TOOL_FAQS['fps-converter']} />
    </div>
  );
}
