import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Repeat,
  Volume2,
  VolumeX,
  Upload,
  Wand2,
  Grid,
  ChevronLeft,
  ChevronRight,
  Brackets,
  StepBack,
  StepForward,
} from 'lucide-react';
import {
  AspectRatioMode,
  ExportFps,
  ExportResolution,
  getResolutionDimensions,
} from '../../types/videoStudio';

interface StudioPreviewPlayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasClips: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTimeMs: number;
  totalDurationMs: number;
  onSeek: (timeMs: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  masterMuted: boolean;
  masterVolume: number;
  onToggleMasterMute: () => void;
  onChangeMasterVolume: (vol: number) => void;
  aspectRatio: AspectRatioMode;
  resolution: ExportResolution;
  fps: ExportFps;
  showSafeGuides: boolean;
  onToggleSafeGuides: () => void;
  onDropFiles: (files: FileList | File[]) => void;
  onTriggerFilePicker: () => void;
  onLoadSampleClip: () => void;
  isGeneratingSample: boolean;
  onSplitAtPlayhead: () => void;
  onMarkInAtPlayhead: () => void;
  onMarkOutAtPlayhead: () => void;
  canEditActiveClip: boolean;
}

export function formatStudioTimecode(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const mins = Math.floor(safe / 60000);
  const secs = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function StudioPreviewPlayer({
  canvasRef,
  hasClips,
  isPlaying,
  onTogglePlay,
  currentTimeMs,
  totalDurationMs,
  onSeek,
  loop,
  onToggleLoop,
  masterMuted,
  masterVolume,
  onToggleMasterMute,
  onChangeMasterVolume,
  aspectRatio,
  resolution,
  fps,
  showSafeGuides,
  onToggleSafeGuides,
  onDropFiles,
  onTriggerFilePicker,
  onLoadSampleClip,
  isGeneratingSample,
  onSplitAtPlayhead,
  onMarkInAtPlayhead,
  onMarkOutAtPlayhead,
  canEditActiveClip,
}: StudioPreviewPlayerProps) {
  const [dragOver, setDragOver] = useState(false);
  const scrubberRef = useRef<HTMLInputElement>(null);

  const frameStepMs = Math.max(16, Math.round(1000 / Math.max(1, fps || 30)));
  const dims = getResolutionDimensions(aspectRatio, resolution);
  const previewAspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[380px] sm:max-h-[430px]'
      : aspectRatio === '1:1'
      ? 'aspect-square max-h-[380px] sm:max-h-[430px]'
      : 'aspect-video w-full max-w-[780px]';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col bg-[#040711] min-w-0 select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Top Preview Info Strip */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
            {aspectRatio}
          </span>
          <span className="font-mono text-slate-300">
            {dims.width}×{dims.height}
          </span>
          <span className="font-mono text-cyan-400">{fps}fps</span>
          <span className="hidden sm:inline text-slate-500">· Canvas Compositor</span>
        </div>

        <button
          type="button"
          onClick={onToggleSafeGuides}
          className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 border transition-colors ${
            showSafeGuides
              ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Safe-Frame Overlay"
        >
          <Grid className="w-3 h-3" />
          <span>Safe Guides</span>
        </button>
      </div>

      {/* Main Viewport Stage */}
      <div
        className={`relative flex-1 flex items-center justify-center p-3 sm:p-5 overflow-hidden transition-colors ${
          dragOver ? 'bg-blue-950/30 ring-2 ring-inset ring-blue-500' : ''
        }`}
      >
        <div
          className={`relative mx-auto flex items-center justify-center rounded-xl overflow-hidden border ${
            dragOver ? 'border-blue-400' : 'border-slate-800'
          } bg-black shadow-[0_20px_50px_rgba(0,0,0,0.85)] ${previewAspectClass}`}
        >
          <canvas
            ref={canvasRef}
            onClick={() => hasClips && onTogglePlay()}
            className="w-full h-full object-contain cursor-pointer block"
          />

          {/* Empty State Dropzone */}
          {!hasClips && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#060b18]/92 backdrop-blur-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/35 flex items-center justify-center text-blue-400 mb-3 shadow-[0_0_24px_rgba(59,130,246,0.25)]">
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mb-1.5">
                Drop Video, Audio, or Logo Files Here
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                Supports MP4, WebM, MOV, MKV, WAV, MP3, PNG &amp; SVG. Edit multi-track timelines, keyframes, effects, audio DSP, and export MP4/WebM/GIF in-browser.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onTriggerFilePicker}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Browse Video Files
                </button>
                <button
                  type="button"
                  onClick={onLoadSampleClip}
                  disabled={isGeneratingSample}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-blue-500/35 text-blue-300 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                  {isGeneratingSample ? 'Synthesizing Sample...' : 'Load Sample Clip + Captions'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transport & Scrubber Bar */}
      <div className="bg-[#070b16] border-t border-slate-800/90 px-3 sm:px-4 py-2.5 space-y-2">
        {/* Timeline Scrub Slider */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-blue-300 w-[72px] shrink-0">
            {formatStudioTimecode(currentTimeMs)}
          </span>
          <input
            ref={scrubberRef}
            type="range"
            min={0}
            max={Math.max(100, totalDurationMs)}
            step={15}
            value={Math.min(currentTimeMs, Math.max(100, totalDurationMs))}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={!hasClips && totalDurationMs <= 0}
            aria-label="Playback scrubber"
            className="flex-1 accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-[11px] text-slate-400 w-[72px] text-right shrink-0">
            {formatStudioTimecode(totalDurationMs)}
          </span>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Quick Edit Cut/Trim Tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onSplitAtPlayhead}
              disabled={!canEditActiveClip}
              title="Split clip at playhead (S)"
              className="px-2 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-[11px] text-slate-200 hover:text-white disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1"
            >
              <Scissors className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={onMarkInAtPlayhead}
              disabled={!canEditActiveClip}
              title="Trim clip start to playhead"
              className="px-2 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-[11px] text-slate-300 hover:text-white disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1"
            >
              <Brackets className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Trim In</span>
            </button>
            <button
              type="button"
              onClick={onMarkOutAtPlayhead}
              disabled={!canEditActiveClip}
              title="Trim clip end to playhead"
              className="px-2 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-[11px] text-slate-300 hover:text-white disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1"
            >
              <Brackets className="w-3.5 h-3.5 text-cyan-400 rotate-180" />
              <span className="hidden md:inline">Trim Out</span>
            </button>
          </div>

          {/* Center Transport Playback + Frame-by-Frame Navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSeek(0)}
              title="Jump to start"
              aria-label="Jump to start"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.max(0, currentTimeMs - 1000))}
              title="Back 1 second"
              aria-label="Back 1 second"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.max(0, currentTimeMs - frameStepMs))}
              title={`Previous frame (-${frameStepMs}ms, ',')`}
              aria-label="Previous frame"
              className="p-1.5 rounded-md text-cyan-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <StepBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={totalDurationMs <= 0}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-9 h-9 mx-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-[0_0_16px_rgba(37,99,235,0.5)] disabled:opacity-35 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.min(totalDurationMs, currentTimeMs + frameStepMs))}
              title={`Next frame (+${frameStepMs}ms, '.')`}
              aria-label="Next frame"
              className="p-1.5 rounded-md text-cyan-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.min(totalDurationMs, currentTimeMs + 1000))}
              title="Forward 1 second"
              aria-label="Forward 1 second"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSeek(totalDurationMs)}
              title="Jump to end"
              aria-label="Jump to end"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Loop & Volume */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLoop}
              title="Toggle loop playback"
              aria-label="Toggle loop playback"
              className={`p-1.5 rounded-md border text-xs transition-colors ${
                loop
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleMasterMute}
                aria-label={masterMuted ? 'Unmute audio' : 'Mute audio'}
                className="p-1 text-slate-300 hover:text-white"
              >
                {masterMuted || masterVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-blue-400" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={masterMuted ? 0 : masterVolume}
                onChange={(e) => onChangeMasterVolume(Number(e.target.value))}
                aria-label="Master preview volume"
                className="w-16 sm:w-20 accent-blue-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
