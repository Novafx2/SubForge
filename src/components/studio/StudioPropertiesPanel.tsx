import React, { useRef } from 'react';
import {
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Scissors,
  Volume2,
  VolumeX,
  FileAudio,
  Keyboard,
  Sliders,
  Copy,
  ClipboardPaste,
  KeyRound,
  Image as ImageIcon,
} from 'lucide-react';
import {
  AudioDspSettings,
  AudioTrackItem,
  ClipKeyframe,
  DEFAULT_AUDIO_DSP,
  KeyframeEasing,
  MediaAsset,
  SPEED_RAMP_PRESETS,
  SUBTITLE_STYLE_PRESETS,
  SelectedTimelineItem,
  SpeedRampPreset,
  SubtitlePresetStyleId,
  TRANSITION_OPTIONS,
  TextOverlay,
  TextOverlayAnimation,
  TransitionType,
  VideoClip,
  VideoProjectState,
  getClipDurationMs,
  getTotalTimelineDurationMs,
} from '../../types/videoStudio';
import { SubtitleCue } from '../../types/subtitles';
import { evaluateClipKeyframes } from '../../lib/videoStudio/canvasCompositor';
import { MotionPresetId } from '../../lib/videoStudio/studioReducer';
import { formatStudioTimecode } from './StudioPreviewPlayer';

interface StudioPropertiesPanelProps {
  project: VideoProjectState;
  assets: Record<string, MediaAsset>;
  selectedItem: SelectedTimelineItem;
  currentTimeMs: number;
  hasCopiedEffects: boolean;
  onUpdateClip: (id: string, patch: Partial<VideoClip>) => void;
  onDeleteClip: (id: string) => void;
  onRippleDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onCopyClipEffects: (clip: VideoClip) => void;
  onPasteClipEffects: (id: string) => void;
  onMoveClip: (id: string, dir: 'left' | 'right') => void;
  onSplitClip: (id: string) => void;
  onUpsertKeyframe: (clipId: string, keyframe: ClipKeyframe) => void;
  onDeleteKeyframe: (clipId: string, keyframeId: string) => void;
  onApplyMotionPreset: (clipId: string, preset: MotionPresetId) => void;
  onExtractClipAudio: (clip: VideoClip, fmt: 'wav' | 'mp3') => void;
  onUpdateOverlay: (id: string, patch: Partial<TextOverlay>) => void;
  onUploadLogoForOverlay: (overlayId: string, file: File) => void;
  onDeleteOverlay: (id: string) => void;
  onUpdateSubtitleCue: (index: number, patch: Partial<SubtitleCue>) => void;
  onDeleteSubtitleCue: (index: number) => void;
  onUpdateSubtitleStyle: (patch: Partial<VideoProjectState['subtitleStyle']>) => void;
  onApplySubtitlePreset: (presetId: Exclude<SubtitlePresetStyleId, 'custom'>) => void;
  onUpdateAudioItem: (id: string, patch: Partial<AudioTrackItem>) => void;
  onDeleteAudioItem: (id: string) => void;
  onSeek: (timeMs: number) => void;
}

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export function StudioPropertiesPanel({
  project,
  assets,
  selectedItem,
  currentTimeMs,
  hasCopiedEffects,
  onUpdateClip,
  onDeleteClip,
  onRippleDeleteClip,
  onDuplicateClip,
  onCopyClipEffects,
  onPasteClipEffects,
  onMoveClip,
  onSplitClip,
  onUpsertKeyframe,
  onDeleteKeyframe,
  onApplyMotionPreset,
  onExtractClipAudio,
  onUpdateOverlay,
  onUploadLogoForOverlay,
  onDeleteOverlay,
  onUpdateSubtitleCue,
  onDeleteSubtitleCue,
  onUpdateSubtitleStyle,
  onApplySubtitlePreset,
  onUpdateAudioItem,
  onDeleteAudioItem,
  onSeek,
}: StudioPropertiesPanelProps) {
  const overlayLogoInputRef = useRef<HTMLInputElement>(null);

  const selectedClip =
    selectedItem?.kind === 'clip'
      ? project.clips.find((c) => c.id === selectedItem.id) || null
      : null;

  const selectedOverlay =
    selectedItem?.kind === 'text'
      ? project.textOverlays.find((t) => t.id === selectedItem.id) || null
      : null;

  const selectedSubIdx =
    selectedItem?.kind === 'subtitle' && project.subtitles[selectedItem.index]
      ? selectedItem.index
      : -1;
  const selectedSub = selectedSubIdx >= 0 ? project.subtitles[selectedSubIdx] : null;

  const selectedAudio =
    selectedItem?.kind === 'audio'
      ? project.audioItems.find((a) => a.id === selectedItem.id) || null
      : null;

  const totalDurationMs = getTotalTimelineDurationMs(project);
  const imageAssets = Object.values(assets).filter((a) => a.kind === 'image');

  const renderAudioDspControls = (
    dsp: AudioDspSettings,
    onChange: (patch: Partial<AudioDspSettings>) => void
  ) => (
    <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-300">Audio EQ &amp; Enhancement</span>
        <button
          type="button"
          onClick={() => onChange({ voiceEnhance: !dsp.voiceEnhance })}
          className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
            dsp.voiceEnhance
              ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          Voice Enhance {dsp.voiceEnhance ? 'ON' : 'OFF'}
        </button>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Noise Reduction</span>
          <span className="font-mono text-blue-300">{dsp.noiseReduction}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={dsp.noiseReduction}
          onChange={(e) => onChange({ noiseReduction: Number(e.target.value) })}
          className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
        />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            { key: 'eqBass', label: 'Bass' },
            { key: 'eqMid', label: 'Mid' },
            { key: 'eqTreble', label: 'Treble' },
          ] as const
        ).map((b) => (
          <div key={b.key}>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>{b.label}</span>
              <span className="font-mono text-cyan-300">
                {dsp[b.key] > 0 ? `+${dsp[b.key]}` : dsp[b.key]}
              </span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={dsp[b.key]}
              onChange={(e) => onChange({ [b.key]: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <aside className="w-full lg:w-[310px] xl:w-[330px] bg-[#070b16] border-t lg:border-t-0 lg:border-l border-slate-800/90 p-3.5 overflow-y-auto max-h-[390px] lg:max-h-none shrink-0 text-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Inspector</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {selectedClip
            ? 'Video Clip'
            : selectedOverlay
            ? selectedOverlay.preset === 'logo'
              ? 'Logo Layer'
              : 'Text Layer'
            : selectedSub
            ? `Subtitle #${selectedSubIdx + 1}`
            : selectedAudio
            ? `${selectedAudio.track.toUpperCase()} Audio`
            : 'Project'}
        </span>
      </div>

      {/* 1. SELECTED VIDEO CLIP INSPECTOR */}
      {selectedClip && (
        <div className="space-y-4">
          <div>
            <div className="font-semibold text-white truncate">{selectedClip.name}</div>
            <div className="text-[11px] font-mono text-blue-300 mt-0.5">
              Duration: {formatStudioTimecode(getClipDurationMs(selectedClip))}
            </div>
          </div>

          {/* Clip Actions */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-5 gap-1">
              <button
                type="button"
                onClick={() => onMoveClip(selectedClip.id, 'left')}
                title="Move clip earlier"
                className="py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-slate-300 flex items-center justify-center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveClip(selectedClip.id, 'right')}
                title="Move clip later"
                className="py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-slate-300 flex items-center justify-center"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSplitClip(selectedClip.id)}
                title="Split at playhead"
                className="py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-blue-300 flex items-center justify-center"
              >
                <Scissors className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDuplicateClip(selectedClip.id)}
                title="Duplicate clip (D)"
                className="py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 flex items-center justify-center"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteClip(selectedClip.id)}
                title="Delete clip"
                className="py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onRippleDeleteClip(selectedClip.id)}
                className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-[10px] text-rose-300"
              >
                Ripple Del
              </button>
              <button
                type="button"
                onClick={() => onCopyClipEffects(selectedClip)}
                className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-[10px] text-slate-200 flex items-center justify-center gap-1"
              >
                <Copy className="w-2.5 h-2.5 text-blue-400" />
                <span>Copy FX</span>
              </button>
              <button
                type="button"
                disabled={!hasCopiedEffects}
                onClick={() => onPasteClipEffects(selectedClip.id)}
                className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-cyan-200 disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <ClipboardPaste className="w-2.5 h-2.5 text-cyan-400" />
                <span>Paste FX</span>
              </button>
            </div>
          </div>

          {/* Trim Source Range */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-200">Trim Clip Source</div>
            {(() => {
              const assetDur = assets[selectedClip.assetId]?.durationMs || selectedClip.sourceEndMs;
              return (
                <>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>In Point</span>
                      <span className="font-mono text-blue-300">
                        {formatStudioTimecode(selectedClip.sourceStartMs)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(100, selectedClip.sourceEndMs - 200)}
                      step={50}
                      value={selectedClip.sourceStartMs}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, { sourceStartMs: Number(e.target.value) })
                      }
                      className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Out Point</span>
                      <span className="font-mono text-blue-300">
                        {formatStudioTimecode(selectedClip.sourceEndMs)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={selectedClip.sourceStartMs + 200}
                      max={Math.max(selectedClip.sourceEndMs, assetDur)}
                      step={50}
                      value={selectedClip.sourceEndMs}
                      onChange={(e) =>
                        onUpdateClip(selectedClip.id, { sourceEndMs: Number(e.target.value) })
                      }
                      className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                    />
                  </div>
                </>
              );
            })()}
          </div>

          {/* Speed Control & Speed Ramping */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-slate-200">Speed &amp; Ramping</span>
              <span className="font-mono text-cyan-300 font-bold">{selectedClip.speed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.05}
              value={selectedClip.speed}
              onChange={(e) => onUpdateClip(selectedClip.id, { speed: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded"
            />
            <div className="flex flex-wrap gap-1">
              {SPEED_PRESETS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => onUpdateClip(selectedClip.id, { speed: sp })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    Math.abs(selectedClip.speed - sp) < 0.01
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
            <select
              value={selectedClip.speedRamp || 'uniform'}
              onChange={(e) =>
                onUpdateClip(selectedClip.id, { speedRamp: e.target.value as SpeedRampPreset })
              }
              aria-label="Speed ramp curve"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white"
            >
              {(Object.keys(SPEED_RAMP_PRESETS) as SpeedRampPreset[]).map((k) => (
                <option key={k} value={k}>
                  {SPEED_RAMP_PRESETS[k].label}
                </option>
              ))}
            </select>
          </div>

          {/* Keyframes & Transform Animation Inspector */}
          {(() => {
            const clipDur = getClipDurationMs(selectedClip);
            const localOffset = Math.max(
              0,
              Math.min(clipDur, Math.round(currentTimeMs - selectedClip.timelineStartMs))
            );
            const liveKf = evaluateClipKeyframes(selectedClip, localOffset);
            const sortedKfs = [...(selectedClip.keyframes || [])].sort(
              (a, b) => a.timeOffsetMs - b.timeOffsetMs
            );
            const existingNear = sortedKfs.find((k) => Math.abs(k.timeOffsetMs - localOffset) <= 60);

            const commitKeyframePatch = (patch: Partial<ClipKeyframe>) => {
              const updated: ClipKeyframe = existingNear
                ? { ...existingNear, ...patch }
                : {
                    id: `kf_${Date.now().toString(36)}`,
                    timeOffsetMs: localOffset,
                    x: liveKf.x,
                    y: liveKf.y,
                    scale: liveKf.scale,
                    rotation: liveKf.rotation,
                    opacity: liveKf.opacity,
                    easing: 'ease-in-out',
                    ...patch,
                  };
              onUpsertKeyframe(selectedClip.id, updated);
            };

            return (
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-amber-500/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Keyframes ({sortedKfs.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => commitKeyframePatch({})}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 text-[10px] font-semibold"
                  >
                    {existingNear ? 'Keyed @ Now' : '+ Add Keyframe'}
                  </button>
                </div>

                {sortedKfs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sortedKfs.map((kf) => (
                      <div
                        key={kf.id}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          existingNear?.id === kf.id
                            ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSeek(selectedClip.timelineStartMs + kf.timeOffsetMs)}
                          className="hover:text-white"
                          title="Jump to keyframe"
                        >
                          ◆ {(kf.timeOffsetMs / 1000).toFixed(2)}s
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteKeyframe(selectedClip.id, kf.id)}
                          className="text-rose-400 hover:text-rose-200 ml-0.5"
                          title="Remove keyframe"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Pos X</span>
                      <span className="font-mono text-amber-300">{Math.round(liveKf.x)}%</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={liveKf.x}
                      onChange={(e) => commitKeyframePatch({ x: Number(e.target.value) })}
                      className="w-full accent-amber-400 h-1 bg-slate-800 rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Pos Y</span>
                      <span className="font-mono text-amber-300">{Math.round(liveKf.y)}%</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={liveKf.y}
                      onChange={(e) => commitKeyframePatch({ y: Number(e.target.value) })}
                      className="w-full accent-amber-400 h-1 bg-slate-800 rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Scale</span>
                      <span className="font-mono text-amber-300">{liveKf.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={2.5}
                      step={0.05}
                      value={liveKf.scale}
                      onChange={(e) => commitKeyframePatch({ scale: Number(e.target.value) })}
                      className="w-full accent-amber-400 h-1 bg-slate-800 rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Opacity</span>
                      <span className="font-mono text-amber-300">{Math.round(liveKf.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={liveKf.opacity}
                      onChange={(e) => commitKeyframePatch({ opacity: Number(e.target.value) })}
                      className="w-full accent-amber-400 h-1 bg-slate-800 rounded"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Rotation Keyframe</span>
                    <span className="font-mono text-amber-300">{Math.round(liveKf.rotation)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={liveKf.rotation}
                    onChange={(e) => commitKeyframePatch({ rotation: Number(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-slate-800 rounded"
                  />
                </div>

                {existingNear && (
                  <select
                    value={existingNear.easing}
                    onChange={(e) => commitKeyframePatch({ easing: e.target.value as KeyframeEasing })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-white"
                  >
                    <option value="linear">Easing: Linear</option>
                    <option value="ease-in-out">Easing: Ease In-Out</option>
                    <option value="ease-out">Easing: Ease Out</option>
                  </select>
                )}

                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onApplyMotionPreset(selectedClip.id, 'ken-burns-in')}
                    className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] text-slate-300 hover:text-white"
                  >
                    Ken Burns
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyMotionPreset(selectedClip.id, 'pop-in')}
                    className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] text-slate-300 hover:text-white"
                  >
                    Pop-In
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyMotionPreset(selectedClip.id, 'fade-in-out')}
                    className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] text-slate-300 hover:text-white"
                  >
                    Fade In/Out
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyMotionPreset(selectedClip.id, 'clear')}
                    className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] text-rose-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Transition In (All 12 Pro Transitions) */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-200">Transition In</div>
            <select
              value={selectedClip.transitionIn}
              onChange={(e) =>
                onUpdateClip(selectedClip.id, { transitionIn: e.target.value as TransitionType })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
            >
              {TRANSITION_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            {selectedClip.transitionIn !== 'none' && (
              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Custom Duration</span>
                  <span className="font-mono text-blue-300">{selectedClip.transitionDurationMs}ms</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={3000}
                  step={50}
                  value={selectedClip.transitionDurationMs}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { transitionDurationMs: Number(e.target.value) })
                  }
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                />
              </div>
            )}
          </div>

          {/* Rotate & Flip */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-200">Rotate &amp; Flip</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateClip(selectedClip.id, {
                    rotate: (((selectedClip.rotate + 90) % 360) as 0 | 90 | 180 | 270),
                  })
                }
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-slate-200 flex items-center justify-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span>{selectedClip.rotate}°</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateClip(selectedClip.id, { flipH: !selectedClip.flipH })}
                className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 ${
                  selectedClip.flipH
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" />
                <span>Flip H</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateClip(selectedClip.id, { flipV: !selectedClip.flipV })}
                className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 ${
                  selectedClip.flipV
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <FlipVertical2 className="w-3.5 h-3.5" />
                <span>Flip V</span>
              </button>
            </div>
          </div>

          {/* Crop Percentages */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-200">Crop Edges (%)</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateClip(selectedClip.id, { crop: { top: 0, right: 0, bottom: 0, left: 0 } })
                }
                className="text-[10px] text-blue-400 hover:underline"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
                <div key={edge}>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="capitalize">{edge}</span>
                    <span className="font-mono text-blue-300">{selectedClip.crop[edge]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={selectedClip.crop[edge]}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, {
                        crop: { ...selectedClip.crop, [edge]: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Clip Audio, Fades & DSP */}
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-200">Clip Audio &amp; DSP</span>
              <button
                type="button"
                onClick={() => onUpdateClip(selectedClip.id, { muted: !selectedClip.muted })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                  selectedClip.muted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {selectedClip.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-blue-400" />}
                <span>{selectedClip.muted ? 'Muted' : 'Audio On'}</span>
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Volume</span>
                <span className="font-mono text-blue-300">{Math.round(selectedClip.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={selectedClip.volume}
                onChange={(e) => onUpdateClip(selectedClip.id, { volume: Number(e.target.value) })}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Fade In</span>
                  <span className="font-mono">{(selectedClip.fadeInMs / 1000).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4000}
                  step={100}
                  value={selectedClip.fadeInMs}
                  onChange={(e) => onUpdateClip(selectedClip.id, { fadeInMs: Number(e.target.value) })}
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Fade Out</span>
                  <span className="font-mono">{(selectedClip.fadeOutMs / 1000).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4000}
                  step={100}
                  value={selectedClip.fadeOutMs}
                  onChange={(e) => onUpdateClip(selectedClip.id, { fadeOutMs: Number(e.target.value) })}
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
                />
              </div>
            </div>

            {renderAudioDspControls(selectedClip.audioDsp || DEFAULT_AUDIO_DSP, (dspPatch) =>
              onUpdateClip(selectedClip.id, {
                audioDsp: { ...(selectedClip.audioDsp || DEFAULT_AUDIO_DSP), ...dspPatch },
              })
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onExtractClipAudio(selectedClip, 'wav')}
                className="py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-cyan-300 flex items-center justify-center gap-1"
              >
                <FileAudio className="w-3 h-3" />
                <span>Extract WAV</span>
              </button>
              <button
                type="button"
                onClick={() => onExtractClipAudio(selectedClip, 'mp3')}
                className="py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-[10px] text-blue-300 flex items-center justify-center gap-1"
              >
                <FileAudio className="w-3 h-3" />
                <span>Extract MP3</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SELECTED TEXT OR LOGO OVERLAY INSPECTOR */}
      {selectedOverlay && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">
              {selectedOverlay.preset === 'logo' ? 'Edit Logo Layer' : 'Edit Text Overlay'}
            </span>
            <button
              type="button"
              onClick={() => onDeleteOverlay(selectedOverlay.id)}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
              title="Delete overlay"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedOverlay.preset === 'logo' && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
              <div className="text-[10px] font-semibold text-amber-200">Logo Graphic Source</div>
              <select
                value={selectedOverlay.logoAssetId || ''}
                onChange={(e) =>
                  onUpdateOverlay(selectedOverlay.id, { logoAssetId: e.target.value || undefined })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
              >
                <option value="">Built-in SubForge Emblem ({selectedOverlay.text || 'SF'})</option>
                {imageAssets.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => overlayLogoInputRef.current?.click()}
                className="w-full py-1.5 rounded-lg bg-slate-950 border border-slate-700 hover:border-amber-400 text-[10px] text-amber-200 flex items-center justify-center gap-1"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Upload PNG / SVG Logo</span>
              </button>
              <input
                ref={overlayLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadLogoForOverlay(selectedOverlay.id, f);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </div>
          )}

          <textarea
            rows={2}
            value={selectedOverlay.text}
            onChange={(e) => onUpdateOverlay(selectedOverlay.id, { text: e.target.value })}
            placeholder={selectedOverlay.preset === 'logo' ? 'Monogram letters (e.g. SF)...' : 'Overlay heading...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />

          {selectedOverlay.preset === 'lower-third' && (
            <input
              type="text"
              value={selectedOverlay.subtitleText || ''}
              onChange={(e) => onUpdateOverlay(selectedOverlay.id, { subtitleText: e.target.value })}
              placeholder="Subtitle / role line..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Start (s)</label>
              <input
                type="number"
                step={0.1}
                min={0}
                value={(selectedOverlay.startMs / 1000).toFixed(1)}
                onChange={(e) =>
                  onUpdateOverlay(selectedOverlay.id, {
                    startMs: Math.max(0, Math.round(Number(e.target.value) * 1000)),
                  })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">End (s)</label>
              <input
                type="number"
                step={0.1}
                min={0.2}
                value={(selectedOverlay.endMs / 1000).toFixed(1)}
                onChange={(e) =>
                  onUpdateOverlay(selectedOverlay.id, {
                    endMs: Math.max(
                      selectedOverlay.startMs + 200,
                      Math.round(Number(e.target.value) * 1000)
                    ),
                  })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>X Pos</span>
                <span>{selectedOverlay.xPercent}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={selectedOverlay.xPercent}
                onChange={(e) => onUpdateOverlay(selectedOverlay.id, { xPercent: Number(e.target.value) })}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Y Pos</span>
                <span>{selectedOverlay.yPercent}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={selectedOverlay.yPercent}
                onChange={(e) => onUpdateOverlay(selectedOverlay.id, { yPercent: Number(e.target.value) })}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{selectedOverlay.preset === 'logo' ? 'Logo Scale Size' : 'Font Size'}</span>
              <span className="font-mono text-blue-300">{selectedOverlay.fontSize}px</span>
            </div>
            <input
              type="range"
              min={18}
              max={110}
              value={selectedOverlay.fontSize}
              onChange={(e) => onUpdateOverlay(selectedOverlay.id, { fontSize: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-300">Foreground</span>
              <input
                type="color"
                value={selectedOverlay.color}
                onChange={(e) => onUpdateOverlay(selectedOverlay.id, { color: e.target.value })}
                className="w-6 h-5 bg-transparent border-0 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-300">Background</span>
              <input
                type="color"
                value={selectedOverlay.bgColor}
                onChange={(e) => onUpdateOverlay(selectedOverlay.id, { bgColor: e.target.value })}
                className="w-6 h-5 bg-transparent border-0 cursor-pointer"
              />
            </label>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Animation</label>
            <select
              value={selectedOverlay.animation}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, {
                  animation: e.target.value as TextOverlayAnimation,
                })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
            >
              <option value="none">Instant</option>
              <option value="fade">Fade In</option>
              <option value="slide-up">Slide Up</option>
              <option value="pop">Scale Pop</option>
              <option value="typewriter">Typewriter</option>
              <option value="reveal-wipe">Text Reveal Wipe</option>
              <option value="bounce">Elastic Bounce</option>
              <option value="glow-pulse">Neon Glow Pulse</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. SELECTED SUBTITLE CUE INSPECTOR */}
      {selectedSub && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSeek(selectedSub.startMs)}
              className="text-blue-400 font-semibold hover:underline"
            >
              Jump to Cue #{selectedSubIdx + 1}
            </button>
            <button
              type="button"
              onClick={() => onDeleteSubtitleCue(selectedSubIdx)}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
              title="Delete subtitle cue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            rows={3}
            value={selectedSub.text}
            onChange={(e) => onUpdateSubtitleCue(selectedSubIdx, { text: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Start (s)</label>
              <input
                type="number"
                step={0.1}
                min={0}
                value={(selectedSub.startMs / 1000).toFixed(2)}
                onChange={(e) =>
                  onUpdateSubtitleCue(selectedSubIdx, {
                    startMs: Math.max(0, Math.round(Number(e.target.value) * 1000)),
                  })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">End (s)</label>
              <input
                type="number"
                step={0.1}
                min={0.2}
                value={(selectedSub.endMs / 1000).toFixed(2)}
                onChange={(e) =>
                  onUpdateSubtitleCue(selectedSubIdx, {
                    endMs: Math.max(
                      selectedSub.startMs + 200,
                      Math.round(Number(e.target.value) * 1000)
                    ),
                  })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-200">Global Subtitle Burn-In Style</div>
            <select
              value={project.subtitleStyle.presetId || 'custom'}
              onChange={(e) => {
                const v = e.target.value as SubtitlePresetStyleId;
                if (v !== 'custom') onApplySubtitlePreset(v);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white"
            >
              <option value="custom">Custom Styling</option>
              {(Object.keys(SUBTITLE_STYLE_PRESETS) as Array<Exclude<SubtitlePresetStyleId, 'custom'>>).map(
                (k) => (
                  <option key={k} value={k}>
                    {SUBTITLE_STYLE_PRESETS[k].label}
                  </option>
                )
              )}
            </select>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Font Size</span>
                <span>{project.subtitleStyle.fontSize}px</span>
              </div>
              <input
                type="range"
                min={18}
                max={64}
                value={project.subtitleStyle.fontSize}
                onChange={(e) =>
                  onUpdateSubtitleStyle({ presetId: 'custom', fontSize: Number(e.target.value) })
                }
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Vertical Position</span>
                <span>{project.subtitleStyle.yPercent}%</span>
              </div>
              <input
                type="range"
                min={12}
                max={92}
                value={project.subtitleStyle.yPercent}
                onChange={(e) =>
                  onUpdateSubtitleStyle({ presetId: 'custom', yPercent: Number(e.target.value) })
                }
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. SELECTED AUDIO / SFX ITEM INSPECTOR */}
      {selectedAudio && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white truncate">{selectedAudio.name}</span>
            <button
              type="button"
              onClick={() => onDeleteAudioItem(selectedAudio.id)}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
              title="Remove audio track item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Timeline Start Offset</span>
              <span className="font-mono text-blue-300">{formatStudioTimecode(selectedAudio.startMs)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(10000, totalDurationMs)}
              step={100}
              value={selectedAudio.startMs}
              onChange={(e) => onUpdateAudioItem(selectedAudio.id, { startMs: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-300">Track Output</span>
            <button
              type="button"
              onClick={() => onUpdateAudioItem(selectedAudio.id, { muted: !selectedAudio.muted })}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                selectedAudio.muted ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-600/25 text-blue-200'
              }`}
            >
              {selectedAudio.muted ? 'Muted' : 'Active'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Volume</span>
              <span className="font-mono text-blue-300">{Math.round(selectedAudio.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={selectedAudio.volume}
              onChange={(e) => onUpdateAudioItem(selectedAudio.id, { volume: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Fade In</span>
                <span className="font-mono">{(selectedAudio.fadeInMs / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={4000}
                step={100}
                value={selectedAudio.fadeInMs}
                onChange={(e) => onUpdateAudioItem(selectedAudio.id, { fadeInMs: Number(e.target.value) })}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Fade Out</span>
                <span className="font-mono">{(selectedAudio.fadeOutMs / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={4000}
                step={100}
                value={selectedAudio.fadeOutMs}
                onChange={(e) => onUpdateAudioItem(selectedAudio.id, { fadeOutMs: Number(e.target.value) })}
                className="w-full accent-blue-500 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>

          {renderAudioDspControls(selectedAudio.audioDsp || DEFAULT_AUDIO_DSP, (dspPatch) =>
            onUpdateAudioItem(selectedAudio.id, {
              audioDsp: { ...(selectedAudio.audioDsp || DEFAULT_AUDIO_DSP), ...dspPatch },
            })
          )}
        </div>
      )}

      {/* 5. DEFAULT PROJECT OVERVIEW & SHORTCUTS */}
      {!selectedClip && !selectedOverlay && !selectedSub && !selectedAudio && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-white">Timeline Summary</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Video Clips</div>
                <div className="font-mono text-white font-bold">{project.clips.length}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Subtitles</div>
                <div className="font-mono text-cyan-300 font-bold">{project.subtitles.length}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Text &amp; Logos</div>
                <div className="font-mono text-blue-300 font-bold">{project.textOverlays.length}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Music / SFX</div>
                <div className="font-mono text-emerald-300 font-bold">{project.audioItems.length}</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-blue-400" />
              <span>Studio Shortcuts</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span>Play / Pause</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px]">
                  Space
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Frame Step (-1f / +1f)</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px]">
                  , / .
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Split Clip at Playhead</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px]">
                  S
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Duplicate Clip</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px]">
                  D
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Undo / Redo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px]">
                  Ctrl+Z / Y
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Nudge 0.5s</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px]">
                  ← / →
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
