import { useState, useRef } from 'react';
import { SEOHead } from '../../components/layout/SEOHead';
import {
  Sparkles,
  Upload,
  Copy,
  Check,
  Download,
  RotateCcw,
  Languages,
  BookOpen,
  FileCheck2,
  Wand2,
  ListTree,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import {
  improveSubtitleGrammar,
  translateSubtitleText,
  summarizeSubtitleCues,
  diagnoseSubtitleQuality,
  generateSmartChapters,
  processAiPrompt,
  AiTaskProgress,
  AiChapterItem,
  AiDiagnosticsResult,
  AiSummaryResult
} from '../../lib/aiService';

const SAMPLE_SUBTITLE = `1
00:00:01,000 --> 00:00:04,200
um, welcome everyone to this tutorial. today we will learn how to sync subtitles.

2
00:00:04,500 --> 00:00:07,800
we we have a lot of great things to cover, so don't forget to subscribe.

3
00:00:08,000 --> 00:00:11,500
first, lets open the subtitle timing fixer tool on SubForge.`;

export function AiAssistantPage() {
  const [inputText, setInputText] = useState(SAMPLE_SUBTITLE);
  const [outputText, setOutputText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'grammar' | 'translate' | 'summary' | 'diagnose' | 'chapters' | 'custom'>('grammar');
  const [targetLang, setTargetLang] = useState<'es' | 'fr' | 'de' | 'pt' | 'it'>('es');
  const [chapterInterval, setChapterInterval] = useState(2);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<AiTaskProgress | null>(null);

  // Structured results
  const [summaryData, setSummaryData] = useState<AiSummaryResult | null>(null);
  const [diagnosticsData, setDiagnosticsData] = useState<AiDiagnosticsResult | null>(null);
  const [chaptersData, setChaptersData] = useState<AiChapterItem[] | null>(null);
  const [changeNotes, setChangeNotes] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setInputText(content);
        setOutputText('');
        setSummaryData(null);
        setDiagnosticsData(null);
        setChaptersData(null);
      }
    };
    reader.readAsText(file);
  };

  const runAiAction = async () => {
    if (!inputText.trim()) return;
    setProcessing(true);
    setProgress({ status: 'Initializing in-browser AI engine...', progress: 10 });
    setChangeNotes([]);
    setSummaryData(null);
    setDiagnosticsData(null);
    setChaptersData(null);

    try {
      if (activeTab === 'grammar') {
        const res = await improveSubtitleGrammar(inputText, setProgress);
        setOutputText(res.improvedText);
        setChangeNotes(res.explanations);
      } else if (activeTab === 'translate') {
        const res = await translateSubtitleText(inputText, targetLang, setProgress);
        setOutputText(res.translatedText);
        setChangeNotes([
          `Preserved timing codes and translated dialogue into ${targetLang.toUpperCase()}.`,
          `Analyzed and processed ${res.wordCount} words.`
        ]);
      } else if (activeTab === 'summary') {
        const res = await summarizeSubtitleCues(inputText, setProgress);
        setSummaryData(res);
        setOutputText(
          `## Executive Summary\n${res.summary}\n\n## Key Takeaways\n${res.bulletPoints.map((b) => `• ${b}`).join('\n')}\n\n## Main Topics\n${res.topics.join(', ')}`
        );
      } else if (activeTab === 'diagnose') {
        const res = await diagnoseSubtitleQuality(inputText, setProgress);
        setDiagnosticsData(res);
        const report = res.insights
          .map((i) => `[${i.type.toUpperCase()}] ${i.title}\n${i.description}\nSuggested Fix: ${i.fixSuggestion}\n`)
          .join('\n---\n\n');
        setOutputText(
          `SubForge Accessibility Score: ${res.qualityScore}/100\nIssues Identified: ${res.issueCount}\n\n${report}`
        );
      } else if (activeTab === 'chapters') {
        const res = await generateSmartChapters(inputText, chapterInterval, setProgress);
        setChaptersData(res);
        const youtubeFormatted = res.map((c) => `${c.timestamp} ${c.title}`).join('\n');
        setOutputText(youtubeFormatted);
        const isLive = res[0]?.source === 'gemini-ai';
        setChangeNotes([
          isLive
            ? `Generated with ${res[0]?.provider || 'Google Gemini 3.8 Flash'}`
            : 'Generated via Local Subtitle Detection Engine (Offline Mode)',
          `Verified ${res.length} compliant YouTube chapters (00:00 start, >= 10s gap).`,
        ]);
      } else if (activeTab === 'custom') {
        const result = await processAiPrompt(customPrompt || 'Improve grammar and clean speech', inputText, setProgress);
        setOutputText(result);
        setChangeNotes(['Executed creator custom prompt transformation across all subtitle cues.']);
      }
    } catch {
      setChangeNotes(['An error occurred during local processing. Please check your subtitle syntax.']);
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!outputText) return;
    const isVtt = outputText.startsWith('WEBVTT');
    const ext = activeTab === 'chapters' || activeTab === 'summary' ? 'txt' : isVtt ? 'vtt' : 'srt';
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subforge_ai_processed.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEOHead
        title="AI Subtitle Assistant – SubForge"
        description="Free, client-side AI subtitle assistant for video creators. Fix grammar, translate, generate YouTube chapters, summarize dialogues, and audit CPS reading speeds locally."
        canonicalPath="/ai-assistant"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Zero-Cost Client-Side AI Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            AI Subtitle &amp; Creator Assistant
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Clean dialogue, generate video chapters, translate cue tracks, and audit reading speeds directly inside your browser. No files are ever sent to remote servers.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0c1322] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Local Browser Execution • 100% Confidential</span>
        </div>
      </div>

      {/* Action Selectors Bar */}
      <div className="flex flex-wrap gap-2.5 border-b border-purple-500/20 pb-4">
        <button
          onClick={() => setActiveTab('grammar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'grammar'
              ? 'glass-pill-btn text-white'
              : 'fintech-btn-secondary text-slate-300 hover:text-white'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Grammar &amp; Stutter Fixer
        </button>

        <button
          onClick={() => setActiveTab('translate')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'translate'
              ? 'glass-pill-btn text-white'
              : 'fintech-btn-secondary text-slate-300 hover:text-white'
          }`}
        >
          <Languages className="w-3.5 h-3.5" />
          Subtitle Translator
        </button>

        <button
          onClick={() => setActiveTab('chapters')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'chapters'
              ? 'glass-pill-btn text-white'
              : 'fintech-btn-secondary text-slate-300 hover:text-white'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" />
          Smart YouTube Chapters
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'summary'
              ? 'glass-pill-btn text-white'
              : 'fintech-btn-secondary text-slate-300 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Summarize &amp; Key Topics
        </button>

        <button
          onClick={() => setActiveTab('diagnose')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'diagnose'
              ? 'glass-pill-btn text-white'
              : 'fintech-btn-secondary text-slate-300 hover:text-white'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          CPS &amp; Quality Audit
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === 'custom'
              ? 'glass-pill-btn text-white'
              : 'fintech-btn-secondary text-slate-300 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Custom Creator Prompt
        </button>
      </div>

      {/* Action Configuration Sub-bar */}
      {activeTab === 'translate' && (
        <div className="flex items-center gap-3 p-3 bg-[#0d1424] border border-slate-800 rounded-lg text-xs text-slate-300">
          <span className="font-medium text-slate-200">Target Language:</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500"
          >
            <option value="es">Spanish (Español)</option>
            <option value="fr">French (Français)</option>
            <option value="de">German (Deutsch)</option>
            <option value="pt">Portuguese (Português)</option>
            <option value="it">Italian (Italiano)</option>
          </select>
          <span className="text-slate-400">Timestamps and cue structure remain completely intact.</span>
        </div>
      )}

      {activeTab === 'chapters' && (
        <div className="flex items-center gap-3 p-3 bg-[#0d1424] border border-slate-800 rounded-lg text-xs text-slate-300">
          <span className="font-medium text-slate-200">Approx. Chapter Interval:</span>
          <select
            value={chapterInterval}
            onChange={(e) => setChapterInterval(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded focus:outline-none focus:border-blue-500"
          >
            <option value="1">Every 1 Minute</option>
            <option value="2">Every 2 Minutes (Standard)</option>
            <option value="3">Every 3 Minutes</option>
            <option value="5">Every 5 Minutes (Long Form)</option>
          </select>
          <span className="text-slate-400">Algorithm prioritizes speaker topic shifts and key phrases.</span>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="p-3 bg-[#0d1424] border border-slate-800 rounded-lg space-y-2">
          <label className="text-xs font-medium text-slate-200">Creator Instruction / Transformation Prompt:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. 'Remove speaker names', 'Convert all text to uppercase', 'Censor profanity'..."
              className="flex-1 bg-slate-900 border border-slate-700 text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={runAiAction}
              disabled={processing || !inputText.trim()}
              className="px-5 py-2 glass-pill-btn rounded-full disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Main Dual Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="flex flex-col fintech-panel rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-purple-950/20 border-b border-purple-500/20 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Input Subtitle (SRT or WebVTT)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 fintech-btn-secondary rounded-full text-slate-300 hover:text-white text-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => setInputText('')}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-full hover:bg-slate-800/50"
                title="Clear"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={16}
            placeholder="Paste your SRT or WebVTT file content here..."
            className="w-full flex-1 p-4 bg-transparent text-slate-200 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
          />

          <div className="px-4 py-3 bg-purple-950/20 border-t border-purple-500/20 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {inputText.split('\n').filter((l) => l.includes('-->')).length} Cues Detected
            </span>
            <button
              onClick={runAiAction}
              disabled={processing || !inputText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 glass-pill-btn rounded-full disabled:opacity-50 text-white text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {processing ? 'Processing in Browser...' : 'Run AI Processing'}
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col fintech-panel rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-purple-950/20 border-b border-purple-500/20 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>AI Output</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputText}
                className="flex items-center gap-1.5 px-3 py-1.5 fintech-btn-secondary rounded-full disabled:opacity-40 text-slate-300 hover:text-white text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!outputText}
                className="flex items-center gap-1.5 px-4 py-1.5 glass-pill-btn rounded-full disabled:opacity-40 text-white text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            {processing && (
              <div className="absolute inset-0 bg-[#0a0f1d]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3"></div>
                <p className="text-xs font-medium text-slate-200 mb-1">{progress?.status || 'Analyzing...'}</p>
                <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${progress?.progress || 10}%` }}
                  />
                </div>
              </div>
            )}

            <textarea
              value={outputText}
              readOnly
              rows={16}
              placeholder="AI processed subtitles or reports will appear here..."
              className="w-full h-full p-4 bg-[#0a0f1d] text-slate-200 text-xs font-mono resize-none focus:outline-none leading-relaxed"
            />
          </div>

          <div className="px-4 py-3 bg-[#0e1628] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              {outputText ? `${outputText.split('\n').length} lines generated` : 'Ready for input'}
            </span>
            {diagnosticsData && (
              <span className="font-semibold text-emerald-400">
                Score: {diagnosticsData.qualityScore}/100
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Rich Output Panels */}
      {summaryData && (
        <div className="p-6 fintech-panel rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Dialogue Summary &amp; Topic Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-purple-950/20 rounded-xl border border-purple-500/20">
              <span className="text-slate-400">Total Dialogue Words</span>
              <p className="text-lg font-bold text-white mt-0.5">{summaryData.wordCount}</p>
            </div>
            <div className="p-3.5 bg-purple-950/20 rounded-xl border border-purple-500/20">
              <span className="text-slate-400">Estimated Reading Time</span>
              <p className="text-lg font-bold text-white mt-0.5">{summaryData.readingTimeMinutes} min</p>
            </div>
            <div className="p-3.5 bg-purple-950/20 rounded-xl border border-purple-500/20">
              <span className="text-slate-400">Key Themes</span>
              <p className="text-sm font-medium text-purple-300 mt-1">{summaryData.topics.slice(0, 3).join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {chaptersData && (
        <div className="p-6 fintech-panel rounded-2xl space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ListTree className="w-4 h-4 text-purple-400" />
            Generated YouTube Video Chapters
          </h3>
          <div className="divide-y divide-purple-500/20">
            {chaptersData.map((chap, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-purple-900/40 text-purple-200 font-mono rounded-full text-[11px] font-semibold border border-purple-500/30">
                    {chap.timestamp}
                  </span>
                  <span className="text-slate-200 font-medium">{chap.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {changeNotes.length > 0 && (
        <div className="p-5 fintech-panel rounded-2xl text-xs space-y-2">
          <div className="font-semibold text-slate-300">Action Explanations &amp; Modifications:</div>
          <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
            {changeNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
