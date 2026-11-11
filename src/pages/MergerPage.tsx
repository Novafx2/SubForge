import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { CodeEditor } from '../components/common/CodeEditor';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { autoDetectAndParse, serializeToVtt } from '../utils/vttParser';
import { serializeToSrt } from '../utils/srtParser';
import { SubtitleCue } from '../types/subtitles';
import { formatDurationHuman } from '../utils/timeUtils';
import { TOOL_FAQS } from '../utils/seoData';
import { Layers, Combine, Languages, ArrowDown } from 'lucide-react';

const SAMPLE_PART_1 = `1
00:00:01,000 --> 00:00:04,000
This is Part 1 of our documentary film.

2
00:00:05,000 --> 00:00:08,000
Exploring the deep ocean trenches and marine ecosystems.
`;

const SAMPLE_PART_2 = `1
00:00:01,500 --> 00:00:04,800
Welcome back to Part 2 of our marine journey.

2
00:00:05,500 --> 00:00:09,000
Here we observe bioluminescent species in their natural habitat.
`;

const SAMPLE_ES = `1
00:00:01,000 --> 00:00:04,000
Esta es la Parte 1 de nuestra película documental.

2
00:00:05,000 --> 00:00:08,000
Explorando las fosas oceánicas profundas y los ecosistemas marinos.
`;

export function MergerPage() {
  const [file1Content, setFile1Content] = useState<string>(SAMPLE_PART_1);
  const [file1Name, setFile1Name] = useState<string>('part1.srt');

  const [file2Content, setFile2Content] = useState<string>(SAMPLE_PART_2);
  const [file2Name, setFile2Name] = useState<string>('part2.srt');

  const [mergeMode, setMergeMode] = useState<'sequential' | 'bilingual'>('sequential');
  const [customOffsetMs, setCustomOffsetMs] = useState<number>(0);
  const [useAutoOffset, setUseAutoOffset] = useState<boolean>(true);

  const parsed1 = useMemo(() => {
    if (!file1Content.trim()) return null;
    return autoDetectAndParse(file1Content);
  }, [file1Content]);

  const parsed2 = useMemo(() => {
    if (!file2Content.trim()) return null;
    return autoDetectAndParse(file2Content);
  }, [file2Content]);

  const file1Duration = useMemo(() => {
    if (!parsed1 || parsed1.cues.length === 0) return 0;
    return parsed1.cues[parsed1.cues.length - 1].endMs;
  }, [parsed1]);

  const mergedCues = useMemo<SubtitleCue[]>(() => {
    if (!parsed1) return [];
    if (!parsed2 || parsed2.cues.length === 0) return parsed1.cues;

    if (mergeMode === 'sequential') {
      const offset = useAutoOffset ? file1Duration : customOffsetMs;

      const shiftedPart2 = parsed2.cues.map((cue, idx) => ({
        ...cue,
        id: parsed1.cues.length + idx + 1,
        startMs: cue.startMs + offset,
        endMs: cue.endMs + offset,
      }));

      return [...parsed1.cues, ...shiftedPart2];
    } else {
      // Bilingual mode: For each cue in file 1, find overlapping cue in file 2
      const combined: SubtitleCue[] = [];

      for (let i = 0; i < parsed1.cues.length; i++) {
        const cue1 = parsed1.cues[i];
        // Find best matching cue in file 2 that overlaps with cue 1
        const match = parsed2.cues.find(
          (c2) => Math.abs(c2.startMs - cue1.startMs) < 2000 || (c2.startMs < cue1.endMs && c2.endMs > cue1.startMs)
        );

        const text2 = match ? match.text.trim() : '';
        const combinedText = text2 ? `${cue1.text.trim()}\n${text2}` : cue1.text.trim();

        combined.push({
          id: i + 1,
          startMs: cue1.startMs,
          endMs: cue1.endMs,
          text: combinedText,
        });
      }

      return combined;
    }
  }, [parsed1, parsed2, mergeMode, useAutoOffset, file1Duration, customOffsetMs]);

  const outputContent = useMemo(() => {
    if (mergedCues.length === 0) return '';
    return serializeToSrt(mergedCues);
  }, [mergedCues]);

  const handleLoadBilingualDemo = () => {
    setMergeMode('bilingual');
    setFile1Content(SAMPLE_PART_1);
    setFile1Name('english.srt');
    setFile2Content(SAMPLE_ES);
    setFile2Name('spanish.srt');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="Subtitle Merger – Combine Files or Create Bilingual Dual Subtitles"
        description="Combine two subtitle files into one. Append CD1 and CD2 movie parts with automatic timestamp offsets, or merge two languages into bilingual dual-caption subtitles."
        canonicalPath="/tools/merger"
        faqs={TOOL_FAQS['merger']}
      />

      <ToolHeader
        title="Subtitle Merger"
        tagline="Merge multiple subtitle files into one. Append multi-part video captions or combine two languages into stacked bilingual dual-language subtitles."
        categoryName="Creator Utilities"
        breadcrumbLabel="Subtitle Merger"
        supportedFormats=".srt, .vtt"
      />

      {/* Mode Selector Tabs */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 bg-[#0f172a]/70 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMergeMode('sequential')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              mergeMode === 'sequential'
                ? 'glass-pill-btn text-white'
                : 'text-slate-300 hover:text-white fintech-btn-secondary'
            }`}
          >
            <Combine className="w-4 h-4" />
            <span>Sequential Append (Part 1 + Part 2)</span>
          </button>

          <button
            type="button"
            onClick={() => setMergeMode('bilingual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              mergeMode === 'bilingual'
                ? 'glass-pill-btn text-white'
                : 'text-slate-300 hover:text-white fintech-btn-secondary'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>Bilingual Dual-Language (Side-by-Side)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleLoadBilingualDemo}
          className="text-xs text-purple-300 hover:text-cyan-300 font-medium px-3 py-1.5 rounded-full fintech-btn-secondary"
        >
          Load Dual-Language Demo (EN + ES)
        </button>
      </div>

      {/* Main Tool Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload 2 Files */}
        <div className="lg:col-span-6 space-y-6">
          {/* File 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="font-semibold text-white">
                {mergeMode === 'sequential' ? '1. First Subtitle File (Part 1)' : '1. Primary Language (Top Line)'}
              </span>
              {parsed1 && (
                <span className="text-slate-400 font-mono text-[11px]">
                  {parsed1.cues.length} cues ({formatDurationHuman(file1Duration)})
                </span>
              )}
            </div>
            <FileDropzone
              onContentLoaded={(content, name) => {
                setFile1Content(content);
                setFile1Name(name);
              }}
              acceptedFormats={['.srt', '.vtt', '.txt']}
              sampleContent={SAMPLE_PART_1}
              sampleFilename="part1.srt"
              label="Upload first subtitle file"
            />
          </div>

          <div className="flex justify-center -my-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-sm">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>

          {/* File 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="font-semibold text-white">
                {mergeMode === 'sequential' ? '2. Second Subtitle File (Part 2)' : '2. Secondary Language (Bottom Line)'}
              </span>
              {parsed2 && (
                <span className="text-slate-400 font-mono text-[11px]">
                  {parsed2.cues.length} cues
                </span>
              )}
            </div>
            <FileDropzone
              onContentLoaded={(content, name) => {
                setFile2Content(content);
                setFile2Name(name);
              }}
              acceptedFormats={['.srt', '.vtt', '.txt']}
              sampleContent={mergeMode === 'bilingual' ? SAMPLE_ES : SAMPLE_PART_2}
              sampleFilename={mergeMode === 'bilingual' ? 'spanish.srt' : 'part2.srt'}
              label="Upload second subtitle file"
            />
          </div>

          {/* Sequential Options */}
          {mergeMode === 'sequential' && (
            <div className="bg-[#0f172a]/70 rounded-xl border border-slate-800 p-4 space-y-3 text-xs">
              <div className="font-semibold text-slate-200">Part 2 Timestamp Offset</div>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAutoOffset}
                  onChange={(e) => setUseAutoOffset(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <span>Auto-offset by Part 1 End Duration (+{formatDurationHuman(file1Duration)})</span>
              </label>

              {!useAutoOffset && (
                <div>
                  <label className="block text-slate-400 mb-1">Custom Offset (milliseconds):</label>
                  <input
                    type="number"
                    value={customOffsetMs}
                    onChange={(e) => setCustomOffsetMs(parseInt(e.target.value, 10) || 0)}
                    aria-label="Custom offset in milliseconds"
                    className="w-full bg-[#080d1a] border border-slate-700/80 rounded-md px-3 py-1.5 font-mono text-slate-200"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Code Editor Output */}
        <div className="lg:col-span-6">
          <CodeEditor
            value={outputContent}
            filename="merged_subtitles.srt"
            formatName="Merged Subtitles (.srt)"
            cueCount={mergedCues.length}
            mimeType="text/plain;charset=utf-8"
          />
        </div>
      </div>

      <AdPlaceholder format="horizontal" />

      {/* Guide Section */}
      <section className="mt-16 bg-[#0c1322] border border-slate-800 rounded-xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Why Merge Subtitle Files?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Whether managing multi-part split video releases or building bilingual caption tracks for language education, SubForge merges subtitles seamlessly without requiring video re-encoding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">1. CD1 + CD2 Movie Concatenation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When movies were ripped in two halves (CD1 and CD2), the second subtitle file restarts its time at 00:00:00. Our sequential append mode computes the exact timestamp boundary and concatenates the cues into a single unified timeline.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">2. Dual Language / Bilingual Learning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Watching foreign films with both your native language and the target language on screen is one of the most effective language acquisition techniques. Our bilingual merger pairs matching cues into clean, two-line subtitles.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={TOOL_FAQS['merger']} />
    </div>
  );
}
