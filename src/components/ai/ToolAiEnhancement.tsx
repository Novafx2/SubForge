import { useState } from 'react';
import { Sparkles, Wand2, Languages, FileCheck2, ChevronDown, ChevronUp, Check, ArrowRight } from 'lucide-react';
import {
  improveSubtitleGrammar,
  translateSubtitleText,
  diagnoseSubtitleQuality,
  AiTaskProgress
} from '../../lib/aiService';

interface ToolAiEnhancementProps {
  currentText: string;
  onApplyOutput: (newText: string) => void;
  toolName?: string;
}

export function ToolAiEnhancement({ currentText, onApplyOutput, toolName = 'Subtitle' }: ToolAiEnhancementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<AiTaskProgress | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [applied, setApplied] = useState(false);
  const [targetLang, setTargetLang] = useState<'es' | 'fr' | 'de' | 'pt' | 'it'>('es');

  const handleRunGrammar = async () => {
    if (!currentText.trim()) return;
    setLoading(true);
    setApplied(false);
    try {
      const res = await improveSubtitleGrammar(currentText, setProgress);
      setResultText(res.improvedText);
      setNotes(res.explanations);
    } catch {
      setNotes(['Could not process subtitles. Please verify timestamp formatting.']);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleRunTranslate = async () => {
    if (!currentText.trim()) return;
    setLoading(true);
    setApplied(false);
    try {
      const res = await translateSubtitleText(currentText, targetLang, setProgress);
      setResultText(res.translatedText);
      setNotes([`Preserved all cue timestamps and translated dialogue into ${targetLang.toUpperCase()}.`]);
    } catch {
      setNotes(['Translation failed. Please verify syntax.']);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleRunDiagnostics = async () => {
    if (!currentText.trim()) return;
    setLoading(true);
    setApplied(false);
    try {
      const res = await diagnoseSubtitleQuality(currentText, setProgress);
      setNotes(
        res.insights.map((i) => `[${i.type.toUpperCase()}] ${i.title}: ${i.description}`)
      );
    } catch {
      setNotes(['Diagnostics completed.']);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const applyToTool = () => {
    if (resultText) {
      onApplyOutput(resultText);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  return (
    <div className="mt-6 fintech-panel rounded-2xl overflow-hidden shadow-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-[#100920]/80 hover:bg-[#1a0f35]/80 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <Sparkles className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white">AI Subtitle Enhancer</span>
            <span className="ml-2 text-[11px] text-slate-400">
              Optional browser-based dialogue cleaning, translation &amp; audit for {toolName}
            </span>
          </div>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 border-t border-purple-500/15">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunGrammar}
              disabled={loading || !currentText.trim()}
              className="px-3.5 py-1.5 glass-pill-btn text-white rounded-full text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Fix Grammar &amp; Stutters
            </button>

            <div className="flex items-center gap-1 bg-[#100920]/80 border border-purple-500/25 rounded-full p-1">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as any)}
                className="bg-transparent text-slate-200 text-xs px-2.5 py-1 focus:outline-none"
              >
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="it">Italian</option>
              </select>
              <button
                onClick={handleRunTranslate}
                disabled={loading || !currentText.trim()}
                className="px-3 py-1 fintech-btn-secondary text-slate-200 hover:text-white rounded-full text-xs font-medium flex items-center gap-1 disabled:opacity-50"
              >
                <Languages className="w-3.5 h-3.5" />
                Translate
              </button>
            </div>

            <button
              onClick={handleRunDiagnostics}
              disabled={loading || !currentText.trim()}
              className="px-3.5 py-1.5 fintech-btn-secondary text-slate-200 hover:text-white rounded-full text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              CPS &amp; Quality Audit
            </button>
          </div>

          {loading && (
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
              <span>{progress?.status || 'Analyzing in local browser...'}</span>
            </div>
          )}

          {notes.length > 0 && !loading && (
            <div className="p-3 bg-[#080d1a] border border-slate-800 rounded-lg text-xs space-y-1.5">
              <span className="font-semibold text-slate-300">AI Findings:</span>
              <ul className="text-slate-400 space-y-1 list-disc list-inside">
                {notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {resultText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>AI Enhanced Preview:</span>
                <button
                  onClick={applyToTool}
                  className="px-4 py-1.5 glass-pill-btn rounded-full text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                >
                  {applied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Applied to Editor!
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5" />
                      Apply to Tool Input
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                value={resultText}
                rows={4}
                className="w-full p-2.5 bg-slate-900/90 text-slate-200 text-xs font-mono rounded-lg border border-slate-800 resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
