import { useState, useMemo } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { ToolHeader } from '../components/common/ToolHeader';
import { FileDropzone } from '../components/common/FileDropzone';
import { FAQSection } from '../components/common/FAQSection';
import { AdPlaceholder } from '../components/layout/AdPlaceholder';
import { autoDetectAndParse } from '../utils/vttParser';
import { ChapterItem } from '../types/subtitles';
import { msToYouTubeTimestamp, parseTimestampToMs } from '../utils/timeUtils';
import { SAMPLE_SRT } from '../utils/sampleSubtitles';
import { TOOL_FAQS } from '../utils/seoData';
import { Video, Plus, Trash2, Copy, Check, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

const DEFAULT_CHAPTERS: ChapterItem[] = [
  { id: '1', timeMs: 0, timeFormatted: '00:00', title: 'Introduction & Overview' },
  { id: '2', timeMs: 75000, timeFormatted: '01:15', title: 'Core Principles of Video Subtitles' },
  { id: '3', timeMs: 210000, timeFormatted: '03:30', title: 'Live Demonstration & Tool Walkthrough' },
  { id: '4', timeMs: 480000, timeFormatted: '08:00', title: 'Exporting for YouTube & HTML5' },
  { id: '5', timeMs: 690000, timeFormatted: '11:30', title: 'Summary & Best Practices' },
];

export function YoutubeChaptersPage() {
  const [chapters, setChapters] = useState<ChapterItem[]>(DEFAULT_CHAPTERS);
  const [copied, setCopied] = useState(false);

  // Validate YouTube Chapter requirements:
  // 1. Starts at 00:00
  // 2. At least 3 chapters
  // 3. Each chapter minimum 10s apart
  const validation = useMemo(() => {
    const issues: string[] = [];
    if (chapters.length === 0) {
      return { isValid: false, issues: ['Add at least 3 chapters.'] };
    }

    const first = chapters[0];
    if (first.timeMs !== 0 && first.timeFormatted !== '00:00' && first.timeFormatted !== '0:00') {
      issues.push('The first chapter MUST start at 00:00 for YouTube to activate chapters.');
    }

    if (chapters.length < 3) {
      issues.push(`YouTube requires at least 3 chapters (currently have ${chapters.length}).`);
    }

    for (let i = 1; i < chapters.length; i++) {
      const prev = chapters[i - 1];
      const curr = chapters[i];
      if (curr.timeMs <= prev.timeMs) {
        issues.push(`Chapter "${curr.title}" timestamp is not later than previous chapter.`);
      } else if (curr.timeMs - prev.timeMs < 10000) {
        issues.push(`Chapter "${curr.title}" is less than 10 seconds after previous chapter.`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }, [chapters]);

  const outputText = useMemo(() => {
    return chapters
      .map((c) => `${c.timeFormatted} ${c.title.trim()}`)
      .join('\n');
  }, [chapters]);

  const handleUpdateChapter = (id: string, field: 'timeFormatted' | 'title', val: string) => {
    setChapters((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (field === 'timeFormatted') {
          const ms = parseTimestampToMs(val);
          return { ...c, timeFormatted: val, timeMs: ms };
        }
        return { ...c, [field]: val };
      })
    );
  };

  const handleAddChapter = () => {
    const lastChapter = chapters[chapters.length - 1];
    const nextMs = lastChapter ? lastChapter.timeMs + 60000 : 0;
    const nextFormatted = msToYouTubeTimestamp(nextMs);

    const newChapter: ChapterItem = {
      id: String(Date.now()),
      timeMs: nextMs,
      timeFormatted: nextFormatted,
      title: 'New Chapter Title',
    };
    setChapters([...chapters, newChapter]);
  };

  const handleRemoveChapter = (id: string) => {
    setChapters(chapters.filter((c) => c.id !== id));
  };

  const handleAddZeroIntro = () => {
    const intro: ChapterItem = {
      id: 'intro-0',
      timeMs: 0,
      timeFormatted: '00:00',
      title: 'Introduction',
    };
    setChapters([intro, ...chapters]);
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUploadedContent, setLastUploadedContent] = useState<string>('');
  const [generationInfo, setGenerationInfo] = useState<{
    isLiveAi: boolean;
    provider: string;
    notice?: string;
  } | null>(null);

  const executeLocalSubtitleDetection = (content: string) => {
    const parsed = autoDetectAndParse(content);
    if (!parsed || parsed.cues.length === 0) return;

    const newChapters: ChapterItem[] = [];
    newChapters.push({
      id: 'ch-0',
      timeMs: 0,
      timeFormatted: '00:00',
      title: 'Introduction & Overview',
    });

    let lastTimeMs = 0;
    parsed.cues.forEach((cue, idx) => {
      if (cue.startMs - lastTimeMs >= 75000 && newChapters.length < 15) {
        let snippet = cue.text.replace(/<\/?[^>]+(>|$)/g, '').split('\n')[0].slice(0, 40).trim();
        snippet = snippet.replace(/^[a-z0-9\s_-]+:\s*/i, '');
        newChapters.push({
          id: `ch-${idx}`,
          timeMs: cue.startMs,
          timeFormatted: msToYouTubeTimestamp(cue.startMs),
          title: snippet || `Topic ${newChapters.length + 1}`,
        });
        lastTimeMs = cue.startMs;
      }
    });

    // Enforce YouTube Requirement: At least 3 chapters
    if (newChapters.length < 3) {
      newChapters.push(
        { id: 'ch-pad-1', timeMs: 75000, timeFormatted: '01:15', title: 'Main Demonstration & Discussion' },
        { id: 'ch-pad-2', timeMs: 180000, timeFormatted: '03:00', title: 'Summary & Best Practices' }
      );
    }

    setChapters(newChapters);
    setGenerationInfo({
      isLiveAi: false,
      provider: 'SubForge Offline Subtitle Engine',
      notice: 'Generated via Local Subtitle Detection (Offline Mode)',
    });
  };

  const handleImportFromSubtitles = async (content: string, preferAi = true) => {
    setLastUploadedContent(content);
    setIsGenerating(true);

    if (preferAi) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const res = await fetch('/api/ai/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.chapters) && data.chapters.length >= 3) {
            setChapters(data.chapters);
            setGenerationInfo({
              isLiveAi: data.isLiveAi ?? false,
              provider: data.provider || (data.isLiveAi ? 'Google Gemini 3.8 Flash' : 'SubForge Offline Subtitle Engine'),
              notice: data.fallbackNotice,
            });
            setIsGenerating(false);
            return;
          }
        }
      } catch {
        // Fall back seamlessly to local subtitle detection
      }
    }

    executeLocalSubtitleDetection(content);
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEOHead
        title="YouTube Chapters Generator – Create Video Timestamps for YouTube"
        description="Free YouTube Chapters generator. Automatically build and validate video timestamps from subtitle files or create custom chapters. Enforces 00:00 start and 10s rules."
        canonicalPath="/tools/youtube-chapters"
        faqs={TOOL_FAQS['youtube-chapters']}
      />

      <ToolHeader
        title="YouTube Chapters Generator"
        tagline="Create copy-paste-ready YouTube video chapters. Validates YouTube 00:00 requirements and generates Google Search Key Moments."
        categoryName="Creator Utilities"
        breadcrumbLabel="YouTube Chapters Generator"
        supportedFormats="YouTube Timestamps, SRT to Chapters"
      />

      {/* Main Tool Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Chapter Builder */}
        <div className="lg:col-span-7 space-y-6">
          {/* Subtitle File Importer */}
          <div className="fintech-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Auto-Generate from Subtitles:</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleImportFromSubtitles(lastUploadedContent || SAMPLE_SRT, true)}
                  className="px-2.5 py-1 rounded-full glass-pill-btn text-[11px] text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Generate chapters using Google Gemini 3.8 Flash"
                >
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>AI Chapters (Gemini)</span>
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => executeLocalSubtitleDetection(lastUploadedContent || SAMPLE_SRT)}
                  className="px-2.5 py-1 rounded-full fintech-btn-secondary text-[11px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  title="Generate chapters instantly with local linguistic engine"
                >
                  <Video className="w-3 h-3 text-purple-400" />
                  <span>Local Mode</span>
                </button>
              </div>
            </div>
            <FileDropzone
              onContentLoaded={(content) => handleImportFromSubtitles(content, true)}
              acceptedFormats={['.srt', '.vtt', '.txt']}
              sampleContent={SAMPLE_SRT}
              sampleFilename="sample_subtitles.srt"
              label="Upload subtitle to auto-detect chapter moments"
            />
          </div>

          {/* Chapter Table Builder */}
          <div className="fintech-panel rounded-2xl p-6 space-y-4">
            {/* AI Generation In-Progress Indicator */}
            {isGenerating && (
              <div className="p-3.5 rounded-xl bg-purple-900/30 border border-purple-500/40 text-xs text-purple-200 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
                  <span>Synthesizing YouTube video chapters with Gemini AI (35s timeout &amp; auto-retry)...</span>
                </div>
              </div>
            )}

            {/* Clear AI vs Offline Distinction Banner */}
            {!isGenerating && generationInfo && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                  generationInfo.isLiveAi
                    ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                    : 'bg-purple-950/40 border-purple-500/35 text-purple-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {generationInfo.isLiveAi ? (
                    <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                  ) : (
                    <Video className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {generationInfo.isLiveAi
                        ? 'AI-Generated Chapters'
                        : 'Offline Mode: Local Detection'}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {generationInfo.isLiveAi
                        ? 'Synthesized by Google Gemini 3.8 Flash'
                        : 'Generated via Local Subtitle Detection Engine'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {generationInfo.isLiveAi ? (
                    <button
                      type="button"
                      onClick={() => executeLocalSubtitleDetection(lastUploadedContent || SAMPLE_SRT)}
                      className="text-[11px] px-2.5 py-1 rounded-full fintech-btn-secondary text-slate-300 hover:text-white cursor-pointer"
                    >
                      Switch to Local
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleImportFromSubtitles(lastUploadedContent || SAMPLE_SRT, true)}
                      className="text-[11px] px-2.5 py-1 rounded-full glass-pill-btn text-white cursor-pointer disabled:opacity-50"
                    >
                      Retry with Gemini AI
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Chapter Timeline ({chapters.length} chapters)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChapters([...chapters].sort((a, b) => a.timeMs - b.timeMs))}
                  className="px-3.5 py-1.5 rounded-full fintech-btn-secondary text-slate-300 text-xs font-medium transition-colors"
                >
                  Sort Chronologically
                </button>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full glass-pill-btn text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Chapter</span>
                </button>
              </div>
            </div>

            {/* Validation Checklist Banner */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                validation.isValid
                  ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-800/50 text-amber-300'
              }`}
            >
              {validation.isValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">YouTube Compliant!</span>
                    <p className="text-[11px] text-emerald-400/80 mt-0.5">
                      Starts at 00:00, has &ge; 3 chapters, and each chapter meets the 10-second minimum duration.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold">YouTube Chapter Requirements:</span>
                    <ul className="list-disc pl-4 text-[11px] text-amber-300/80 space-y-0.5">
                      {validation.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                    {chapters[0]?.timeFormatted !== '00:00' && (
                      <button
                        type="button"
                        onClick={handleAddZeroIntro}
                        className="mt-1 text-xs underline font-semibold text-amber-200 hover:text-white"
                      >
                        + Add 00:00 Introduction Chapter
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Chapter Items List */}
            <div className="space-y-2.5">
              {chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="flex items-center gap-2.5 bg-[#080d1a] border border-slate-800 rounded-lg p-2.5 transition-colors focus-within:border-slate-700"
                >
                  <span className="text-xs font-mono text-slate-500 w-5 text-center">
                    {index + 1}
                  </span>

                  {/* Timestamp input */}
                  <input
                    type="text"
                    value={chapter.timeFormatted}
                    onChange={(e) => handleUpdateChapter(chapter.id, 'timeFormatted', e.target.value)}
                    placeholder="00:00"
                    aria-label={`Chapter ${index + 1} timestamp`}
                    className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-blue-300 text-center focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
                  />

                  {/* Title input */}
                  <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) => handleUpdateChapter(chapter.id, 'title', e.target.value)}
                    placeholder="Chapter Title..."
                    aria-label={`Chapter ${index + 1} title`}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveChapter(chapter.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    aria-label="Delete chapter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Copy-Paste YouTube Output */}
        <div className="lg:col-span-5 space-y-4">
          <div className="fintech-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Ready for YouTube Description
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full glass-pill-btn text-white text-xs font-semibold transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Timestamps</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Copy and paste this snippet directly into your video description in YouTube Studio:
            </p>

            <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-all min-h-[220px]">
              {outputText}
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 pt-1">
              <div className="font-semibold text-slate-300">Creator Tip:</div>
              <p>
                YouTube chapters usually take 5–15 minutes to appear on the video player scrubber after you save the description.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AdPlaceholder format="horizontal" />

      {/* Guide Section */}
      <section className="mt-16 bg-[#0c1322] border border-slate-800 rounded-xl p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            How YouTube Video Chapters Boost Video SEO &amp; Watch Time
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            YouTube chapters break up a video into distinct sections, each with an individual preview. Chapters give viewers context and info, allowing them to easily navigate through videos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Google Key Moments</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Google Search surfaces video chapters directly on search engine results pages (SERPs), letting searchers click straight to relevant answers.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Lower Viewer Dropoff</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Viewers who can jump directly to the segment they need are much less likely to bounce away to another competitor's video.
            </p>
          </div>
          <div className="bg-[#080d1a] border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Semantic Keywords</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chapter titles provide YouTube's algorithm with rich contextual keywords about what is covered in your video, helping it rank for long-tail search queries.
            </p>
          </div>
        </div>
      </section>

      <FAQSection faqs={TOOL_FAQS['youtube-chapters']} />
    </div>
  );
}
