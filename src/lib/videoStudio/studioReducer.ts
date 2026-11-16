import {
  AspectRatioMode,
  AudioTrackItem,
  ClipKeyframe,
  ColorGradingSettings,
  DEFAULT_AUDIO_DSP,
  DEFAULT_CHROMA_KEY,
  DEFAULT_TRACK_STATES,
  ExportSettings,
  FILTER_PRESETS,
  SUBTITLE_STYLE_PRESETS,
  StudioClipboardEffects,
  SubtitleBurnInStyle,
  TextOverlay,
  TrackControlState,
  TrackId,
  VideoClip,
  VideoFitMode,
  VideoProjectState,
  VisualEffectsSettings,
  WORKFLOW_PRESETS,
  WorkflowPresetId,
  createDefaultVisualEffects,
  createInitialProjectState,
  getClipDurationMs,
  recomputeClipTimelineStarts,
} from '../../types/videoStudio';
import { SubtitleCue } from '../../types/subtitles';

export interface StudioHistoryState {
  past: VideoProjectState[];
  present: VideoProjectState;
  future: VideoProjectState[];
}

const MAX_HISTORY = 45;

export type MotionPresetId =
  | 'clear'
  | 'ken-burns-in'
  | 'ken-burns-out'
  | 'pan-left-right'
  | 'pop-in'
  | 'spin-reveal'
  | 'fade-in-out';

export type StudioAction =
  | { type: 'LOAD_PROJECT'; project: VideoProjectState }
  | { type: 'RESET_PROJECT' }
  | { type: 'RENAME_PROJECT'; name: string }
  | { type: 'SET_ASPECT_RATIO'; aspectRatio: AspectRatioMode }
  | { type: 'SET_FIT_MODE'; fitMode: VideoFitMode }
  | { type: 'ADD_CLIP'; clip: VideoClip }
  | { type: 'UPDATE_CLIP'; id: string; patch: Partial<VideoClip> }
  | { type: 'DELETE_CLIP'; id: string }
  | { type: 'RIPPLE_DELETE_CLIP'; id: string }
  | { type: 'DUPLICATE_CLIP'; id: string }
  | { type: 'MOVE_CLIP'; id: string; direction: 'left' | 'right' }
  | { type: 'SPLIT_CLIP_AT'; id: string; timelineMs: number }
  | { type: 'TRIM_CLIP_IN_AT'; id: string; timelineMs: number }
  | { type: 'TRIM_CLIP_OUT_AT'; id: string; timelineMs: number }
  | { type: 'MERGE_ALL_CLIPS' }
  | { type: 'PASTE_CLIP_EFFECTS'; id: string; effects: StudioClipboardEffects }
  | { type: 'UPSERT_CLIP_KEYFRAME'; clipId: string; keyframe: ClipKeyframe }
  | { type: 'DELETE_CLIP_KEYFRAME'; clipId: string; keyframeId: string }
  | { type: 'APPLY_MOTION_PRESET'; clipId: string; preset: MotionPresetId }
  | { type: 'ADD_TEXT_OVERLAY'; overlay: TextOverlay }
  | { type: 'UPDATE_TEXT_OVERLAY'; id: string; patch: Partial<TextOverlay> }
  | { type: 'DELETE_TEXT_OVERLAY'; id: string }
  | { type: 'SET_SUBTITLES'; cues: SubtitleCue[] }
  | { type: 'ADD_SUBTITLE_CUE'; cue: SubtitleCue }
  | { type: 'UPDATE_SUBTITLE_CUE'; index: number; patch: Partial<SubtitleCue> }
  | { type: 'DELETE_SUBTITLE_CUE'; index: number }
  | { type: 'UPDATE_SUBTITLE_STYLE'; patch: Partial<SubtitleBurnInStyle> }
  | { type: 'ADD_AUDIO_ITEM'; item: AudioTrackItem }
  | { type: 'UPDATE_AUDIO_ITEM'; id: string; patch: Partial<AudioTrackItem> }
  | { type: 'DELETE_AUDIO_ITEM'; id: string }
  | { type: 'UPDATE_COLOR_GRADING'; patch: Partial<ColorGradingSettings> }
  | { type: 'UPDATE_VISUAL_EFFECTS'; patch: Partial<VisualEffectsSettings> }
  | { type: 'UPDATE_EXPORT_SETTINGS'; patch: Partial<ExportSettings> }
  | { type: 'TOGGLE_TRACK_FLAG'; track: TrackId; flag: keyof TrackControlState }
  | { type: 'SET_AUDIO_DUCKING'; amount: number }
  | { type: 'SET_BEAT_MARKERS'; markersMs: number[] }
  | { type: 'TOGGLE_SNAPPING' }
  | { type: 'ALIGN_SUBTITLES_TO_BEATS' }
  | { type: 'APPLY_WORKFLOW_PRESET'; presetId: WorkflowPresetId }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export function normalizeProjectState(raw: VideoProjectState): VideoProjectState {
  const defaults = createInitialProjectState(raw.id);
  return {
    ...defaults,
    ...raw,
    clips: recomputeClipTimelineStarts(raw.clips || []),
    visualEffects: {
      ...createDefaultVisualEffects(),
      ...(raw.visualEffects || {}),
      chromaKey: {
        ...DEFAULT_CHROMA_KEY,
        ...(raw.visualEffects?.chromaKey || {}),
      },
    },
    trackStates: {
      V1: { ...DEFAULT_TRACK_STATES.V1, ...(raw.trackStates?.V1 || {}) },
      T1: { ...DEFAULT_TRACK_STATES.T1, ...(raw.trackStates?.T1 || {}) },
      S1: { ...DEFAULT_TRACK_STATES.S1, ...(raw.trackStates?.S1 || {}) },
      A1: { ...DEFAULT_TRACK_STATES.A1, ...(raw.trackStates?.A1 || {}) },
      A2: { ...DEFAULT_TRACK_STATES.A2, ...(raw.trackStates?.A2 || {}) },
    },
    audioDucking: typeof raw.audioDucking === 'number' ? raw.audioDucking : 0,
    beatMarkersMs: Array.isArray(raw.beatMarkersMs) ? raw.beatMarkersMs : [],
    snappingEnabled: typeof raw.snappingEnabled === 'boolean' ? raw.snappingEnabled : true,
  };
}

function pushHistory(state: StudioHistoryState, nextPresent: VideoProjectState): StudioHistoryState {
  const stamped: VideoProjectState = {
    ...nextPresent,
    updatedAt: new Date().toISOString(),
  };
  const nextPast = [...state.past, state.present].slice(-MAX_HISTORY);
  return {
    past: nextPast,
    present: stamped,
    future: [],
  };
}

export function createInitialHistoryState(): StudioHistoryState {
  return {
    past: [],
    present: createInitialProjectState(),
    future: [],
  };
}

export function studioReducer(state: StudioHistoryState, action: StudioAction): StudioHistoryState {
  const curr = state.present;

  switch (action.type) {
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [curr, ...state.future].slice(0, MAX_HISTORY),
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, curr].slice(-MAX_HISTORY),
        present: next,
        future: state.future.slice(1),
      };
    }

    case 'LOAD_PROJECT': {
      return {
        past: [],
        present: normalizeProjectState(action.project),
        future: [],
      };
    }

    case 'RESET_PROJECT': {
      return pushHistory(state, createInitialProjectState(curr.id));
    }

    case 'RENAME_PROJECT': {
      return pushHistory(state, { ...curr, name: action.name.slice(0, 80) || 'Untitled Studio Project' });
    }

    case 'SET_ASPECT_RATIO': {
      return pushHistory(state, { ...curr, aspectRatio: action.aspectRatio });
    }

    case 'SET_FIT_MODE': {
      return pushHistory(state, { ...curr, fitMode: action.fitMode });
    }

    case 'TOGGLE_TRACK_FLAG': {
      const prevTrack = curr.trackStates?.[action.track] || DEFAULT_TRACK_STATES[action.track];
      return pushHistory(state, {
        ...curr,
        trackStates: {
          ...curr.trackStates,
          [action.track]: {
            ...prevTrack,
            [action.flag]: !prevTrack[action.flag],
          },
        },
      });
    }

    case 'TOGGLE_SNAPPING': {
      return {
        ...state,
        present: { ...curr, snappingEnabled: !curr.snappingEnabled },
      };
    }

    case 'SET_AUDIO_DUCKING': {
      return pushHistory(state, { ...curr, audioDucking: Math.max(0, Math.min(100, action.amount)) });
    }

    case 'SET_BEAT_MARKERS': {
      return pushHistory(state, { ...curr, beatMarkersMs: action.markersMs });
    }

    case 'ALIGN_SUBTITLES_TO_BEATS': {
      if (!curr.beatMarkersMs.length || !curr.subtitles.length) return state;
      const snapToBeat = (ms: number) => {
        let best = ms;
        let minDist = 450;
        for (const b of curr.beatMarkersMs) {
          const d = Math.abs(b - ms);
          if (d < minDist) {
            minDist = d;
            best = b;
          }
        }
        return best;
      };
      const aligned = curr.subtitles.map((cue) => {
        const dur = Math.max(400, cue.endMs - cue.startMs);
        const startMs = snapToBeat(cue.startMs);
        return { ...cue, startMs, endMs: startMs + dur };
      });
      return pushHistory(state, { ...curr, subtitles: aligned });
    }

    case 'ADD_CLIP': {
      if (curr.trackStates?.V1?.locked) return state;
      const clips = recomputeClipTimelineStarts([...curr.clips, action.clip]);
      return pushHistory(state, { ...curr, clips });
    }

    case 'UPDATE_CLIP': {
      if (curr.trackStates?.V1?.locked) return state;
      const updated = curr.clips.map((c) => {
        if (c.id !== action.id) return c;
        const merged = { ...c, ...action.patch };
        if (merged.sourceEndMs - merged.sourceStartMs < 150) {
          merged.sourceEndMs = merged.sourceStartMs + 150;
        }
        return merged;
      });
      return pushHistory(state, { ...curr, clips: recomputeClipTimelineStarts(updated) });
    }

    case 'DELETE_CLIP': {
      if (curr.trackStates?.V1?.locked) return state;
      const remaining = curr.clips.filter((c) => c.id !== action.id);
      return pushHistory(state, { ...curr, clips: recomputeClipTimelineStarts(remaining) });
    }

    case 'RIPPLE_DELETE_CLIP': {
      if (curr.trackStates?.V1?.locked) return state;
      const target = curr.clips.find((c) => c.id === action.id);
      if (!target) return state;
      const cutStart = target.timelineStartMs;
      const cutDur = getClipDurationMs(target);
      const cutEnd = cutStart + cutDur;

      const remainingClips = recomputeClipTimelineStarts(
        curr.clips.filter((c) => c.id !== action.id)
      );

      // Shift text overlays, subtitles & audio items left seamlessly if unlocked
      const nextOverlays = curr.trackStates?.T1?.locked
        ? curr.textOverlays
        : curr.textOverlays
            .filter((t) => !(t.startMs >= cutStart && t.endMs <= cutEnd))
            .map((t) =>
              t.startMs >= cutEnd
                ? { ...t, startMs: Math.max(0, t.startMs - cutDur), endMs: Math.max(200, t.endMs - cutDur) }
                : t
            );

      const nextSubs = curr.trackStates?.S1?.locked
        ? curr.subtitles
        : curr.subtitles
            .filter((s) => !(s.startMs >= cutStart && s.endMs <= cutEnd))
            .map((s) =>
              s.startMs >= cutEnd
                ? { ...s, startMs: Math.max(0, s.startMs - cutDur), endMs: Math.max(200, s.endMs - cutDur) }
                : s
            );

      const nextAudio = curr.audioItems.map((a) => {
        const trackKey: TrackId = a.track === 'music' ? 'A1' : 'A2';
        if (curr.trackStates?.[trackKey]?.locked) return a;
        if (a.startMs >= cutEnd) {
          return { ...a, startMs: Math.max(0, a.startMs - cutDur) };
        }
        return a;
      });

      return pushHistory(state, {
        ...curr,
        clips: remainingClips,
        textOverlays: nextOverlays,
        subtitles: nextSubs,
        audioItems: nextAudio,
      });
    }

    case 'DUPLICATE_CLIP': {
      if (curr.trackStates?.V1?.locked) return state;
      const idx = curr.clips.findIndex((c) => c.id === action.id);
      if (idx === -1) return state;
      const src = curr.clips[idx];
      const clone: VideoClip = {
        ...src,
        id: `${src.id}_copy_${Date.now().toString(36)}`,
        name: `${src.name} (Copy)`,
        keyframes: src.keyframes ? src.keyframes.map((k) => ({ ...k, id: `${k.id}_cp` })) : undefined,
        crop: { ...src.crop },
        audioDsp: src.audioDsp ? { ...src.audioDsp } : undefined,
      };
      const nextClips = [...curr.clips.slice(0, idx + 1), clone, ...curr.clips.slice(idx + 1)];
      return pushHistory(state, { ...curr, clips: recomputeClipTimelineStarts(nextClips) });
    }

    case 'MOVE_CLIP': {
      if (curr.trackStates?.V1?.locked) return state;
      const idx = curr.clips.findIndex((c) => c.id === action.id);
      if (idx === -1) return state;
      const swapIdx = action.direction === 'left' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= curr.clips.length) return state;
      const nextClips = [...curr.clips];
      const temp = nextClips[idx];
      nextClips[idx] = nextClips[swapIdx];
      nextClips[swapIdx] = temp;
      return pushHistory(state, { ...curr, clips: recomputeClipTimelineStarts(nextClips) });
    }

    case 'SPLIT_CLIP_AT': {
      if (curr.trackStates?.V1?.locked) return state;
      const idx = curr.clips.findIndex((c) => c.id === action.id);
      if (idx === -1) return state;
      const target = curr.clips[idx];
      const clipDuration = getClipDurationMs(target);
      const offsetTimelineMs = action.timelineMs - target.timelineStartMs;
      if (offsetTimelineMs <= 150 || offsetTimelineMs >= clipDuration - 150) {
        return state;
      }

      const ratio = offsetTimelineMs / clipDuration;
      const splitSourceMs = Math.round(
        target.sourceStartMs + ratio * (target.sourceEndMs - target.sourceStartMs)
      );
      const firstHalf: VideoClip = {
        ...target,
        sourceEndMs: splitSourceMs,
      };
      const secondHalf: VideoClip = {
        ...target,
        id: `${target.id}_part_${Date.now().toString(36)}`,
        name: `${target.name} (Part 2)`,
        sourceStartMs: splitSourceMs,
        transitionIn: 'none',
      };

      const nextClips = [
        ...curr.clips.slice(0, idx),
        firstHalf,
        secondHalf,
        ...curr.clips.slice(idx + 1),
      ];
      return pushHistory(state, { ...curr, clips: recomputeClipTimelineStarts(nextClips) });
    }

    case 'TRIM_CLIP_IN_AT': {
      if (curr.trackStates?.V1?.locked) return state;
      const idx = curr.clips.findIndex((c) => c.id === action.id);
      if (idx === -1) return state;
      const target = curr.clips[idx];
      const offsetTimelineMs = action.timelineMs - target.timelineStartMs;
      const newSourceStart = Math.round(target.sourceStartMs + offsetTimelineMs * target.speed);
      if (newSourceStart <= target.sourceStartMs || target.sourceEndMs - newSourceStart < 200) {
        return state;
      }
      const nextClips = curr.clips.map((c) =>
        c.id === action.id ? { ...c, sourceStartMs: newSourceStart } : c
      );
      return pushHistory(state, { ...curr, clips: recomputeClipTimelineStarts(nextClips) });
    }

    case 'TRIM_CLIP_OUT_AT': {
      if (curr.trackStates?.V1?.locked) return state;
      const idx = curr.clips.findIndex((c) => c.id === action.id);
      if (idx === -1) return state;
      const target = curr.clips[idx];
      const offsetTimelineMs = action.timelineMs - target.timelineStartMs;
      const newSourceEnd = Math.round(target.sourceStartMs + offsetTimelineMs * target.speed);
      if (newSourceEnd >= target.sourceEndMs || newSourceEnd - target.sourceStartMs < 200) {
        return state;
      }
      const nextClips = curr.clips.map((c) =>
        c.id === action.id ? { ...c, sourceEndMs: newSourceEnd } : c
      );
      return pushHistory(state, { ...curr, clips: recomputeClipTimelineStarts(nextClips) });
    }

    case 'MERGE_ALL_CLIPS': {
      if (curr.trackStates?.V1?.locked) return state;
      const merged = recomputeClipTimelineStarts(
        curr.clips.map((c, idx) => ({
          ...c,
          transitionIn: idx === 0 ? 'none' : c.transitionIn === 'none' ? 'crossfade' : c.transitionIn,
          transitionDurationMs: idx === 0 ? 0 : c.transitionDurationMs || 400,
        }))
      );
      return pushHistory(state, { ...curr, clips: merged });
    }

    case 'PASTE_CLIP_EFFECTS': {
      if (curr.trackStates?.V1?.locked) return state;
      const nextClips = curr.clips.map((c) =>
        c.id === action.id
          ? {
              ...c,
              crop: { ...action.effects.crop },
              rotate: action.effects.rotate,
              flipH: action.effects.flipH,
              flipV: action.effects.flipV,
              speed: action.effects.speed,
              speedRamp: action.effects.speedRamp || 'uniform',
              transitionIn: action.effects.transitionIn,
              transitionDurationMs: action.effects.transitionDurationMs,
              keyframes: action.effects.keyframes
                ? action.effects.keyframes.map((k) => ({ ...k, id: `${k.id}_${Date.now().toString(36)}` }))
                : undefined,
              audioDsp: action.effects.audioDsp ? { ...action.effects.audioDsp } : undefined,
            }
          : c
      );
      return pushHistory(state, {
        ...curr,
        clips: recomputeClipTimelineStarts(nextClips),
        colorGrading: { ...action.effects.colorGrading },
        visualEffects: {
          ...action.effects.visualEffects,
          chromaKey: { ...action.effects.visualEffects.chromaKey },
        },
      });
    }

    case 'UPSERT_CLIP_KEYFRAME': {
      if (curr.trackStates?.V1?.locked) return state;
      const nextClips = curr.clips.map((c) => {
        if (c.id !== action.clipId) return c;
        const existing = c.keyframes || [];
        const filtered = existing.filter(
          (k) => k.id !== action.keyframe.id && Math.abs(k.timeOffsetMs - action.keyframe.timeOffsetMs) > 60
        );
        const sorted = [...filtered, action.keyframe].sort((a, b) => a.timeOffsetMs - b.timeOffsetMs);
        return { ...c, keyframes: sorted };
      });
      return pushHistory(state, { ...curr, clips: nextClips });
    }

    case 'DELETE_CLIP_KEYFRAME': {
      if (curr.trackStates?.V1?.locked) return state;
      const nextClips = curr.clips.map((c) => {
        if (c.id !== action.clipId) return c;
        return {
          ...c,
          keyframes: (c.keyframes || []).filter((k) => k.id !== action.keyframeId),
        };
      });
      return pushHistory(state, { ...curr, clips: nextClips });
    }

    case 'APPLY_MOTION_PRESET': {
      if (curr.trackStates?.V1?.locked) return state;
      const nextClips = curr.clips.map((c) => {
        if (c.id !== action.clipId) return c;
        const dur = getClipDurationMs(c);
        const mk = (
          suffix: string,
          tRatio: number,
          vals: Partial<ClipKeyframe>
        ): ClipKeyframe => ({
          id: `kf_${action.preset}_${suffix}_${Date.now().toString(36)}`,
          timeOffsetMs: Math.round(dur * tRatio),
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          easing: 'ease-in-out',
          ...vals,
        });

        let keyframes: ClipKeyframe[] = [];
        switch (action.preset) {
          case 'ken-burns-in':
            keyframes = [mk('0', 0, { scale: 1.0 }), mk('1', 1, { scale: 1.24 })];
            break;
          case 'ken-burns-out':
            keyframes = [mk('0', 0, { scale: 1.26 }), mk('1', 1, { scale: 1.0 })];
            break;
          case 'pan-left-right':
            keyframes = [mk('0', 0, { x: -12, scale: 1.18 }), mk('1', 1, { x: 12, scale: 1.18 })];
            break;
          case 'pop-in':
            keyframes = [
              mk('0', 0, { scale: 0.65, opacity: 0.1, easing: 'ease-out' }),
              mk('1', 0.18, { scale: 1.06, opacity: 1 }),
              mk('2', 0.3, { scale: 1.0, opacity: 1 }),
            ];
            break;
          case 'spin-reveal':
            keyframes = [
              mk('0', 0, { scale: 0.4, rotation: -90, opacity: 0.2 }),
              mk('1', 0.35, { scale: 1.0, rotation: 0, opacity: 1 }),
            ];
            break;
          case 'fade-in-out':
            keyframes = [
              mk('0', 0, { opacity: 0 }),
              mk('1', 0.15, { opacity: 1 }),
              mk('2', 0.85, { opacity: 1 }),
              mk('3', 1, { opacity: 0 }),
            ];
            break;
          case 'clear':
          default:
            keyframes = [];
            break;
        }
        return { ...c, keyframes };
      });
      return pushHistory(state, { ...curr, clips: nextClips });
    }

    case 'ADD_TEXT_OVERLAY': {
      if (curr.trackStates?.T1?.locked) return state;
      return pushHistory(state, { ...curr, textOverlays: [...curr.textOverlays, action.overlay] });
    }

    case 'UPDATE_TEXT_OVERLAY': {
      if (curr.trackStates?.T1?.locked) return state;
      const textOverlays = curr.textOverlays.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t
      );
      return pushHistory(state, { ...curr, textOverlays });
    }

    case 'DELETE_TEXT_OVERLAY': {
      if (curr.trackStates?.T1?.locked) return state;
      return pushHistory(state, {
        ...curr,
        textOverlays: curr.textOverlays.filter((t) => t.id !== action.id),
      });
    }

    case 'SET_SUBTITLES': {
      if (curr.trackStates?.S1?.locked) return state;
      const sorted = [...action.cues].sort((a, b) => a.startMs - b.startMs);
      return pushHistory(state, { ...curr, subtitles: sorted });
    }

    case 'ADD_SUBTITLE_CUE': {
      if (curr.trackStates?.S1?.locked) return state;
      const sorted = [...curr.subtitles, action.cue].sort((a, b) => a.startMs - b.startMs);
      return pushHistory(state, { ...curr, subtitles: sorted });
    }

    case 'UPDATE_SUBTITLE_CUE': {
      if (curr.trackStates?.S1?.locked) return state;
      const next = curr.subtitles.map((cue, idx) =>
        idx === action.index ? { ...cue, ...action.patch } : cue
      );
      return pushHistory(state, { ...curr, subtitles: next });
    }

    case 'DELETE_SUBTITLE_CUE': {
      if (curr.trackStates?.S1?.locked) return state;
      return pushHistory(state, {
        ...curr,
        subtitles: curr.subtitles.filter((_, idx) => idx !== action.index),
      });
    }

    case 'UPDATE_SUBTITLE_STYLE': {
      return pushHistory(state, {
        ...curr,
        subtitleStyle: { ...curr.subtitleStyle, ...action.patch },
      });
    }

    case 'ADD_AUDIO_ITEM': {
      const tr: TrackId = action.item.track === 'music' ? 'A1' : 'A2';
      if (curr.trackStates?.[tr]?.locked) return state;
      return pushHistory(state, { ...curr, audioItems: [...curr.audioItems, action.item] });
    }

    case 'UPDATE_AUDIO_ITEM': {
      const target = curr.audioItems.find((a) => a.id === action.id);
      if (target) {
        const tr: TrackId = target.track === 'music' ? 'A1' : 'A2';
        if (curr.trackStates?.[tr]?.locked) return state;
      }
      return pushHistory(state, {
        ...curr,
        audioItems: curr.audioItems.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      });
    }

    case 'DELETE_AUDIO_ITEM': {
      const target = curr.audioItems.find((a) => a.id === action.id);
      if (target) {
        const tr: TrackId = target.track === 'music' ? 'A1' : 'A2';
        if (curr.trackStates?.[tr]?.locked) return state;
      }
      return pushHistory(state, {
        ...curr,
        audioItems: curr.audioItems.filter((a) => a.id !== action.id),
      });
    }

    case 'UPDATE_COLOR_GRADING': {
      return pushHistory(state, {
        ...curr,
        colorGrading: { ...curr.colorGrading, ...action.patch },
      });
    }

    case 'UPDATE_VISUAL_EFFECTS': {
      return pushHistory(state, {
        ...curr,
        visualEffects: {
          ...curr.visualEffects,
          ...action.patch,
          chromaKey: action.patch.chromaKey
            ? { ...curr.visualEffects.chromaKey, ...action.patch.chromaKey }
            : curr.visualEffects.chromaKey,
        },
      });
    }

    case 'UPDATE_EXPORT_SETTINGS': {
      return pushHistory(state, {
        ...curr,
        exportSettings: { ...curr.exportSettings, ...action.patch },
      });
    }

    case 'APPLY_WORKFLOW_PRESET': {
      const preset = WORKFLOW_PRESETS.find((p) => p.id === action.presetId);
      if (!preset) return state;
      const colorValues = FILTER_PRESETS[preset.colorPreset].values;
      const subPreset = SUBTITLE_STYLE_PRESETS[preset.subtitlePreset].patch;
      const nextClips = curr.clips.map((c) => ({
        ...c,
        audioDsp: {
          ...(c.audioDsp || DEFAULT_AUDIO_DSP),
          voiceEnhance: preset.voiceEnhance,
          noiseReduction: preset.id === 'podcast' ? 40 : c.audioDsp?.noiseReduction || 0,
        },
      }));

      return pushHistory(state, {
        ...curr,
        aspectRatio: preset.aspectRatio,
        fitMode: preset.fitMode,
        colorGrading: { preset: preset.colorPreset, ...colorValues },
        visualEffects: {
          ...createDefaultVisualEffects(),
          ...preset.effectsPatch,
          chromaKey: curr.visualEffects.chromaKey,
        },
        subtitleStyle: {
          ...curr.subtitleStyle,
          ...subPreset,
          presetId: preset.subtitlePreset,
        },
        exportSettings: {
          ...curr.exportSettings,
          ...preset.exportPatch,
        },
        audioDucking: preset.audioDucking,
        clips: nextClips,
      });
    }

    default:
      return state;
  }
}
