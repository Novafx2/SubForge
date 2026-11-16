import React, { useRef, useState } from 'react';
import {
  Film,
  Scissors,
  Type,
  Captions,
  Music,
  Palette,
  Sparkles,
  Download,
  Upload,
  Plus,
  Wand2,
  Languages,
  FileDown,
  Volume2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Minimize2,
  FileAudio,
  XCircle,
  Activity,
  SlidersHorizontal,
  Copy,
  ClipboardPaste,
  Trash2,
  Mic,
  Square,
  AudioWaveform,
  Stamp,
  Clapperboard,
  KeyRound,
  Image as ImageIcon,
} from 'lucide-react';
import {
  COMPRESSION_PRESETS,
  CompressionPreset,
  DEFAULT_AUDIO_DSP,
  ExportFps,
  ExportFormat,
  ExportResolution,
  FILTER_PRESETS,
  FilterPresetId,
  MediaAsset,
  SPEED_RAMP_PRESETS,
  SUBTITLE_STYLE_PRESETS,
  SpeedRampPreset,
  StudioToolTab,
  SubtitlePresetStyleId,
  TRANSITION_OPTIONS,
  TransitionType,
  VideoClip,
  VideoProjectState,
  WORKFLOW_PRESETS,
  WorkflowPresetId,
  getClipDurationMs,
} from '../../types/videoStudio';
import {
  BUILTIN_AUDIO_LIBRARY,
  BuiltinAudioDescriptor,
} from '../../lib/videoStudio/audioEngine';
import {
  ExportProgressUpdate,
  ExportResult,
  estimateExportSizeMb,
} from '../../lib/videoStudio/ffmpegPipeline';
import { MotionPresetId } from '../../lib/videoStudio/studioReducer';
import { formatStudioTimecode } from './StudioPreviewPlayer';

interface StudioLeftPanelProps {
  activeTab: StudioToolTab;
  onSelectTab: (tab: StudioToolTab) => void;
  project: VideoProjectState;
  assets: MediaAsset[];
  currentTimeMs: number;
  selectedClipId: string | null;
  activeClip: VideoClip | null;
  hasCopiedEffects: boolean;
  onTriggerFilePicker: () => void;
  onUploadLogoFile: (file: File) => void;
  onLoadSampleClip: () => void;
  isGeneratingSample: boolean;
  onAddAssetToTimeline: (asset: MediaAsset) => void;
  onSplitAtPlayhead: () => void;
  onMarkInAtPlayhead: () => void;
  onMarkOutAtPlayhead: () => void;
  onMergeClips: () => void;
  onDuplicateSelectedClip: () => void;
  onRippleDeleteSelectedClip: () => void;
  onCopyClipEffects: () => void;
  onPasteClipEffects: () => void;
  onSetFitMode: (mode: VideoProjectState['fitMode']) => void;
  onAddKeyframeAtPlayhead: () => void;
  onApplyMotionPreset: (preset: MotionPresetId) => void;
  onSetClipSpeedRamp: (ramp: SpeedRampPreset) => void;
  onSetClipTransition: (transitionIn: TransitionType, durationMs?: number) => void;
  onUpdateClipAudioDsp: (patch: Partial<typeof DEFAULT_AUDIO_DSP>) => void;
  onAddTextOverlay: (
    preset: 'title' | 'lower-third' | 'caption' | 'badge' | 'logo',
    options?: { animation?: VideoProjectState['textOverlays'][number]['animation']; text?: string }
  ) => void;
  onInsertTemplate: (kind: 'intro' | 'outro') => void;
  onSelectOverlay: (id: string) => void;
  onAddSubtitleCueAtPlayhead: () => void;
  onImportSubtitleFile: (file: File) => void;
  onExportSubtitleFile: (fmt: 'srt' | 'vtt') => void;
  onToggleSubtitleBurnIn: (enabled: boolean) => void;
  onApplySubtitlePreset: (presetId: Exclude<SubtitlePresetStyleId, 'custom'>) => void;
  onSelectSubtitleIndex: (index: number) => void;
  onTranslateSubtitles: (targetLang: string, targetLangName: string, mode: 'ai' | 'offline') => Promise<void>;
  isTranslating: boolean;
  translationStatus: { type: 'success' | 'error'; message: string } | null;
  aiOnline: boolean | null;
  onAddBuiltinAudio: (desc: BuiltinAudioDescriptor) => Promise<void>;
  onPreviewBuiltinAudio: (desc: BuiltinAudioDescriptor) => Promise<void>;
  addingAudioId: string | null;
  isRecordingMic: boolean;
  micRecordingSec: number;
  micError: string | null;
  onStartMicRecording: () => void;
  onStopMicRecording: () => void;
  onSetAudioDucking: (amount: number) => void;
  isDetectingBeats: boolean;
  onDetectBeats: () => void;
  onAlignSubtitlesToBeats: () => void;
  onApplyColorPreset: (preset: FilterPresetId) => void;
  onUpdateColor: (patch: Partial<VideoProjectState['colorGrading']>) => void;
  onUpdateEffects: (patch: Partial<VideoProjectState['visualEffects']>) => void;
  onApplyWorkflowPreset: (presetId: WorkflowPresetId) => void;
  onUpdateExportSettings: (patch: Partial<VideoProjectState['exportSettings']>) => void;
  onStartExport: () => void;
  onCancelExport: () => void;
  isExporting: boolean;
  exportProgress: ExportProgressUpdate | null;
  exportError: string | null;
  exportResult: ExportResult | null;
  onQuickCompressSelected: () => void;
  isCompressing: boolean;
  compressProgress: string | null;
  compressResult: ExportResult | null;
  onExtractAudioSelected: (format: 'wav' | 'mp3') => void;
  isExtractingAudio: boolean;
}

const TOOL_TABS: Array<{ id: StudioToolTab; label: string; icon: any }> = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'edit', label: 'Edit', icon: Scissors },
  { id: 'animate', label: 'Animate', icon: Activity },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'subtitles', label: 'Captions', icon: Captions },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'effects', label: 'FX', icon: Sparkles },
  { id: 'presets', label: 'Presets', icon: SlidersHorizontal },
  { id: 'export', label: 'Export', icon: Download },
];

const TRANSLATE_LANGUAGES = [
  { code: 'es', name: 'Spanish', offlineSupported: true },
  { code: 'fr', name: 'French', offlineSupported: true },
  { code: 'de', name: 'German', offlineSupported: true },
  { code: 'pt', name: 'Portuguese', offlineSupported: true },
  { code: 'it', name: 'Italian', offlineSupported: true },
  { code: 'ar', name: 'Arabic', offlineSupported: false },
  { code: 'hi', name: 'Hindi', offlineSupported: false },
  { code: 'ja', name: 'Japanese', offlineSupported: false },
  { code: 'ko', name: 'Korean', offlineSupported: false },
];

export function StudioLeftPanel(props: StudioLeftPanelProps) {
  const {
    activeTab,
    onSelectTab,
    project,
    assets,
    currentTimeMs,
    selectedClipId,
    activeClip,
    hasCopiedEffects,
    onTriggerFilePicker,
    onUploadLogoFile,
    onLoadSampleClip,
    isGeneratingSample,
    onAddAssetToTimeline,
    onSplitAtPlayhead,
    onMarkInAtPlayhead,
    onMarkOutAtPlayhead,
    onMergeClips,
    onDuplicateSelectedClip,
    onRippleDeleteSelectedClip,
    onCopyClipEffects,
    onPasteClipEffects,
    onSetFitMode,
    onAddKeyframeAtPlayhead,
    onApplyMotionPreset,
    onSetClipSpeedRamp,
    onSetClipTransition,
    onUpdateClipAudioDsp,
    onAddTextOverlay,
    onInsertTemplate,
    onSelectOverlay,
    onAddSubtitleCueAtPlayhead,
    onImportSubtitleFile,
    onExportSubtitleFile,
    onToggleSubtitleBurnIn,
    onApplySubtitlePreset,
    onSelectSubtitleIndex,
    onTranslateSubtitles,
    isTranslating,
    translationStatus,
    aiOnline,
    onAddBuiltinAudio,
    onPreviewBuiltinAudio,
    addingAudioId,
    isRecordingMic,
    micRecordingSec,
    micError,
    onStartMicRecording,
    onStopMicRecording,
    onSetAudioDucking,
    isDetectingBeats,
    onDetectBeats,
    onAlignSubtitlesToBeats,
    onApplyColorPreset,
    onUpdateColor,
    onUpdateEffects,
    onApplyWorkflowPreset,
    onUpdateExportSettings,
    onStartExport,
    onCancelExport,
    isExporting,
    exportProgress,
    exportError,
    exportResult,
    onQuickCompressSelected,
    isCompressing,
    compressProgress,
    compressResult,
    onExtractAudioSelected,
    isExtractingAudio,
  } = props;

  const subInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [targetLang, setTargetLang] = useState('es');
  const [translateMode, setTranslateMode] = useState<'ai' | 'offline'>(aiOnline ? 'ai' : 'offline');

  const selectedLangObj =
    TRANSLATE_LANGUAGES.find((l) => l.code === targetLang) || TRANSLATE_LANGUAGES[0];

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSubtitleFile(file);
    }
    e.target.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadLogoFile(file);
    }
    e.target.value = '';
  };

  const activeClipDsp = activeClip?.audioDsp || DEFAULT_AUDIO_DSP;

  return (
    <aside className="w-full lg:w-[330px] xl:w-[350px] bg-[#070b16] border-b lg:border-b-0 lg:border-r border-slate-800/90 flex flex-col shrink-0">
      {/* Tool Rail Tabs (10 Pro Tabs in 2 clean rows on desktop) */}
      <div className="grid grid-cols-5 gap-1 p-2 border-b border-slate-800/90 bg-[#050811]">
        {TOOL_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.2)]'
                  : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tool Drawer Body */}
      <div className="p-3.5 space-y-4 overflow-y-auto max-h-[390px] lg:max-h-none lg:flex-1 text-xs">
        {/* 1. MEDIA BIN */}
        {activeTab === 'media' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Media Bin</h3>
              <span className="text-[10px] text-slate-400 font-mono">{assets.length} files</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onTriggerFilePicker}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Video, Audio, or Logo</span>
              </button>

              <button
                type="button"
                onClick={onLoadSampleClip}
                disabled={isGeneratingSample}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isGeneratingSample ? 'Creating Sample...' : 'Load Sample Clip + Captions'}</span>
              </button>
            </div>

            {assets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-[11px] text-slate-400 leading-relaxed">
                Drag and drop video, audio, or PNG/SVG logos anywhere on the preview canvas, or click Upload above.
              </div>
            ) : (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate flex items-center gap-1.5">
                        {asset.kind === 'video' ? (
                          <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        ) : asset.kind === 'image' ? (
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Music className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        )}
                        <span className="truncate">{asset.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {asset.kind === 'image' ? 'Image / Logo' : formatStudioTimecode(asset.durationMs)} ·{' '}
                        {(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                        {asset.width ? ` · ${asset.width}×${asset.height}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddAssetToTimeline(asset)}
                      title="Add to timeline"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. EDIT, SPLIT, MERGE, DUPLICATE & REFRAME */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Edit &amp; Timeline Ops</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSplitAtPlayhead}
                disabled={project.clips.length === 0}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-slate-200 hover:text-white disabled:opacity-40 flex flex-col items-center gap-1 cursor-pointer"
              >
                <Scissors className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] font-semibold">Split Clip</span>
              </button>

              <button
                type="button"
                onClick={onMergeClips}
                disabled={project.clips.length < 2}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-slate-200 hover:text-white disabled:opacity-40 flex flex-col items-center gap-1 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-semibold">Merge Clips</span>
              </button>

              <button
                type="button"
                onClick={onDuplicateSelectedClip}
                disabled={!activeClip}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-200 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Duplicate Clip</span>
              </button>

              <button
                type="button"
                onClick={onRippleDeleteSelectedClip}
                disabled={!activeClip}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-[11px] text-rose-300 disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ripple Delete</span>
              </button>

              <button
                type="button"
                onClick={onMarkInAtPlayhead}
                disabled={project.clips.length === 0}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Trim Start to Playhead
              </button>

              <button
                type="button"
                onClick={onMarkOutAtPlayhead}
                disabled={project.clips.length === 0}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Trim End to Playhead
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-300">Copy / Paste Clip Effects</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onCopyClipEffects}
                  disabled={!activeClip}
                  className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-200 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-blue-400" />
                  <span>Copy Effects</span>
                </button>
                <button
                  type="button"
                  onClick={onPasteClipEffects}
                  disabled={!activeClip || !hasCopiedEffects}
                  className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-cyan-200 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ClipboardPaste className="w-3 h-3 text-cyan-400" />
                  <span>Paste Effects</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Canvas Framing / Fit Mode (9:16, 16:9, 1:1)
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    { id: 'contain-black', label: 'Contain (Letterbox / Black Bars)' },
                    { id: 'contain-blur', label: 'Contain + Blurred Backdrop (Shorts/Reels)' },
                    { id: 'cover', label: 'Fill / Auto-Crop to Frame' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onSetFitMode(mode.id)}
                    className={`px-3 py-2 rounded-lg text-left text-[11px] font-medium border transition-colors ${
                      project.fitMode === mode.id
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. ANIMATE: KEYFRAMES, MOTION PRESETS & SPEED RAMPING */}
        {activeTab === 'animate' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Keyframes &amp; Motion</h3>
              <span className="text-[10px] font-mono text-amber-300">
                ◆ {activeClip?.keyframes?.length || 0} keyframes
              </span>
            </div>

            {!activeClip ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                Select or load a video clip on track <strong className="text-blue-400">V1</strong> to animate position, scale, rotation, opacity, or speed ramping.
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onAddKeyframeAtPlayhead}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/45 text-amber-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>+ Add Keyframe @ Playhead</span>
                </button>

                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-300">1-Click Motion Presets</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'ken-burns-in', label: 'Ken Burns In' },
                        { id: 'ken-burns-out', label: 'Ken Burns Out' },
                        { id: 'pan-left-right', label: 'Pan Left → Right' },
                        { id: 'pop-in', label: 'Pop-In Bounce' },
                        { id: 'spin-reveal', label: 'Spin Reveal' },
                        { id: 'fade-in-out', label: 'Fade In & Out' },
                      ] as Array<{ id: MotionPresetId; label: string }>
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onApplyMotionPreset(m.id)}
                        className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/45 text-[11px] text-slate-200 hover:text-white text-left cursor-pointer"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyMotionPreset('clear')}
                    className="w-full py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-rose-300 cursor-pointer"
                  >
                    Clear Clip Keyframes
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-300">Speed Ramping Curves</div>
                  <div className="space-y-1.5">
                    {(Object.keys(SPEED_RAMP_PRESETS) as SpeedRampPreset[]).map((rampKey) => {
                      const activeRamp = (activeClip.speedRamp || 'uniform') === rampKey;
                      return (
                        <button
                          key={rampKey}
                          type="button"
                          onClick={() => onSetClipSpeedRamp(rampKey)}
                          className={`w-full px-2.5 py-2 rounded-lg text-left text-[11px] font-medium border transition-colors cursor-pointer ${
                            activeRamp
                              ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {SPEED_RAMP_PRESETS[rampKey].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. TEXT OVERLAYS, LOGOS & INTRO/OUTRO TEMPLATES */}
        {activeTab === 'text' && (
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Titles, Logos &amp; Graphics</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAddTextOverlay('title')}
                className="py-2 px-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/35 text-blue-200 text-[11px] font-semibold cursor-pointer"
              >
                + Hero Title
              </button>
              <button
                type="button"
                onClick={() => onAddTextOverlay('lower-third')}
                className="py-2 px-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/35 text-blue-200 text-[11px] font-semibold cursor-pointer"
              >
                + Lower Third
              </button>
              <button
                type="button"
                onClick={() => onAddTextOverlay('caption', { animation: 'typewriter', text: 'Typewriter story line...' })}
                className="py-2 px-2.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/30 border border-cyan-500/35 text-cyan-200 text-[11px] font-semibold cursor-pointer"
              >
                + Typewriter Text
              </button>
              <button
                type="button"
                onClick={() => onAddTextOverlay('title', { animation: 'reveal-wipe', text: 'CHAPTER REVEAL' })}
                className="py-2 px-2.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/30 border border-cyan-500/35 text-cyan-200 text-[11px] font-semibold cursor-pointer"
              >
                + Text Reveal
              </button>
              <button
                type="button"
                onClick={() => onAddTextOverlay('badge')}
                className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer"
              >
                + Corner Tag
              </button>
              <button
                type="button"
                onClick={() => onAddTextOverlay('logo', { animation: 'pop', text: 'SF' })}
                className="py-2 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Stamp className="w-3 h-3" />
                <span>+ Logo Badge</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/35 text-amber-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Upload Custom PNG / SVG Logo</span>
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />

            {/* Intro & Outro Sequence Templates */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Intro / Outro Templates</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onInsertTemplate('intro')}
                  className="py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-200 text-[11px] font-semibold cursor-pointer"
                >
                  + Insert Intro
                </button>
                <button
                  type="button"
                  onClick={() => onInsertTemplate('outro')}
                  className="py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-200 text-[11px] font-semibold cursor-pointer"
                >
                  + Insert Outro
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-300">
                Active Text &amp; Logo Layers ({project.textOverlays.length})
              </div>
              {project.textOverlays.length === 0 ? (
                <p className="text-[11px] text-slate-500">No text layers added yet.</p>
              ) : (
                project.textOverlays.map((ov) => (
                  <button
                    key={ov.id}
                    type="button"
                    onClick={() => onSelectOverlay(ov.id)}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-left flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-white truncate">{ov.text}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatStudioTimecode(ov.startMs)} → {formatStudioTimecode(ov.endMs)} · {ov.animation}
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 uppercase shrink-0">
                      {ov.preset}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. SUBTITLES, STYLE PRESETS & TRANSLATION */}
        {activeTab === 'subtitles' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Subtitles &amp; Translate</h3>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.subtitleStyle.enabled}
                  onChange={(e) => onToggleSubtitleBurnIn(e.target.checked)}
                  className="accent-blue-500"
                />
                <span>Burn-in</span>
              </label>
            </div>

            {/* Subtitle Style Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block">Subtitle Style Presets</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(SUBTITLE_STYLE_PRESETS) as Array<Exclude<SubtitlePresetStyleId, 'custom'>>).map(
                  (presetKey) => (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => onApplySubtitlePreset(presetKey)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border text-left transition-colors ${
                        project.subtitleStyle.presetId === presetKey
                          ? 'bg-blue-600/25 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {SUBTITLE_STYLE_PRESETS[presetKey].label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onAddSubtitleCueAtPlayhead}
                className="py-2 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cue</span>
              </button>

              <button
                type="button"
                onClick={() => subInputRef.current?.click()}
                className="py-2 px-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500/50 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import SRT/VTT</span>
              </button>
              <input
                ref={subInputRef}
                type="file"
                accept=".srt,.vtt,text/vtt,application/x-subrip"
                onChange={handleSubtitleUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onExportSubtitleFile('srt')}
                disabled={project.subtitles.length === 0}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-slate-300 text-[11px] disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <FileDown className="w-3 h-3 text-blue-400" />
                <span>Export .SRT</span>
              </button>
              <button
                type="button"
                onClick={() => onExportSubtitleFile('vtt')}
                disabled={project.subtitles.length === 0}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-slate-300 text-[11px] disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <FileDown className="w-3 h-3 text-cyan-400" />
                <span>Export .VTT</span>
              </button>
            </div>

            {/* Subtitle Translation Block */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-blue-400" />
                  Translate Track
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    translateMode === 'ai'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {translateMode === 'ai' ? 'External AI API' : 'Offline Phrase'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTranslateMode('ai')}
                  className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                    translateMode === 'ai'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gemini AI {aiOnline === false ? '(Offline)' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setTranslateMode('offline')}
                  className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                    translateMode === 'offline'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Local Offline
                </button>
              </div>

              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                aria-label="Target translation language"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {TRANSLATE_LANGUAGES.map((l) => (
                  <option
                    key={l.code}
                    value={l.code}
                    disabled={translateMode === 'offline' && !l.offlineSupported}
                  >
                    {l.name} {translateMode === 'offline' && !l.offlineSupported ? '(AI API Only)' : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={
                  project.subtitles.length === 0 ||
                  isTranslating ||
                  (translateMode === 'offline' && !selectedLangObj.offlineSupported)
                }
                onClick={() => onTranslateSubtitles(targetLang, selectedLangObj.name, translateMode)}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating {project.subtitles.length} cues...</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-3.5 h-3.5" />
                    <span>Translate {project.subtitles.length} Cues</span>
                  </>
                )}
              </button>

              {translationStatus && (
                <div
                  className={`p-2 rounded-lg text-[11px] flex items-start gap-1.5 ${
                    translationStatus.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {translationStatus.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>{translationStatus.message}</span>
                </div>
              )}
            </div>

            {/* Cues List */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-300">
                Cues ({project.subtitles.length}) @ {formatStudioTimecode(currentTimeMs)}
              </div>
              {project.subtitles.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  Import an .srt/.vtt file or add subtitle cues manually.
                </p>
              ) : (
                project.subtitles.map((cue, idx) => (
                  <button
                    key={`${cue.id || idx}-${cue.startMs}`}
                    type="button"
                    onClick={() => onSelectSubtitleIndex(idx)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-left"
                  >
                    <div className="text-[10px] font-mono text-blue-300">
                      #{idx + 1} · {formatStudioTimecode(cue.startMs)} → {formatStudioTimecode(cue.endMs)}
                    </div>
                    <div className="text-[11px] text-white truncate mt-0.5">{cue.text}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. AUDIO MIXER, MIC RECORDING, DUCKING, BEAT SYNC & DSP */}
        {activeTab === 'audio' && (
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pro Audio Studio</h3>

            {/* Voiceover Mic Recording */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  Voiceover Recorder
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Requires Mic Permission
                </span>
              </div>
              {!isRecordingMic ? (
                <button
                  type="button"
                  onClick={onStartMicRecording}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/45 text-rose-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Record Voiceover @ Playhead</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStopMicRecording}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-2 animate-pulse cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Recording ({micRecordingSec}s)</span>
                </button>
              )}
              {micError && (
                <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded p-2">
                  {micError}
                </div>
              )}
            </div>

            {/* Audio Ducking & Beat Sync */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-200 font-semibold">Auto Audio Ducking (Music A1)</span>
                  <span className="font-mono text-cyan-300">{project.audioDucking}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={project.audioDucking}
                  onChange={(e) => onSetAudioDucking(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={onDetectBeats}
                  disabled={project.audioItems.length === 0 || isDetectingBeats}
                  className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-[10px] text-cyan-300 font-semibold disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isDetectingBeats ? <Loader2 className="w-3 h-3 animate-spin" /> : <AudioWaveform className="w-3 h-3" />}
                  <span>Detect Beats</span>
                </button>
                <button
                  type="button"
                  onClick={onAlignSubtitlesToBeats}
                  disabled={project.beatMarkersMs.length === 0 || project.subtitles.length === 0}
                  className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-[10px] text-blue-300 font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Snap Subs to Beats ({project.beatMarkersMs.length})
                </button>
              </div>
            </div>

            {/* Clip Audio DSP Quick Rack */}
            {activeClip && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-blue-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">V1 Clip EQ &amp; Voice Clarity</span>
                  <button
                    type="button"
                    onClick={() => onUpdateClipAudioDsp({ voiceEnhance: !activeClipDsp.voiceEnhance })}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      activeClipDsp.voiceEnhance
                        ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Voice Enhance {activeClipDsp.voiceEnhance ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Noise Reduction</span>
                    <span className="font-mono text-blue-300">{activeClipDsp.noiseReduction}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={activeClipDsp.noiseReduction}
                    onChange={(e) => onUpdateClipAudioDsp({ noiseReduction: Number(e.target.value) })}
                    className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'eqBass', label: 'Bass' },
                      { key: 'eqMid', label: 'Mid' },
                      { key: 'eqTreble', label: 'Treble' },
                    ] as const
                  ).map((band) => (
                    <div key={band.key}>
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>{band.label}</span>
                        <span className="font-mono text-cyan-300">
                          {activeClipDsp[band.key] > 0 ? `+${activeClipDsp[band.key]}` : activeClipDsp[band.key]}dB
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={1}
                        value={activeClipDsp[band.key]}
                        onChange={(e) => onUpdateClipAudioDsp({ [band.key]: Number(e.target.value) })}
                        className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onTriggerFilePicker}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500/50 text-slate-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Custom MP3 / WAV</span>
            </button>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-300">
                Built-in Web Audio Synthesizer Library
              </div>
              {BUILTIN_AUDIO_LIBRARY.map((desc) => (
                <div
                  key={desc.id}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">{desc.name}</div>
                    <div className="text-[10px] text-slate-400">
                      <span className={desc.track === 'music' ? 'text-blue-400' : 'text-cyan-400'}>
                        {desc.categoryLabel}
                      </span>{' '}
                      · {desc.durationSec}s
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPreviewBuiltinAudio(desc)}
                      title="Preview sound"
                      aria-label={`Preview ${desc.name}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={addingAudioId === desc.id}
                      onClick={() => onAddBuiltinAudio(desc)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-200 hover:text-white text-[10px] font-semibold disabled:opacity-50"
                    >
                      {addingAudioId === desc.id ? '...' : `+ ${desc.track === 'music' ? 'A1' : 'A2'}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. COLOR GRADING & LUT PRESETS */}
        {activeTab === 'color' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Color &amp; LUT Filters</h3>
              <button
                type="button"
                onClick={() => onApplyColorPreset('original')}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Reset Color
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(FILTER_PRESETS) as FilterPresetId[]).map((presetId) => (
                <button
                  key={presetId}
                  type="button"
                  onClick={() => onApplyColorPreset(presetId)}
                  className={`px-2 py-2 rounded-lg text-left text-[10px] font-semibold border transition-colors ${
                    project.colorGrading.preset === presetId
                      ? 'bg-blue-600/25 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {FILTER_PRESETS[presetId].label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              {(
                [
                  { key: 'brightness', label: 'Brightness', min: 50, max: 150, unit: '%' },
                  { key: 'contrast', label: 'Contrast', min: 50, max: 150, unit: '%' },
                  { key: 'saturation', label: 'Saturation', min: 0, max: 200, unit: '%' },
                  { key: 'hueRotate', label: 'Hue', min: -180, max: 180, unit: '°' },
                  { key: 'temperature', label: 'Temperature', min: -50, max: 50, unit: '' },
                  { key: 'vignette', label: 'Vignette', min: 0, max: 100, unit: '%' },
                  { key: 'blur', label: 'Soft Blur', min: 0, max: 10, unit: 'px' },
                ] as const
              ).map((ctrl) => (
                <div key={ctrl.key}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">{ctrl.label}</span>
                    <span className="font-mono text-blue-300">
                      {project.colorGrading[ctrl.key]}
                      {ctrl.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    value={project.colorGrading[ctrl.key]}
                    onChange={(e) => onUpdateColor({ [ctrl.key]: Number(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. VISUAL EFFECTS, TRANSITIONS & CHROMA KEY */}
        {activeTab === 'effects' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Transitions &amp; Visual FX</h3>

            {/* Active Clip Transition Selector */}
            {activeClip && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-blue-500/30 space-y-2">
                <div className="text-[11px] font-bold text-white">Active Clip Transition In</div>
                <select
                  value={activeClip.transitionIn}
                  onChange={(e) =>
                    onSetClipTransition(e.target.value as TransitionType, activeClip.transitionDurationMs)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                >
                  {TRANSITION_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {activeClip.transitionIn !== 'none' && (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Duration</span>
                      <span className="font-mono text-cyan-300">{activeClip.transitionDurationMs}ms</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={3000}
                      step={50}
                      value={activeClip.transitionDurationMs}
                      onChange={(e) =>
                        onSetClipTransition(activeClip.transitionIn, Number(e.target.value))
                      }
                      className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Shader / Compositor Effect Sliders */}
            <div className="space-y-2.5">
              {(
                [
                  { key: 'glitchIntensity', label: 'Glitch Distortion' },
                  { key: 'rgbSplit', label: 'RGB Split' },
                  { key: 'chromaticAberration', label: 'Chromatic Aberration' },
                  { key: 'vhsEffect', label: 'VHS Tape Retro' },
                  { key: 'glowIntensity', label: 'Additive Glow' },
                  { key: 'neonEdge', label: 'Neon Border Edge' },
                  { key: 'shakeIntensity', label: 'Camera Shake' },
                  { key: 'backgroundBlur', label: 'Background Blur' },
                  { key: 'filmGrain', label: 'Film Grain' },
                  { key: 'motionBlur', label: 'Motion Blur', badge: 'Experimental (CPU)' },
                ] as Array<{
                  key:
                    | 'glitchIntensity'
                    | 'rgbSplit'
                    | 'chromaticAberration'
                    | 'vhsEffect'
                    | 'glowIntensity'
                    | 'neonEdge'
                    | 'shakeIntensity'
                    | 'backgroundBlur'
                    | 'filmGrain'
                    | 'motionBlur';
                  label: string;
                  badge?: string;
                }>
              ).map((slider) => (
                <div key={slider.key}>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span>{slider.label}</span>
                      {slider.badge && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                          {slider.badge}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-blue-300">{project.visualEffects[slider.key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={project.visualEffects[slider.key]}
                    onChange={(e) => onUpdateEffects({ [slider.key]: Number(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Boolean Overlay FX */}
            <div className="space-y-1.5">
              {(
                [
                  { key: 'scanlines', label: 'CRT / Digital Scanlines' },
                  { key: 'letterbox', label: 'Cinema Scope Letterbox (2.39:1)' },
                  { key: 'chromaticTint', label: 'Cyber Blue Chromatic Wash' },
                ] as const
              ).map((fxItem) => (
                <label
                  key={fxItem.key}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-500/40"
                >
                  <span className="text-[11px] font-medium text-slate-200">{fxItem.label}</span>
                  <input
                    type="checkbox"
                    checked={project.visualEffects[fxItem.key]}
                    onChange={(e) => onUpdateEffects({ [fxItem.key]: e.target.checked })}
                    className="accent-blue-500 w-4 h-4"
                  />
                </label>
              ))}
            </div>

            {/* Green Screen / Chroma Key */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-white">Green Screen / Chroma Key</span>
                  <span className="text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    CPU Pixel Pass
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={project.visualEffects.chromaKey.enabled}
                  onChange={(e) =>
                    onUpdateEffects({
                      chromaKey: { ...project.visualEffects.chromaKey, enabled: e.target.checked },
                    })
                  }
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {project.visualEffects.chromaKey.enabled && (
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-300">Key Color</span>
                      <input
                        type="color"
                        value={project.visualEffects.chromaKey.keyColor}
                        onChange={(e) =>
                          onUpdateEffects({
                            chromaKey: { ...project.visualEffects.chromaKey, keyColor: e.target.value },
                          })
                        }
                        className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-300">Backdrop</span>
                      <input
                        type="color"
                        value={project.visualEffects.chromaKey.replacementBgColor}
                        onChange={(e) =>
                          onUpdateEffects({
                            chromaKey: {
                              ...project.visualEffects.chromaKey,
                              replacementBgColor: e.target.value,
                            },
                          })
                        }
                        className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Similarity Tolerance</span>
                      <span className="font-mono text-emerald-300">
                        {project.visualEffects.chromaKey.similarity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={65}
                      value={project.visualEffects.chromaKey.similarity}
                      onChange={(e) =>
                        onUpdateEffects({
                          chromaKey: {
                            ...project.visualEffects.chromaKey,
                            similarity: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500 h-1 bg-slate-800 rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Edge Smoothness</span>
                      <span className="font-mono text-emerald-300">
                        {project.visualEffects.chromaKey.smoothness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      value={project.visualEffects.chromaKey.smoothness}
                      onChange={(e) =>
                        onUpdateEffects({
                          chromaKey: {
                            ...project.visualEffects.chromaKey,
                            smoothness: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500 h-1 bg-slate-800 rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Spill Reduction</span>
                      <span className="font-mono text-emerald-300">
                        {project.visualEffects.chromaKey.spillReduction}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={project.visualEffects.chromaKey.spillReduction}
                      onChange={(e) =>
                        onUpdateEffects({
                          chromaKey: {
                            ...project.visualEffects.chromaKey,
                            spillReduction: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500 h-1 bg-slate-800 rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 9. CREATOR WORKFLOW PRESETS (ALL 8 MODES) */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Creator Workflow Presets</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                1-click configuration of aspect ratio, LUT grading, FX, voice DSP, ducking, subtitle styling, and export FPS.
              </p>
            </div>

            <div className="space-y-2">
              {WORKFLOW_PRESETS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => onApplyWorkflowPreset(wp.id)}
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-blue-950/35 border border-slate-800 hover:border-blue-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300">
                      {wp.label}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                      {wp.aspectRatio} · {wp.exportPatch.fps || 30}fps
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{wp.tagline}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 10. EXPORT, COMPRESSION, GIF & AUDIO EXTRACT */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Export &amp; Compress</h3>

            {/* Format Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block">Output Format</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['mp4', 'webm', 'gif'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => onUpdateExportSettings({ format: fmt })}
                    className={`py-2 rounded-lg text-[11px] font-bold uppercase border transition-colors ${
                      project.exportSettings.format === fmt
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* MP4/WebM Resolution & FPS */}
            {project.exportSettings.format !== 'gif' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">Resolution</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['480p', '720p', '1080p', '4k'] as ExportResolution[]).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => onUpdateExportSettings({ resolution: res })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold border ${
                          project.exportSettings.resolution === res
                            ? 'bg-blue-600/25 border-blue-500 text-blue-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {res.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {project.exportSettings.resolution === '4k' && (
                    <p className="text-[10px] text-amber-300">
                      High Memory: 4K browser WASM encoding uses significant RAM and takes longer on mobile hardware.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">Frame Rate (FPS)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([24, 30, 60] as ExportFps[]).map((fpsVal) => (
                      <button
                        key={fpsVal}
                        type="button"
                        onClick={() => onUpdateExportSettings({ fps: fpsVal })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold border ${
                          project.exportSettings.fps === fpsVal
                            ? 'bg-blue-600/25 border-blue-500 text-blue-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {fpsVal} FPS
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Compression Controls */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-slate-300">Compression Quality</label>
                    <span className="text-[10px] font-mono text-cyan-300">CRF {project.exportSettings.crf}</span>
                  </div>
                  <select
                    value={project.exportSettings.compressionPreset}
                    onChange={(e) => {
                      const preset = e.target.value as CompressionPreset;
                      if (preset === 'custom') {
                        onUpdateExportSettings({ compressionPreset: 'custom' });
                      } else {
                        onUpdateExportSettings({
                          compressionPreset: preset,
                          crf: COMPRESSION_PRESETS[preset].crf,
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {(Object.keys(COMPRESSION_PRESETS) as Array<Exclude<CompressionPreset, 'custom'>>).map(
                      (key) => (
                        <option key={key} value={key}>
                          {COMPRESSION_PRESETS[key].label}
                        </option>
                      )
                    )}
                    <option value="custom">Custom CRF Slider</option>
                  </select>

                  <input
                    type="range"
                    min={16}
                    max={40}
                    value={project.exportSettings.crf}
                    onChange={(e) =>
                      onUpdateExportSettings({
                        compressionPreset: 'custom',
                        crf: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Larger / Sharper (16)</span>
                    <span>Smaller File (40)</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">GIF Width</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([320, 480, 640, 720] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => onUpdateExportSettings({ gifWidth: w })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold border ${
                          project.exportSettings.gifWidth === w
                            ? 'bg-blue-600/25 border-blue-500 text-blue-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">GIF Frame Rate</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([10, 12, 15, 20] as const).map((gFps) => (
                      <button
                        key={gFps}
                        type="button"
                        onClick={() => onUpdateExportSettings({ gifFps: gFps })}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold border ${
                          project.exportSettings.gifFps === gFps
                            ? 'bg-blue-600/25 border-blue-500 text-blue-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {gFps} fps
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Estimated Output & Render Button */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/30 space-y-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Est. Output Size</span>
                <span className="font-mono text-blue-300 font-semibold">
                  ~{estimateExportSizeMb(project)}
                </span>
              </div>

              {!isExporting ? (
                <button
                  type="button"
                  disabled={project.clips.length === 0}
                  onClick={onStartExport}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 shadow-[0_0_18px_rgba(37,99,235,0.4)] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Render &amp; Export {project.exportSettings.format.toUpperCase()}</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-blue-300 font-semibold truncate">
                      {exportProgress?.message || 'Encoding...'}
                    </span>
                    <span className="font-mono text-white font-bold">
                      {exportProgress?.percent || 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-200"
                      style={{ width: `${exportProgress?.percent || 5}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onCancelExport}
                    className="w-full py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Render</span>
                  </button>
                </div>
              )}

              {exportError && (
                <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px]">
                  {exportError}
                </div>
              )}

              {exportResult && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                    <span>Ready: {exportResult.fileName}</span>
                    <span className="font-mono">
                      {(exportResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <a
                    href={exportResult.objectUrl}
                    download={exportResult.fileName}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Final Video</span>
                  </a>
                </div>
              )}
            </div>

            {/* Quick Single-Clip Utilities: Direct Compress & Audio Extraction */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-300">Quick Clip Utilities</div>
              <button
                type="button"
                disabled={(!selectedClipId && project.clips.length === 0) || isCompressing}
                onClick={onQuickCompressSelected}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500/50 text-slate-200 text-[11px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCompressing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>
                  {isCompressing
                    ? compressProgress || 'Compressing...'
                    : `Quick Compress Clip (CRF ${project.exportSettings.crf})`}
                </span>
              </button>

              {compressResult && (
                <a
                  href={compressResult.objectUrl}
                  download={compressResult.fileName}
                  className="block p-2 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-200 text-[11px] text-center font-semibold hover:bg-blue-500/25"
                >
                  Download Compressed ({(compressResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB)
                </a>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={project.clips.length === 0 || isExtractingAudio}
                  onClick={() => onExtractAudioSelected('wav')}
                  className="py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileAudio className="w-3 h-3 text-cyan-400" />
                  <span>Extract WAV</span>
                </button>
                <button
                  type="button"
                  disabled={project.clips.length === 0 || isExtractingAudio}
                  onClick={() => onExtractAudioSelected('mp3')}
                  className="py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileAudio className="w-3 h-3 text-blue-400" />
                  <span>Extract MP3</span>
                </button>
              </div>
              {project.clips.length > 0 && (
                <div className="text-[10px] text-slate-500 font-mono">
                  Active V1 duration: {formatStudioTimecode(getClipDurationMs(project.clips[0]))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
