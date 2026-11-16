import React, { useMemo, useRef, useState } from 'react';
import {
  Film,
  Type,
  Captions,
  Music,
  Volume2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Layers,
  Brackets,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  VolumeX,
  Magnet,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_TRACK_STATES,
  MediaAsset,
  SelectedTimelineItem,
  TrackControlState,
  TrackId,
  VideoProjectState,
  getClipDurationMs,
  getTotalTimelineDurationMs,
} from '../../types/videoStudio';
import { formatStudioTimecode } from './StudioPreviewPlayer';

interface StudioTimelineProps {
  project: VideoProjectState;
  assets: Record<string, MediaAsset>;
  currentTimeMs: number;
  selectedItem: SelectedTimelineItem;
  onSelectItem: (item: SelectedTimelineItem) => void;
  onSeek: (timeMs: number) => void;
  onSplitAtPlayhead: () => void;
  onMarkInAtPlayhead: () => void;
  onMarkOutAtPlayhead: () => void;
  onMergeClips: () => void;
  onDuplicateSelectedClip: () => void;
  onRippleDeleteSelectedClip: () => void;
  onToggleTrackFlag: (track: TrackId, flag: keyof TrackControlState) => void;
  onToggleSnapping: () => void;
  onNudgeOverlayStart: (id: string, deltaMs: number) => void;
  onNudgeAudioStart: (id: string, deltaMs: number) => void;
  onNudgeSubtitleStart: (index: number, deltaMs: number) => void;
}

export function StudioTimeline({
  project,
  assets,
  currentTimeMs,
  selectedItem,
  onSelectItem,
  onSeek,
  onSplitAtPlayhead,
  onMarkInAtPlayhead,
  onMarkOutAtPlayhead,
  onMergeClips,
  onDuplicateSelectedClip,
  onRippleDeleteSelectedClip,
  onToggleTrackFlag,
  onToggleSnapping,
  onNudgeOverlayStart,
  onNudgeAudioStart,
  onNudgeSubtitleStart,
}: StudioTimelineProps) {
  const [pxPerSec, setPxPerSec] = useState<number>(64);
  const [activeSnapLineMs, setActiveSnapLineMs] = useState<number | null>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const totalDurationMs = Math.max(12000, getTotalTimelineDurationMs(project) + 4000);
  const timelineWidthPx = Math.max(760, Math.round((totalDurationMs / 1000) * pxPerSec));

  // Collect all magnetic snap targets (playhead, clip boundaries, music beats)
  const snapTargetsMs = useMemo(() => {
    const targets = new Set<number>([0, currentTimeMs]);
    project.clips.forEach((c) => {
      targets.add(c.timelineStartMs);
      targets.add(c.timelineStartMs + getClipDurationMs(c));
    });
    (project.beatMarkersMs || []).forEach((b) => targets.add(b));
    return Array.from(targets);
  }, [currentTimeMs, project.beatMarkersMs, project.clips]);

  const applyMagneticSnap = (candidateMs: number): number => {
    if (!project.snappingEnabled) {
      setActiveSnapLineMs(null);
      return candidateMs;
    }
    const thresholdMs = Math.max(120, Math.round((10 / pxPerSec) * 1000));
    let closest = candidateMs;
    let bestDist = thresholdMs;
    for (const t of snapTargetsMs) {
      const dist = Math.abs(t - candidateMs);
      if (dist < bestDist) {
        bestDist = dist;
        closest = t;
      }
    }
    setActiveSnapLineMs(closest !== candidateMs ? closest : null);
    return closest;
  };

  const timeFromClientX = (clientX: number) => {
    const el = trackAreaRef.current;
    if (!el) return currentTimeMs;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    return Math.max(0, Math.round((x / pxPerSec) * 1000));
  };

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    onSeek(timeFromClientX(e.clientX));
    const onMove = (ev: MouseEvent) => onSeek(timeFromClientX(ev.clientX));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startHorizontalDrag = (
    e: React.MouseEvent,
    initialStartMs: number,
    onCommitDelta: (deltaMs: number) => void
  ) => {
    e.stopPropagation();
    const startX = e.clientX;
    let currentAppliedStart = initialStartMs;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const rawTargetStart = Math.max(0, initialStartMs + Math.round((dx / pxPerSec) * 1000));
      const snappedStart = applyMagneticSnap(rawTargetStart);
      const stepDelta = snappedStart - currentAppliedStart;
      if (Math.abs(stepDelta) >= 35) {
        currentAppliedStart += stepDelta;
        onCommitDelta(stepDelta);
      }
    };
    const onUp = () => {
      setActiveSnapLineMs(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const rulerStepSec = pxPerSec >= 90 ? 1 : pxPerSec >= 45 ? 2 : 5;
  const tickCount = Math.ceil(totalDurationMs / 1000 / rulerStepSec);
  const playheadX = Math.round((currentTimeMs / 1000) * pxPerSec);

  const musicItems = project.audioItems.filter((a) => a.track === 'music');
  const sfxItems = project.audioItems.filter((a) => a.track === 'sfx');
  const trackStates = project.trackStates || DEFAULT_TRACK_STATES;
  const hasSelectedClip = selectedItem?.kind === 'clip';

  const trackConfigs: Array<{
    id: TrackId;
    label: string;
    icon: any;
    color: string;
    h: string;
    hasHide: boolean;
    hasMute: boolean;
  }> = [
    { id: 'V1', label: 'Video V1', icon: Film, color: 'text-blue-400', h: 'h-12', hasHide: true, hasMute: true },
    { id: 'T1', label: 'Text T1', icon: Type, color: 'text-cyan-400', h: 'h-9', hasHide: true, hasMute: false },
    { id: 'S1', label: 'Subtitles', icon: Captions, color: 'text-sky-400', h: 'h-9', hasHide: true, hasMute: false },
    { id: 'A1', label: 'Music A1', icon: Music, color: 'text-indigo-400', h: 'h-9', hasHide: false, hasMute: true },
    { id: 'A2', label: 'SFX A2', icon: Volume2, color: 'text-teal-400', h: 'h-9', hasHide: false, hasMute: true },
  ];

  return (
    <section
      aria-label="Multi-track video editing timeline"
      className="bg-[#050812] border-t border-slate-800/90 flex flex-col select-none"
    >
      {/* Timeline Action Bar */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-800/80 bg-[#070b16] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mr-1">
            Timeline
          </span>
          <button
            type="button"
            onClick={onSplitAtPlayhead}
            disabled={project.clips.length === 0 || trackStates.V1.locked}
            title="Split clip at playhead (S)"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Scissors className="w-3 h-3 text-blue-400" />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={onDuplicateSelectedClip}
            disabled={!hasSelectedClip || trackStates.V1.locked}
            title="Duplicate selected clip"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>
          <button
            type="button"
            onClick={onRippleDeleteSelectedClip}
            disabled={!hasSelectedClip || trackStates.V1.locked}
            title="Ripple Delete clip (shifts subsequent clips & timing)"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-[11px] text-rose-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Ripple Del</span>
          </button>
          <button
            type="button"
            onClick={onMarkInAtPlayhead}
            disabled={project.clips.length === 0 || trackStates.V1.locked}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Brackets className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Trim In</span>
          </button>
          <button
            type="button"
            onClick={onMarkOutAtPlayhead}
            disabled={project.clips.length === 0 || trackStates.V1.locked}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Brackets className="w-3 h-3 text-cyan-400 rotate-180" />
            <span className="hidden md:inline">Trim Out</span>
          </button>
          <button
            type="button"
            onClick={onMergeClips}
            disabled={project.clips.length < 2 || trackStates.V1.locked}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Layers className="w-3 h-3 text-blue-400" />
            <span className="hidden md:inline">Merge</span>
          </button>
        </div>

        {/* Snap Toggle & Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSnapping}
            title="Toggle magnetic snapping to playhead, clip edges & music beats"
            className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              project.snappingEnabled
                ? 'bg-cyan-500/15 border-cyan-500/45 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Magnet className="w-3 h-3" />
            <span>Snap</span>
          </button>

          <button
            type="button"
            onClick={() => setPxPerSec((z) => Math.max(20, z - 12))}
            aria-label="Zoom out timeline"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={20}
            max={160}
            value={pxPerSec}
            onChange={(e) => setPxPerSec(Number(e.target.value))}
            aria-label="Timeline zoom"
            className="w-16 sm:w-24 accent-blue-500 h-1 bg-slate-800 rounded cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setPxPerSec((z) => Math.min(160, z + 12))}
            aria-label="Zoom in timeline"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-400 w-12 text-right hidden sm:inline">
            {pxPerSec}px/s
          </span>
        </div>
      </div>

      {/* Synchronized Track Headers (Lock / Hide / Mute) + Scrollable Track Grid */}
      <div className="flex min-h-[215px]">
        <div className="w-32 sm:w-36 shrink-0 bg-[#060914] border-r border-slate-800/90 z-10">
          <div className="h-7 border-b border-slate-800/80 px-2 flex items-center justify-between text-[10px] font-mono text-blue-300">
            <span>{formatStudioTimecode(currentTimeMs)}</span>
            {(project.beatMarkersMs?.length || 0) > 0 && (
              <span className="text-[9px] text-cyan-400" title="Beat sync markers active">
                ♩{project.beatMarkersMs.length}
              </span>
            )}
          </div>
          {trackConfigs.map((tr) => {
            const Icon = tr.icon;
            const st = trackStates[tr.id] || DEFAULT_TRACK_STATES[tr.id];
            return (
              <div
                key={tr.id}
                className={`${tr.h} border-b border-slate-800/60 px-2 flex items-center justify-between gap-1 text-[11px] font-medium ${
                  st.hidden ? 'opacity-45' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 ${tr.color} shrink-0`} />
                  <span className="truncate text-[10px] sm:text-[11px]">{tr.label}</span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleTrackFlag(tr.id, 'locked')}
                    title={st.locked ? `Unlock ${tr.id}` : `Lock ${tr.id}`}
                    aria-label={`Toggle lock ${tr.id}`}
                    className={`p-1 rounded ${
                      st.locked ? 'text-amber-400 bg-amber-500/15' : 'text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {st.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  {tr.hasHide && (
                    <button
                      type="button"
                      onClick={() => onToggleTrackFlag(tr.id, 'hidden')}
                      title={st.hidden ? `Show ${tr.id}` : `Hide ${tr.id}`}
                      aria-label={`Toggle visibility ${tr.id}`}
                      className={`p-1 rounded ${
                        st.hidden ? 'text-rose-400 bg-rose-500/15' : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {st.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}
                  {tr.hasMute && (
                    <button
                      type="button"
                      onClick={() => onToggleTrackFlag(tr.id, 'muted')}
                      title={st.muted ? `Unmute ${tr.id}` : `Mute ${tr.id}`}
                      aria-label={`Toggle mute ${tr.id}`}
                      className={`p-1 rounded ${
                        st.muted ? 'text-rose-400 bg-rose-500/15' : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {st.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Ruler & Multi-Track Canvas */}
        <div ref={trackAreaRef} className="flex-1 overflow-x-auto relative bg-[#04060d]">
          <div className="relative" style={{ width: `${timelineWidthPx}px` }}>
            {/* Time Ruler */}
            <div
              onMouseDown={handleRulerMouseDown}
              className="h-7 border-b border-slate-800 bg-[#080d1b] relative cursor-ew-resize"
            >
              {Array.from({ length: tickCount + 1 }, (_, i) => {
                const sec = i * rulerStepSec;
                const left = Math.round(sec * pxPerSec);
                return (
                  <div
                    key={sec}
                    style={{ left: `${left}px` }}
                    className="absolute top-0 bottom-0 border-l border-slate-700/70 pl-1 text-[10px] font-mono text-slate-400 flex items-center"
                  >
                    {sec}s
                  </div>
                );
              })}

              {/* Beat Markers on Ruler */}
              {(project.beatMarkersMs || []).map((beatMs, i) => (
                <div
                  key={`${beatMs}-${i}`}
                  style={{ left: `${Math.round((beatMs / 1000) * pxPerSec)}px` }}
                  className="absolute bottom-0 w-px h-2.5 bg-cyan-400/80 pointer-events-none"
                />
              ))}
            </div>

            {/* V1: VIDEO TRACK */}
            <div
              className={`h-12 border-b border-slate-800/60 relative bg-slate-950/40 ${
                trackStates.V1.locked ? 'opacity-70' : ''
              }`}
            >
              {project.clips.map((clip, clipIdx) => {
                const durMs = getClipDurationMs(clip);
                const leftPx = Math.round((clip.timelineStartMs / 1000) * pxPerSec);
                const widthPx = Math.max(28, Math.round((durMs / 1000) * pxPerSec));
                const isSelected = selectedItem?.kind === 'clip' && selectedItem.id === clip.id;
                const kfs = clip.keyframes || [];

                return (
                  <div
                    key={clip.id}
                    onClick={() => onSelectItem({ kind: 'clip', id: clip.id })}
                    style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                    className={`absolute top-1 bottom-1 rounded-lg px-2 flex flex-col justify-center cursor-pointer overflow-hidden border transition-colors ${
                      isSelected
                        ? 'bg-blue-600/35 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.45)]'
                        : 'bg-blue-900/35 border-blue-500/40 hover:border-blue-400/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-white truncate">
                      <span className="truncate">{clip.name}</span>
                      {(clip.speed !== 1 || (clip.speedRamp && clip.speedRamp !== 'uniform')) && (
                        <span className="px-1 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] shrink-0">
                          {clip.speedRamp && clip.speedRamp !== 'uniform' ? 'Ramp' : `${clip.speed}x`}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-blue-200/80 truncate flex items-center gap-1.5">
                      <span>{formatStudioTimecode(durMs)}</span>
                      {clipIdx > 0 && clip.transitionIn !== 'none' && (
                        <span className="px-1 rounded bg-blue-500/30 text-blue-100 text-[8px] uppercase">
                          {clip.transitionIn}
                        </span>
                      )}
                      {kfs.length > 0 && (
                        <span className="text-amber-300 text-[9px]" title={`${kfs.length} keyframes`}>
                          ◆{kfs.length}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* T1: TEXT & LOGO TRACK */}
            <div className="h-9 border-b border-slate-800/60 relative">
              {project.textOverlays.map((ov) => {
                const leftPx = Math.round((ov.startMs / 1000) * pxPerSec);
                const widthPx = Math.max(22, Math.round(((ov.endMs - ov.startMs) / 1000) * pxPerSec));
                const isSelected = selectedItem?.kind === 'text' && selectedItem.id === ov.id;
                return (
                  <div
                    key={ov.id}
                    onMouseDown={(e) => {
                      onSelectItem({ kind: 'text', id: ov.id });
                      if (!trackStates.T1.locked) {
                        startHorizontalDrag(e, ov.startMs, (deltaMs) => onNudgeOverlayStart(ov.id, deltaMs));
                      }
                    }}
                    style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                    className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center text-[10px] font-semibold truncate border ${
                      trackStates.T1.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                    } ${
                      isSelected
                        ? 'bg-cyan-600/35 border-cyan-300 text-white'
                        : 'bg-cyan-900/35 border-cyan-500/40 text-cyan-100 hover:border-cyan-400'
                    }`}
                  >
                    <span className="truncate">{ov.preset === 'logo' ? `Logo: ${ov.text}` : ov.text}</span>
                  </div>
                );
              })}
            </div>

            {/* S1: SUBTITLES TRACK */}
            <div className="h-9 border-b border-slate-800/60 relative bg-slate-950/30">
              {project.subtitles.map((cue, idx) => {
                const leftPx = Math.round((cue.startMs / 1000) * pxPerSec);
                const widthPx = Math.max(18, Math.round(((cue.endMs - cue.startMs) / 1000) * pxPerSec));
                const isSelected = selectedItem?.kind === 'subtitle' && selectedItem.index === idx;
                return (
                  <div
                    key={`${cue.id || idx}-${cue.startMs}`}
                    onMouseDown={(e) => {
                      onSelectItem({ kind: 'subtitle', index: idx });
                      if (!trackStates.S1.locked) {
                        startHorizontalDrag(e, cue.startMs, (deltaMs) => onNudgeSubtitleStart(idx, deltaMs));
                      }
                    }}
                    style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                    className={`absolute top-1 bottom-1 rounded-md px-1.5 flex items-center text-[10px] truncate border ${
                      trackStates.S1.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                    } ${
                      isSelected
                        ? 'bg-sky-600/40 border-sky-300 text-white'
                        : 'bg-sky-900/35 border-sky-500/40 text-sky-100 hover:border-sky-400'
                    }`}
                  >
                    <span className="truncate">{cue.text}</span>
                  </div>
                );
              })}
            </div>

            {/* A1: MUSIC TRACK */}
            <div className="h-9 border-b border-slate-800/60 relative">
              {musicItems.map((item) => {
                const durMs = Math.max(200, item.sourceEndMs - item.sourceStartMs);
                const leftPx = Math.round((item.startMs / 1000) * pxPerSec);
                const widthPx = Math.max(24, Math.round((durMs / 1000) * pxPerSec));
                const isSelected = selectedItem?.kind === 'audio' && selectedItem.id === item.id;
                const peaks = assets[item.assetId]?.waveformPeaks || [];
                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => {
                      onSelectItem({ kind: 'audio', id: item.id });
                      if (!trackStates.A1.locked) {
                        startHorizontalDrag(e, item.startMs, (deltaMs) => onNudgeAudioStart(item.id, deltaMs));
                      }
                    }}
                    style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                    className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between overflow-hidden border ${
                      trackStates.A1.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                    } ${
                      isSelected
                        ? 'bg-indigo-600/40 border-indigo-300 text-white'
                        : 'bg-indigo-900/35 border-indigo-500/40 text-indigo-100 hover:border-indigo-400'
                    }`}
                  >
                    {peaks.length > 0 && (
                      <div className="absolute inset-0 flex items-center gap-[2px] px-1 opacity-35 pointer-events-none">
                        {peaks.map((pk, idx) => (
                          <div
                            key={idx}
                            className="flex-1 bg-indigo-300 rounded-full"
                            style={{ height: `${Math.round(pk * 85)}%` }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="relative z-10 text-[10px] font-semibold truncate">{item.name}</span>
                  </div>
                );
              })}
            </div>

            {/* A2: SFX TRACK */}
            <div className="h-9 border-b border-slate-800/60 relative bg-slate-950/30">
              {sfxItems.map((item) => {
                const durMs = Math.max(200, item.sourceEndMs - item.sourceStartMs);
                const leftPx = Math.round((item.startMs / 1000) * pxPerSec);
                const widthPx = Math.max(20, Math.round((durMs / 1000) * pxPerSec));
                const isSelected = selectedItem?.kind === 'audio' && selectedItem.id === item.id;
                const peaks = assets[item.assetId]?.waveformPeaks || [];
                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => {
                      onSelectItem({ kind: 'audio', id: item.id });
                      if (!trackStates.A2.locked) {
                        startHorizontalDrag(e, item.startMs, (deltaMs) => onNudgeAudioStart(item.id, deltaMs));
                      }
                    }}
                    style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                    className={`absolute top-1 bottom-1 rounded-md px-1.5 flex items-center overflow-hidden border ${
                      trackStates.A2.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                    } ${
                      isSelected
                        ? 'bg-teal-600/40 border-teal-300 text-white'
                        : 'bg-teal-900/35 border-teal-500/40 text-teal-100 hover:border-teal-400'
                    }`}
                  >
                    {peaks.length > 0 && (
                      <div className="absolute inset-0 flex items-center gap-[1.5px] px-1 opacity-30 pointer-events-none">
                        {peaks.slice(0, 20).map((pk, idx) => (
                          <div
                            key={idx}
                            className="flex-1 bg-teal-300 rounded-full"
                            style={{ height: `${Math.round(pk * 85)}%` }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="relative z-10 text-[10px] font-semibold truncate">{item.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Active Magnetic Snap Highlight Line */}
            {activeSnapLineMs !== null && (
              <div
                style={{ left: `${Math.round((activeSnapLineMs / 1000) * pxPerSec)}px` }}
                className="absolute top-0 bottom-0 w-px bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-20"
              />
            )}

            {/* Playhead Needle */}
            <div
              style={{ left: `${playheadX}px` }}
              className="absolute top-0 bottom-0 w-px bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)] pointer-events-none z-20"
            >
              <div className="w-2.5 h-3 -ml-[4.5px] bg-blue-400 rounded-b-sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
