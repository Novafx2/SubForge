import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { SEOHead } from '../components/layout/SEOHead';
import { StudioTopBar } from '../components/studio/StudioTopBar';
import { StudioLeftPanel } from '../components/studio/StudioLeftPanel';
import { StudioPreviewPlayer } from '../components/studio/StudioPreviewPlayer';
import { StudioPropertiesPanel } from '../components/studio/StudioPropertiesPanel';
import { StudioTimeline } from '../components/studio/StudioTimeline';
import { StudioProjectsModal } from '../components/studio/StudioProjectsModal';
import {
  DEFAULT_AUDIO_DSP,
  DEFAULT_TRACK_STATES,
  FILTER_PRESETS,
  FilterPresetId,
  MediaAsset,
  SUBTITLE_STYLE_PRESETS,
  SavedProjectSummary,
  SelectedTimelineItem,
  StudioClipboardEffects,
  StudioToolTab,
  SubtitlePresetStyleId,
  VideoClip,
  VideoProjectState,
  WorkflowPresetId,
  getClipDurationMs,
  getResolutionDimensions,
  getTotalTimelineDurationMs,
} from '../types/videoStudio';
import {
  MotionPresetId,
  createInitialHistoryState,
  studioReducer,
} from '../lib/videoStudio/studioReducer';
import {
  deleteSavedProject,
  exportProjectJson,
  listSavedProjects,
  loadProjectFromIndexedDb,
  saveProjectToIndexedDb,
} from '../lib/videoStudio/projectStorage';
import {
  BuiltinAudioDescriptor,
  computeWaveformPeaks,
  connectAudioDspChain,
  decodeBlobToAudioBuffer,
  detectAudioBeats,
  generateBuiltinAudioAsset,
} from '../lib/videoStudio/audioEngine';
import {
  evaluateClipKeyframes,
  findActiveClipAtTime,
  generateSampleCreatorClip,
  getClipSourceTimeSec,
  renderStudioFrameToCanvas,
} from '../lib/videoStudio/canvasCompositor';
import {
  ExportProgressUpdate,
  ExportResult,
  compressAssetDirect,
  exportProjectVideo,
  extractClipAudioFile,
} from '../lib/videoStudio/ffmpegPipeline';
import { autoDetectAndParse, serializeToVtt } from '../utils/vttParser';
import { serializeToSrt } from '../utils/srtParser';
import { translateSubtitleText } from '../lib/aiService';

function readMediaMetadata(
  objectUrl: string,
  kind: 'video' | 'audio'
): Promise<{ durationMs: number; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.preload = 'metadata';
    el.src = objectUrl;
    const cleanup = () => {
      el.onloadedmetadata = null;
      el.onerror = null;
    };
    el.onloadedmetadata = () => {
      const dur = isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration * 1000) : 5000;
      const width = kind === 'video' ? (el as HTMLVideoElement).videoWidth || 1280 : undefined;
      const height = kind === 'video' ? (el as HTMLVideoElement).videoHeight || 720 : undefined;
      cleanup();
      resolve({ durationMs: dur, width, height });
    };
    el.onerror = () => {
      cleanup();
      resolve({
        durationMs: 5000,
        width: kind === 'video' ? 1280 : undefined,
        height: kind === 'video' ? 720 : undefined,
      });
    };
  });
}

function readImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 512, height: img.naturalHeight || 512 });
    img.onerror = () => resolve({ width: 512, height: 512 });
    img.src = objectUrl;
  });
}

function downloadBlobUrl(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface LiveVideoDspChain {
  hp: BiquadFilterNode;
  lp: BiquadFilterNode;
  bass: BiquadFilterNode;
  mid: BiquadFilterNode;
  treble: BiquadFilterNode;
  presence: BiquadFilterNode;
}

export function VideoStudioPage() {
  const [history, dispatch] = useReducer(studioReducer, undefined, createInitialHistoryState);
  const project = history.present;

  const [assetsMap, setAssetsMap] = useState<Record<string, MediaAsset>>({});
  const [activeTab, setActiveTab] = useState<StudioToolTab>('media');
  const [selectedItem, setSelectedItem] = useState<SelectedTimelineItem>(null);
  const [copiedEffects, setCopiedEffects] = useState<StudioClipboardEffects | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loop, setLoop] = useState<boolean>(false);
  const [masterMuted, setMasterMuted] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.9);
  const [showSafeGuides, setShowSafeGuides] = useState<boolean>(false);

  // Project persistence state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProjectSummary[]>([]);

  // Generation / AI / Mic / Beat / Export states
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [addingAudioId, setAddingAudioId] = useState<string | null>(null);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [micRecordingSec, setMicRecordingSec] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micTimerRef = useRef<number | null>(null);

  const [isDetectingBeats, setIsDetectingBeats] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgressUpdate | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState<string | null>(null);
  const [compressResult, setCompressResult] = useState<ExportResult | null>(null);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  const [studioToast, setStudioToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementsRef = useRef<Record<string, HTMLVideoElement>>({});
  const imageElementsRef = useRef<Record<string, HTMLImageElement>>({});
  const videoDspChainsRef = useRef<WeakMap<HTMLVideoElement, LiveVideoDspChain>>(new WeakMap());

  const rafRef = useRef<number | null>(null);
  const lastFrameWallRef = useRef<number>(0);
  const playTimeRef = useRef<number>(0);

  // Live Web Audio playback refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const decodedAudioBuffersRef = useRef<Record<string, AudioBuffer>>({});

  const showToast = useCallback((msg: string) => {
    setStudioToast(msg);
    setTimeout(() => {
      setStudioToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const totalDurationMs = useMemo(() => getTotalTimelineDurationMs(project), [project]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Check backend AI status on mount + auto-load latest project summary
  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => {
        if (active) setAiOnline(Boolean(data?.online));
      })
      .catch(() => {
        if (active) setAiOnline(false);
      });

    listSavedProjects().then(async (list) => {
      if (!active) return;
      setSavedProjects(list);
      if (list.length > 0 && project.clips.length === 0) {
        const loaded = await loadProjectFromIndexedDb(list[0].id).catch(() => null);
        if (active && loaded && loaded.project.clips.length > 0) {
          setAssetsMap(loaded.assets);
          dispatch({ type: 'LOAD_PROJECT', project: loaded.project });
          setLastSavedAt(loaded.project.updatedAt);
        }
      }
    });

    return () => {
      active = false;
      if (micTimerRef.current) clearInterval(micTimerRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Maintain hidden HTMLVideoElement & HTMLImageElement caches for loaded assets
  useEffect(() => {
    const vCache = videoElementsRef.current;
    const iCache = imageElementsRef.current;
    for (const asset of Object.values(assetsMap)) {
      if (asset.kind === 'video' && !vCache[asset.id]) {
        const video = document.createElement('video');
        video.src = asset.objectUrl;
        video.playsInline = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';
        video.load();
        vCache[asset.id] = video;
      } else if (asset.kind === 'image' && !iCache[asset.id]) {
        const img = new Image();
        img.src = asset.objectUrl;
        iCache[asset.id] = img;
      }
    }
  }, [assetsMap]);

  // Attach reusable live DSP filters to a video element lazily on playback
  const syncLiveVideoDsp = useCallback(
    async (vid: HTMLVideoElement, clip: VideoClip) => {
      const dsp = clip.audioDsp || DEFAULT_AUDIO_DSP;
      const needsDsp =
        dsp.noiseReduction > 0 ||
        dsp.eqBass !== 0 ||
        dsp.eqMid !== 0 ||
        dsp.eqTreble !== 0 ||
        dsp.voiceEnhance;

      let chain = videoDspChainsRef.current.get(vid);
      if (!chain && !needsDsp) return;

      try {
        const ctx = await ensureAudioContext();
        if (!chain) {
          const src = ctx.createMediaElementSource(vid);
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          const bass = ctx.createBiquadFilter();
          bass.type = 'lowshelf';
          bass.frequency.value = 120;
          const mid = ctx.createBiquadFilter();
          mid.type = 'peaking';
          mid.frequency.value = 1000;
          mid.Q.value = 1.1;
          const treble = ctx.createBiquadFilter();
          treble.type = 'highshelf';
          treble.frequency.value = 5500;
          const presence = ctx.createBiquadFilter();
          presence.type = 'peaking';
          presence.frequency.value = 2800;
          presence.Q.value = 1.2;

          src.connect(hp);
          hp.connect(lp);
          lp.connect(bass);
          bass.connect(mid);
          mid.connect(treble);
          treble.connect(presence);
          presence.connect(ctx.destination);

          chain = { hp, lp, bass, mid, treble, presence };
          videoDspChainsRef.current.set(vid, chain);
        }

        chain.hp.frequency.value = dsp.noiseReduction > 0 ? 70 + (dsp.noiseReduction / 100) * 140 : 20;
        chain.lp.frequency.value = dsp.noiseReduction > 0 ? 14000 - (dsp.noiseReduction / 100) * 5500 : 20000;
        chain.bass.gain.value = dsp.eqBass;
        chain.mid.gain.value = dsp.eqMid;
        chain.treble.gain.value = dsp.eqTreble;
        chain.presence.gain.value = dsp.voiceEnhance ? 4.5 : 0;
      } catch {
        // Gracefully ignore if browser environment restricts MediaElementAudioSourceNode
      }
    },
    [ensureAudioContext]
  );

  // Helper to stop any playing Web Audio nodes (A1/A2)
  const stopScheduledAudio = useCallback(() => {
    for (const node of activeAudioNodesRef.current) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    activeAudioNodesRef.current = [];
  }, []);

  // Schedule A1 Music + A2 SFX clips with Track Mutes, Audio Ducking & DSP Chain
  const startScheduledAudioFrom = useCallback(
    async (startTimelineMs: number) => {
      stopScheduledAudio();
      if (masterMuted || masterVolume <= 0 || project.audioItems.length === 0) return;

      const trackStates = project.trackStates || DEFAULT_TRACK_STATES;
      const duckPct = Math.max(0, Math.min(100, project.audioDucking || 0));
      const hasAudibleV1 = !trackStates.V1.muted && project.clips.some((c) => !c.muted && c.volume > 0);

      try {
        const ctx = await ensureAudioContext();
        const now = ctx.currentTime;

        for (const item of project.audioItems) {
          if (item.muted || item.volume <= 0) continue;
          if (item.track === 'music' && trackStates.A1.muted) continue;
          if (item.track === 'sfx' && trackStates.A2.muted) continue;

          const itemEndMs = item.startMs + (item.sourceEndMs - item.sourceStartMs);
          if (itemEndMs <= startTimelineMs) continue;

          let buffer = decodedAudioBuffersRef.current[item.assetId];
          if (!buffer && assetsMap[item.assetId]) {
            const decoded = await decodeBlobToAudioBuffer(assetsMap[item.assetId].blob, ctx);
            if (decoded) {
              buffer = decoded;
              decodedAudioBuffersRef.current[item.assetId] = decoded;
            }
          }
          if (!buffer) continue;

          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const gain = ctx.createGain();
          let effectiveVol = item.volume * masterVolume;
          if (item.track === 'music' && duckPct > 0 && hasAudibleV1) {
            effectiveVol *= 1 - (duckPct / 100) * 0.72;
          }
          const clampedGain = Math.max(0.0001, Math.min(2, effectiveVol));

          const whenDelaySec = Math.max(0, (item.startMs - startTimelineMs) / 1000);
          const alreadyElapsedSec = Math.max(0, (startTimelineMs - item.startMs) / 1000);
          const sourceOffsetSec = item.sourceStartMs / 1000 + alreadyElapsedSec;
          const remainingDurSec = Math.max(
            0.05,
            (itemEndMs - Math.max(startTimelineMs, item.startMs)) / 1000
          );

          gain.gain.setValueAtTime(clampedGain, now + whenDelaySec);
          connectAudioDspChain(ctx, src, gain, item.audioDsp);
          gain.connect(ctx.destination);
          src.start(now + whenDelaySec, sourceOffsetSec, remainingDurSec);
          activeAudioNodesRef.current.push(src);
        }
      } catch {
        // Ignore audio scheduling errors in restricted headless environments
      }
    },
    [
      assetsMap,
      ensureAudioContext,
      masterMuted,
      masterVolume,
      project.audioDucking,
      project.audioItems,
      project.clips,
      project.trackStates,
      stopScheduledAudio,
    ]
  );

  const pauseAllVideoAudio = useCallback(() => {
    for (const v of Object.values(videoElementsRef.current)) {
      if (!v.paused) v.pause();
    }
    stopScheduledAudio();
  }, [stopScheduledAudio]);

  // Draw current frame to Canvas cleanly whenever state or playhead updates
  const drawFrameAt = useCallback(
    (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const previewRes =
        project.exportSettings.resolution === '4k' ? '1080p' : project.exportSettings.resolution;
      const dims = getResolutionDimensions(project.aspectRatio, previewRes);
      if (canvas.width !== dims.width || canvas.height !== dims.height) {
        canvas.width = dims.width;
        canvas.height = dims.height;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderStudioFrameToCanvas(
        ctx,
        dims.width,
        dims.height,
        project,
        timeMs,
        videoElementsRef.current,
        showSafeGuides,
        imageElementsRef.current
      );
    },
    [project, showSafeGuides]
  );

  // Sync underlying HTMLVideoElement position when scrubbed/paused
  const seekAllVideosTo = useCallback(
    (timeMs: number) => {
      const clamped = Math.max(0, Math.min(totalDurationMs, timeMs));
      playTimeRef.current = clamped;
      setCurrentTimeMs(clamped);

      const { active } = findActiveClipAtTime(project.clips, clamped);
      if (active) {
        const vid = videoElementsRef.current[active.assetId];
        if (vid) {
          const targetSec = getClipSourceTimeSec(active, clamped);
          if (Math.abs(vid.currentTime - targetSec) > 0.03) {
            vid.currentTime = targetSec;
          }
        }
      }

      if (isPlaying) {
        startScheduledAudioFrom(clamped);
      }
    },
    [isPlaying, project.clips, startScheduledAudioFrom, totalDurationMs]
  );

  // Redraw canvas whenever project settings, clips, overlays, or timeMs change
  useEffect(() => {
    drawFrameAt(currentTimeMs);
  }, [currentTimeMs, drawFrameAt]);

  // Real-time playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      pauseAllVideoAudio();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameWallRef.current = performance.now();
    startScheduledAudioFrom(playTimeRef.current);

    const v1Muted = Boolean(project.trackStates?.V1?.muted);

    const step = (now: number) => {
      const deltaMs = Math.min(100, now - lastFrameWallRef.current);
      lastFrameWallRef.current = now;

      let nextTime = playTimeRef.current + deltaMs;
      if (nextTime >= totalDurationMs) {
        if (loop && totalDurationMs > 0) {
          nextTime = 0;
          startScheduledAudioFrom(0);
        } else {
          playTimeRef.current = totalDurationMs;
          setCurrentTimeMs(totalDurationMs);
          setIsPlaying(false);
          pauseAllVideoAudio();
          drawFrameAt(totalDurationMs);
          return;
        }
      }

      playTimeRef.current = nextTime;
      setCurrentTimeMs(nextTime);

      const { active } = findActiveClipAtTime(project.clips, nextTime);
      for (const [assetId, vid] of Object.entries(videoElementsRef.current)) {
        if (!active || active.assetId !== assetId) {
          if (!vid.paused) vid.pause();
        } else {
          const targetSec = getClipSourceTimeSec(active, nextTime);
          vid.playbackRate = Math.max(0.25, Math.min(4, active.speed || 1));

          const clipDur = getClipDurationMs(active);
          const localElapsed = Math.max(0, nextTime - active.timelineStartMs);
          let fadeFactor = 1;
          if (active.fadeInMs > 0 && localElapsed < active.fadeInMs) {
            fadeFactor = Math.min(fadeFactor, localElapsed / active.fadeInMs);
          }
          if (active.fadeOutMs > 0 && clipDur - localElapsed < active.fadeOutMs) {
            fadeFactor = Math.min(fadeFactor, Math.max(0, (clipDur - localElapsed) / active.fadeOutMs));
          }

          vid.muted = masterMuted || v1Muted || active.muted || masterVolume <= 0;
          vid.volume = Math.max(0, Math.min(1, active.volume * masterVolume * fadeFactor));
          syncLiveVideoDsp(vid, active);

          if (Math.abs(vid.currentTime - targetSec) > 0.22) {
            vid.currentTime = targetSec;
          }
          if (vid.paused) {
            vid.play().catch(() => {});
          }
        }
      }

      drawFrameAt(nextTime);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      pauseAllVideoAudio();
    };
  }, [
    drawFrameAt,
    isPlaying,
    loop,
    masterMuted,
    masterVolume,
    pauseAllVideoAudio,
    project.clips,
    project.trackStates,
    startScheduledAudioFrom,
    syncLiveVideoDsp,
    totalDurationMs,
  ]);

  const handleTogglePlay = useCallback(() => {
    if (totalDurationMs <= 0) return;
    if (!isPlaying && currentTimeMs >= totalDurationMs) {
      playTimeRef.current = 0;
      setCurrentTimeMs(0);
    } else {
      playTimeRef.current = currentTimeMs;
    }
    setIsPlaying((prev) => !prev);
  }, [currentTimeMs, isPlaying, totalDurationMs]);

  const activeClipAtPlayhead = useMemo(() => {
    if (selectedItem?.kind === 'clip') {
      const found = project.clips.find((c) => c.id === selectedItem.id);
      if (found) return found;
    }
    return findActiveClipAtTime(project.clips, currentTimeMs).active;
  }, [currentTimeMs, project.clips, selectedItem]);

  const handleSplitAtPlayhead = useCallback(() => {
    const target = activeClipAtPlayhead;
    if (!target) return;
    dispatch({ type: 'SPLIT_CLIP_AT', id: target.id, timelineMs: currentTimeMs });
    showToast('Split clip at playhead.');
  }, [activeClipAtPlayhead, currentTimeMs, showToast]);

  const handleMarkInAtPlayhead = useCallback(() => {
    const target = activeClipAtPlayhead;
    if (!target) return;
    dispatch({ type: 'TRIM_CLIP_IN_AT', id: target.id, timelineMs: currentTimeMs });
    showToast('Trimmed clip start to playhead.');
  }, [activeClipAtPlayhead, currentTimeMs, showToast]);

  const handleMarkOutAtPlayhead = useCallback(() => {
    const target = activeClipAtPlayhead;
    if (!target) return;
    dispatch({ type: 'TRIM_CLIP_OUT_AT', id: target.id, timelineMs: currentTimeMs });
    showToast('Trimmed clip end to playhead.');
  }, [activeClipAtPlayhead, currentTimeMs, showToast]);

  const handleDuplicateClip = useCallback(
    (id?: string) => {
      const targetId = id || activeClipAtPlayhead?.id;
      if (!targetId) return;
      dispatch({ type: 'DUPLICATE_CLIP', id: targetId });
      showToast('Duplicated clip on V1.');
    },
    [activeClipAtPlayhead, showToast]
  );

  const handleRippleDeleteClip = useCallback(
    (id?: string) => {
      const targetId = id || activeClipAtPlayhead?.id;
      if (!targetId) return;
      dispatch({ type: 'RIPPLE_DELETE_CLIP', id: targetId });
      setSelectedItem(null);
      showToast('Ripple deleted clip and closed gap.');
    },
    [activeClipAtPlayhead, showToast]
  );

  const handleCopyClipEffects = useCallback(
    (clip?: VideoClip) => {
      const target = clip || activeClipAtPlayhead;
      if (!target) return;
      setCopiedEffects({
        crop: { ...target.crop },
        rotate: target.rotate,
        flipH: target.flipH,
        flipV: target.flipV,
        speed: target.speed,
        speedRamp: target.speedRamp,
        transitionIn: target.transitionIn,
        transitionDurationMs: target.transitionDurationMs,
        keyframes: target.keyframes ? target.keyframes.map((k) => ({ ...k })) : undefined,
        audioDsp: target.audioDsp ? { ...target.audioDsp } : undefined,
        colorGrading: { ...project.colorGrading },
        visualEffects: {
          ...project.visualEffects,
          chromaKey: { ...project.visualEffects.chromaKey },
        },
      });
      showToast(`Copied FX & animation settings from "${target.name}".`);
    },
    [activeClipAtPlayhead, project.colorGrading, project.visualEffects, showToast]
  );

  const handlePasteClipEffects = useCallback(
    (id?: string) => {
      if (!copiedEffects) return;
      const targetId = id || activeClipAtPlayhead?.id;
      if (!targetId) return;
      dispatch({ type: 'PASTE_CLIP_EFFECTS', id: targetId, effects: copiedEffects });
      showToast('Pasted clip effects, keyframes, color & FX.');
    },
    [activeClipAtPlayhead, copiedEffects, showToast]
  );

  const handleAddKeyframeAtPlayhead = useCallback(() => {
    const clip = activeClipAtPlayhead;
    if (!clip) return;
    const clipDur = getClipDurationMs(clip);
    const offsetMs = Math.max(0, Math.min(clipDur, Math.round(currentTimeMs - clip.timelineStartMs)));
    const live = evaluateClipKeyframes(clip, offsetMs);
    dispatch({
      type: 'UPSERT_CLIP_KEYFRAME',
      clipId: clip.id,
      keyframe: {
        id: `kf_${Date.now().toString(36)}`,
        timeOffsetMs: offsetMs,
        x: live.x,
        y: live.y,
        scale: live.scale,
        rotation: live.rotation,
        opacity: live.opacity,
        easing: 'ease-in-out',
      },
    });
    showToast(`Added keyframe at ${(offsetMs / 1000).toFixed(2)}s inside clip.`);
  }, [activeClipAtPlayhead, currentTimeMs, showToast]);

  // Keyboard shortcuts: Space, S, D, ',' / '.' (frame step), Ctrl+Z/Y, Arrows
  useEffect(() => {
    const frameStepMs = Math.max(16, Math.round(1000 / Math.max(1, project.exportSettings.fps || 30)));
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: 'REDO' });
        else dispatch({ type: 'UNDO' });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleDuplicateClip();
      } else if (e.key === ',') {
        e.preventDefault();
        seekAllVideosTo(Math.max(0, currentTimeMs - frameStepMs));
      } else if (e.key === '.') {
        e.preventDefault();
        seekAllVideosTo(Math.min(totalDurationMs, currentTimeMs + frameStepMs));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekAllVideosTo(Math.max(0, currentTimeMs - 500));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekAllVideosTo(Math.min(totalDurationMs, currentTimeMs + 500));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentTimeMs,
    handleDuplicateClip,
    handleSplitAtPlayhead,
    handleTogglePlay,
    project.exportSettings.fps,
    seekAllVideosTo,
    totalDurationMs,
  ]);

  const addClipFromAsset = useCallback(
    (asset: MediaAsset) => {
      if (asset.kind === 'video') {
        const newClip: VideoClip = {
          id: `clip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          assetId: asset.id,
          name: asset.name,
          timelineStartMs: totalDurationMs,
          sourceStartMs: 0,
          sourceEndMs: asset.durationMs,
          speed: 1,
          speedRamp: 'uniform',
          rotate: 0,
          flipH: false,
          flipV: false,
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
          muted: false,
          volume: 1,
          fadeInMs: 0,
          fadeOutMs: 0,
          transitionIn: project.clips.length > 0 ? 'crossfade' : 'none',
          transitionDurationMs: 400,
        };
        dispatch({ type: 'ADD_CLIP', clip: newClip });
        setSelectedItem({ kind: 'clip', id: newClip.id });
        showToast(`Added "${asset.name}" to V1 Video track.`);
      } else if (asset.kind === 'image') {
        const ovId = `logo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
        dispatch({
          type: 'ADD_TEXT_OVERLAY',
          overlay: {
            id: ovId,
            preset: 'logo',
            logoAssetId: asset.id,
            text: asset.name.slice(0, 4).toUpperCase(),
            startMs: currentTimeMs,
            endMs: Math.max(currentTimeMs + 4000, Math.min(Math.max(4000, totalDurationMs), currentTimeMs + 4500)),
            xPercent: 86,
            yPercent: 16,
            fontSize: 48,
            color: '#FFFFFF',
            bgColor: '#2563EB',
            bgOpacity: 0,
            fontWeight: '800',
            animation: 'fade',
          },
        });
        setSelectedItem({ kind: 'text', id: ovId });
        showToast(`Added logo "${asset.name}" to T1 layer.`);
      } else {
        const itemId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        dispatch({
          type: 'ADD_AUDIO_ITEM',
          item: {
            id: itemId,
            track: 'music',
            assetId: asset.id,
            name: asset.name,
            startMs: currentTimeMs,
            sourceStartMs: 0,
            sourceEndMs: asset.durationMs,
            volume: 0.75,
            muted: false,
            fadeInMs: 300,
            fadeOutMs: 500,
          },
        });
        setSelectedItem({ kind: 'audio', id: itemId });
        showToast(`Added "${asset.name}" to A1 Music track.`);
      }
    },
    [currentTimeMs, project.clips.length, showToast, totalDurationMs]
  );

  // Upload local Video / Audio / Image files
  const handleUploadedFiles = useCallback(
    async (files: FileList | File[], targetOverlayId?: string) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const isVideo =
          file.type.startsWith('video/') ||
          /\.(mp4|webm|mov|mkv|m4v|avi)$/i.test(file.name);
        const isAudio =
          file.type.startsWith('audio/') ||
          /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
        const isImage =
          file.type.startsWith('image/') ||
          /\.(png|jpg|jpeg|webp|svg)$/i.test(file.name);

        if (!isVideo && !isAudio && !isImage) {
          showToast(`Unsupported file type: ${file.name}`);
          continue;
        }

        const kind: 'video' | 'audio' | 'image' = isVideo ? 'video' : isImage ? 'image' : 'audio';
        const objectUrl = URL.createObjectURL(file);
        let durationMs = 5000;
        let width: number | undefined;
        let height: number | undefined;
        let peaks: number[] | undefined;

        if (kind === 'image') {
          const imgMeta = await readImageDimensions(objectUrl);
          width = imgMeta.width;
          height = imgMeta.height;
        } else {
          const meta = await readMediaMetadata(objectUrl, kind);
          durationMs = meta.durationMs;
          width = meta.width;
          height = meta.height;
          if (kind === 'audio') {
            peaks = await computeWaveformPeaks(file);
          }
        }

        const asset: MediaAsset = {
          id: `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          kind,
          mimeType:
            file.type ||
            (kind === 'video' ? 'video/mp4' : kind === 'image' ? 'image/png' : 'audio/mpeg'),
          sizeBytes: file.size,
          durationMs,
          width,
          height,
          waveformPeaks: peaks,
          objectUrl,
          blob: file,
        };

        setAssetsMap((prev) => ({ ...prev, [asset.id]: asset }));

        if (kind === 'image' && targetOverlayId) {
          dispatch({
            type: 'UPDATE_TEXT_OVERLAY',
            id: targetOverlayId,
            patch: { logoAssetId: asset.id },
          });
          showToast(`Assigned custom logo "${asset.name}".`);
        } else {
          addClipFromAsset(asset);
        }
      }
    },
    [addClipFromAsset, showToast]
  );

  const handleLoadSampleClip = async () => {
    setIsGeneratingSample(true);
    try {
      const sampleAsset = await generateSampleCreatorClip();
      setAssetsMap((prev) => ({ ...prev, [sampleAsset.id]: sampleAsset }));
      addClipFromAsset(sampleAsset);

      if (project.subtitles.length === 0) {
        dispatch({
          type: 'SET_SUBTITLES',
          cues: [
            { id: 1, startMs: 300, endMs: 2800, text: 'Welcome to SubForge Video Studio.' },
            {
              id: 2,
              startMs: 3000,
              endMs: 5700,
              text: 'Edit clips, captions, FX, audio & export MP4/WebM/GIF.',
            },
          ],
        });
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not generate sample video clip.');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const handleAddTextOverlay = (
    preset: 'title' | 'lower-third' | 'caption' | 'badge' | 'logo',
    options?: { animation?: VideoProjectState['textOverlays'][number]['animation']; text?: string }
  ) => {
    const id = `txt_${Date.now().toString(36)}`;
    const defaults = {
      title: { text: 'MAIN CREATOR TITLE', xPercent: 50, yPercent: 45, fontSize: 48, bgOpacity: 0.45 },
      'lower-third': {
        text: 'Alex Rivera',
        subtitleText: 'Senior Video Editor · SubForge',
        xPercent: 28,
        yPercent: 78,
        fontSize: 30,
        bgOpacity: 0.8,
      },
      caption: { text: 'Key Creator Highlight', xPercent: 50, yPercent: 80, fontSize: 34, bgOpacity: 0.72 },
      badge: { text: 'NEW EPISODE', xPercent: 82, yPercent: 14, fontSize: 22, bgOpacity: 0.85 },
      logo: { text: 'SF', xPercent: 86, yPercent: 16, fontSize: 44, bgOpacity: 0.9 },
    }[preset];

    dispatch({
      type: 'ADD_TEXT_OVERLAY',
      overlay: {
        id,
        preset,
        text: options?.text || defaults.text,
        subtitleText: 'subtitleText' in defaults ? defaults.subtitleText : undefined,
        startMs: currentTimeMs,
        endMs: Math.max(
          currentTimeMs + 2500,
          Math.min(Math.max(3000, totalDurationMs), currentTimeMs + 3000)
        ),
        xPercent: defaults.xPercent,
        yPercent: defaults.yPercent,
        fontSize: defaults.fontSize,
        color: '#FFFFFF',
        bgColor: preset === 'badge' || preset === 'logo' ? '#2563EB' : '#020617',
        bgOpacity: defaults.bgOpacity,
        fontWeight: '700',
        animation: options?.animation || 'slide-up',
      },
    });
    setSelectedItem({ kind: 'text', id });
  };

  const handleInsertTemplate = (kind: 'intro' | 'outro') => {
    const baseMs = kind === 'intro' ? 0 : Math.max(0, totalDurationMs - 3200);
    const id1 = `tpl_${kind}_1_${Date.now().toString(36)}`;
    const id2 = `tpl_${kind}_2_${Date.now().toString(36)}`;

    if (kind === 'intro') {
      dispatch({
        type: 'ADD_TEXT_OVERLAY',
        overlay: {
          id: id1,
          preset: 'title',
          text: 'SUBFORGE CREATOR STUDIO',
          startMs: baseMs + 100,
          endMs: baseMs + 2900,
          xPercent: 50,
          yPercent: 48,
          fontSize: 50,
          color: '#FFFFFF',
          bgColor: '#020617',
          bgOpacity: 0.6,
          fontWeight: '800',
          animation: 'pop',
        },
      });
      dispatch({
        type: 'ADD_TEXT_OVERLAY',
        overlay: {
          id: id2,
          preset: 'logo',
          text: 'SF',
          startMs: baseMs + 250,
          endMs: baseMs + 2900,
          xPercent: 50,
          yPercent: 25,
          fontSize: 42,
          color: '#FFFFFF',
          bgColor: '#2563EB',
          bgOpacity: 0.9,
          fontWeight: '800',
          animation: 'bounce',
        },
      });
      setSelectedItem({ kind: 'text', id: id1 });
      showToast('Inserted Intro sequence layers.');
    } else {
      dispatch({
        type: 'ADD_TEXT_OVERLAY',
        overlay: {
          id: id1,
          preset: 'title',
          text: 'THANKS FOR WATCHING',
          startMs: baseMs,
          endMs: baseMs + 3000,
          xPercent: 50,
          yPercent: 44,
          fontSize: 46,
          color: '#FFFFFF',
          bgColor: '#020617',
          bgOpacity: 0.65,
          fontWeight: '800',
          animation: 'reveal-wipe',
        },
      });
      dispatch({
        type: 'ADD_TEXT_OVERLAY',
        overlay: {
          id: id2,
          preset: 'badge',
          text: 'SUBSCRIBE & LIKE',
          startMs: baseMs + 350,
          endMs: baseMs + 3000,
          xPercent: 50,
          yPercent: 64,
          fontSize: 24,
          color: '#FFFFFF',
          bgColor: '#2563EB',
          bgOpacity: 0.9,
          fontWeight: '700',
          animation: 'glow-pulse',
        },
      });
      setSelectedItem({ kind: 'text', id: id1 });
      showToast('Inserted Outro end-screen layers.');
    }
  };

  // Voiceover Microphone Recorder (navigator.mediaDevices + MediaRecorder)
  const handleStartMicRecording = async () => {
    setMicError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Microphone recording is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      micRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      const recStartTimelineMs = currentTimeMs;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = async () => {
        if (micTimerRef.current) {
          clearInterval(micTimerRef.current);
          micTimerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        setIsRecordingMic(false);

        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        if (blob.size === 0) return;

        const objectUrl = URL.createObjectURL(blob);
        const meta = await readMediaMetadata(objectUrl, 'audio');
        const peaks = await computeWaveformPeaks(blob);

        const asset: MediaAsset = {
          id: `mic_${Date.now().toString(36)}`,
          name: `Voiceover (${new Date().toLocaleTimeString()})`,
          kind: 'audio',
          mimeType: blob.type || 'audio/webm',
          sizeBytes: blob.size,
          durationMs: meta.durationMs,
          waveformPeaks: peaks,
          objectUrl,
          blob,
        };

        setAssetsMap((prev) => ({ ...prev, [asset.id]: asset }));
        const itemId = `aud_mic_${Date.now().toString(36)}`;
        dispatch({
          type: 'ADD_AUDIO_ITEM',
          item: {
            id: itemId,
            track: 'sfx',
            assetId: asset.id,
            name: asset.name,
            startMs: recStartTimelineMs,
            sourceStartMs: 0,
            sourceEndMs: asset.durationMs,
            volume: 1.15,
            muted: false,
            fadeInMs: 50,
            fadeOutMs: 100,
            audioDsp: { ...DEFAULT_AUDIO_DSP, voiceEnhance: true },
          },
        });
        setSelectedItem({ kind: 'audio', id: itemId });
        showToast('Saved microphone voiceover to A2 track with Voice Enhance.');
      };

      recorder.start(150);
      setIsRecordingMic(true);
      setMicRecordingSec(0);
      micTimerRef.current = window.setInterval(() => {
        setMicRecordingSec((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      setMicError(
        err?.message || 'Microphone permission denied or hardware unavailable in this browser.'
      );
      setIsRecordingMic(false);
    }
  };

  const handleStopMicRecording = () => {
    if (micRecorderRef.current && micRecorderRef.current.state !== 'inactive') {
      micRecorderRef.current.stop();
    }
  };

  // Beat Sync Analyzer
  const handleDetectBeats = async () => {
    const firstAudioItem = project.audioItems[0];
    const targetAsset = firstAudioItem
      ? assetsMap[firstAudioItem.assetId]
      : Object.values(assetsMap).find((a) => a.kind === 'audio');

    if (!targetAsset) {
      showToast('Add a music or audio track first to detect beats.');
      return;
    }

    setIsDetectingBeats(true);
    try {
      const offsetMs = firstAudioItem ? firstAudioItem.startMs : 0;
      const rawBeats = await detectAudioBeats(targetAsset.blob);
      const timelineBeats = rawBeats.map((b) => b + offsetMs);
      dispatch({ type: 'SET_BEAT_MARKERS', markersMs: timelineBeats });
      showToast(`Detected ${timelineBeats.length} audio beat markers on ruler.`);
    } catch {
      showToast('Could not analyze beats in this audio track.');
    } finally {
      setIsDetectingBeats(false);
    }
  };

  const handleAddSubtitleCueAtPlayhead = () => {
    const nextIdx = project.subtitles.length;
    dispatch({
      type: 'ADD_SUBTITLE_CUE',
      cue: {
        id: nextIdx + 1,
        startMs: currentTimeMs,
        endMs: currentTimeMs + 2500,
        text: 'New subtitle dialogue line',
      },
    });
    setSelectedItem({ kind: 'subtitle', index: nextIdx });
  };

  const handleImportSubtitleFile = async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = autoDetectAndParse(raw);
      if (parsed.cues.length === 0) {
        showToast('No valid cues found inside that SRT/VTT file.');
        return;
      }
      dispatch({ type: 'SET_SUBTITLES', cues: parsed.cues });
      setSelectedItem({ kind: 'subtitle', index: 0 });
      showToast(`Imported ${parsed.cues.length} ${parsed.format.toUpperCase()} subtitle cues.`);
    } catch {
      showToast('Failed to read subtitle file.');
    }
  };

  const handleExportSubtitleFile = (fmt: 'srt' | 'vtt') => {
    if (project.subtitles.length === 0) return;
    const text =
      fmt === 'srt'
        ? serializeToSrt(project.subtitles)
        : serializeToVtt(project.subtitles, { includeHeaderTitle: project.name });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    downloadBlobUrl(
      url,
      `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'subtitles'}.${fmt}`
    );
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleTranslateSubtitles = async (
    targetLang: string,
    targetLangName: string,
    mode: 'ai' | 'offline'
  ) => {
    if (project.subtitles.length === 0) return;
    setIsTranslating(true);
    setTranslationStatus(null);

    try {
      if (mode === 'ai') {
        const resp = await fetch('/api/ai/translate-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cues: project.subtitles,
            targetLang,
            targetLangName,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data?.isLiveAi || !Array.isArray(data?.cues)) {
          throw new Error(data?.error || 'External AI subtitle translation is currently offline.');
        }
        dispatch({ type: 'SET_SUBTITLES', cues: data.cues });
        setTranslationStatus({
          type: 'success',
          message: `Translated ${data.cues.length} cues to ${targetLangName} via ${data.provider || 'Gemini AI'}.`,
        });
      } else {
        const srtText = serializeToSrt(project.subtitles);
        const offlineRes = await translateSubtitleText(
          srtText,
          targetLang as 'es' | 'fr' | 'de' | 'pt' | 'it'
        );
        const parsed = autoDetectAndParse(offlineRes.translatedText);
        if (parsed.cues.length > 0) {
          dispatch({ type: 'SET_SUBTITLES', cues: parsed.cues });
          setTranslationStatus({
            type: 'success',
            message: `Applied offline phrase translation (${targetLangName}) across ${parsed.cues.length} cues.`,
          });
        }
      }
    } catch (err: any) {
      setTranslationStatus({
        type: 'error',
        message: err?.message || 'Subtitle translation failed.',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddBuiltinAudio = async (desc: BuiltinAudioDescriptor) => {
    setAddingAudioId(desc.id);
    try {
      const asset = await generateBuiltinAudioAsset(desc);
      setAssetsMap((prev) => ({ ...prev, [asset.id]: asset }));
      const itemId = `aud_${Date.now().toString(36)}`;
      dispatch({
        type: 'ADD_AUDIO_ITEM',
        item: {
          id: itemId,
          track: desc.track,
          assetId: asset.id,
          name: desc.name,
          startMs: desc.track === 'music' ? 0 : currentTimeMs,
          sourceStartMs: 0,
          sourceEndMs: asset.durationMs,
          volume: desc.track === 'music' ? 0.45 : 0.9,
          muted: false,
          fadeInMs: desc.track === 'music' ? 600 : 0,
          fadeOutMs: desc.track === 'music' ? 800 : 100,
        },
      });
      setSelectedItem({ kind: 'audio', id: itemId });
      showToast(`Added "${desc.name}" to ${desc.track === 'music' ? 'A1 Music' : 'A2 SFX'} track.`);
    } finally {
      setAddingAudioId(null);
    }
  };

  const handlePreviewBuiltinAudio = async (desc: BuiltinAudioDescriptor) => {
    const asset = await generateBuiltinAudioAsset(desc);
    const audio = new Audio(asset.objectUrl);
    audio.volume = 0.7;
    audio.play().catch(() => {});
  };

  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      await saveProjectToIndexedDb(project, assetsMap);
      setLastSavedAt(new Date().toISOString());
      const updatedList = await listSavedProjects();
      setSavedProjects(updatedList);
      showToast('Project and media assets saved to IndexedDB.');
    } catch (err: any) {
      showToast(err?.message || 'Could not save project to browser storage.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSavedProject = async (id: string) => {
    const loaded = await loadProjectFromIndexedDb(id);
    if (!loaded) {
      showToast('Project record could not be loaded.');
      return;
    }
    setIsPlaying(false);
    setAssetsMap(loaded.assets);
    dispatch({ type: 'LOAD_PROJECT', project: loaded.project });
    setCurrentTimeMs(0);
    setSelectedItem(null);
    setLastSavedAt(loaded.project.updatedAt);
    showToast(`Loaded "${loaded.project.name}".`);
  };

  const handleDeleteSavedProject = async (id: string) => {
    await deleteSavedProject(id);
    setSavedProjects(await listSavedProjects());
  };

  const handleStartExport = async () => {
    setIsPlaying(false);
    setIsExporting(true);
    setExportError(null);
    setExportResult(null);
    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const result = await exportProjectVideo(
        project,
        assetsMap,
        (update) => setExportProgress(update),
        controller.signal
      );
      setExportResult(result);
      showToast(`Export complete: ${result.fileName}`);
    } catch (err: any) {
      setExportError(err?.message || 'Video render failed.');
    } finally {
      setIsExporting(false);
      exportAbortRef.current = null;
    }
  };

  const handleQuickCompress = async () => {
    const targetClip = activeClipAtPlayhead || project.clips[0];
    if (!targetClip) return;
    const asset = assetsMap[targetClip.assetId];
    if (!asset) return;

    setIsCompressing(true);
    setCompressResult(null);
    setCompressProgress('Starting compression...');
    try {
      const heightMap = { '480p': 480, '720p': 720, '1080p': 1080, '4k': null };
      const res = await compressAssetDirect(
        asset,
        project.exportSettings.crf,
        heightMap[project.exportSettings.resolution],
        (_pct, msg) => setCompressProgress(msg)
      );
      setCompressResult(res);
      showToast(`Compressed clip ready (${(res.sizeBytes / (1024 * 1024)).toFixed(2)} MB).`);
    } catch (err: any) {
      showToast(err?.message || 'Compression failed.');
    } finally {
      setIsCompressing(false);
      setCompressProgress(null);
    }
  };

  const handleExtractAudio = async (clip: VideoClip, fmt: 'wav' | 'mp3') => {
    const asset = assetsMap[clip.assetId];
    if (!asset) return;
    setIsExtractingAudio(true);
    try {
      const res = await extractClipAudioFile(clip, asset, fmt);
      downloadBlobUrl(res.objectUrl, res.fileName);
      showToast(`Extracted ${res.fileName}.`);
    } catch (err: any) {
      showToast(err?.message || 'Audio extraction failed.');
    } finally {
      setIsExtractingAudio(false);
    }
  };

  const applySubtitleStylePreset = (presetId: Exclude<SubtitlePresetStyleId, 'custom'>) => {
    dispatch({
      type: 'UPDATE_SUBTITLE_STYLE',
      patch: { presetId, ...SUBTITLE_STYLE_PRESETS[presetId].patch },
    });
    showToast(`Applied "${SUBTITLE_STYLE_PRESETS[presetId].label}" caption preset.`);
  };

  return (
    <>
      <SEOHead
        title="Video Studio – All-in-One Browser Video Editor | SubForge"
        description="Edit videos in your browser with multi-track timeline, keyframes, transitions, visual FX, chroma key, audio DSP, beat sync, captions, translation, GIF, WebM, and MP4 export."
        canonicalPath="/video-studio"
      />

      <div
        id="video-studio-terminal"
        className="normal-case bg-[#040711] text-slate-100 border-t border-blue-500/20 flex flex-col min-h-[calc(100vh-72px)]"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*,.mp4,.webm,.mov,.mkv,.mp3,.wav,.ogg,.m4a,.png,.jpg,.jpeg,.webp,.svg"
          onChange={(e) => {
            if (e.target.files) handleUploadedFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Top Studio Toolbar */}
        <StudioTopBar
          projectName={project.name}
          onRenameProject={(name) => dispatch({ type: 'RENAME_PROJECT', name })}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onRedo={() => dispatch({ type: 'REDO' })}
          onReset={() => {
            setIsPlaying(false);
            dispatch({ type: 'RESET_PROJECT' });
            setCurrentTimeMs(0);
            setSelectedItem(null);
            showToast('Workspace reset to blank project.');
          }}
          onSaveProject={handleSaveProject}
          onOpenProjectsModal={async () => {
            setSavedProjects(await listSavedProjects());
            setProjectsModalOpen(true);
          }}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          aspectRatio={project.aspectRatio}
          onChangeAspectRatio={(ratio) => dispatch({ type: 'SET_ASPECT_RATIO', aspectRatio: ratio })}
          aiOnline={aiOnline}
          onOpenExportTab={() => setActiveTab('export')}
          isExporting={isExporting}
        />

        {/* Main 3-Column Editor Workspace (Left Tools | Center Canvas Player | Right Properties) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <StudioLeftPanel
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            project={project}
            assets={Object.values(assetsMap)}
            currentTimeMs={currentTimeMs}
            selectedClipId={activeClipAtPlayhead?.id || null}
            activeClip={activeClipAtPlayhead}
            hasCopiedEffects={Boolean(copiedEffects)}
            onTriggerFilePicker={() => fileInputRef.current?.click()}
            onUploadLogoFile={(file) => handleUploadedFiles([file])}
            onLoadSampleClip={handleLoadSampleClip}
            isGeneratingSample={isGeneratingSample}
            onAddAssetToTimeline={addClipFromAsset}
            onSplitAtPlayhead={handleSplitAtPlayhead}
            onMarkInAtPlayhead={handleMarkInAtPlayhead}
            onMarkOutAtPlayhead={handleMarkOutAtPlayhead}
            onMergeClips={() => {
              dispatch({ type: 'MERGE_ALL_CLIPS' });
              showToast('Merged all V1 clips with seamless transitions.');
            }}
            onDuplicateSelectedClip={() => handleDuplicateClip()}
            onRippleDeleteSelectedClip={() => handleRippleDeleteClip()}
            onCopyClipEffects={() => handleCopyClipEffects()}
            onPasteClipEffects={() => handlePasteClipEffects()}
            onSetFitMode={(fitMode) => dispatch({ type: 'SET_FIT_MODE', fitMode })}
            onAddKeyframeAtPlayhead={handleAddKeyframeAtPlayhead}
            onApplyMotionPreset={(preset: MotionPresetId) => {
              if (!activeClipAtPlayhead) return;
              dispatch({ type: 'APPLY_MOTION_PRESET', clipId: activeClipAtPlayhead.id, preset });
              showToast(`Applied "${preset}" motion curve.`);
            }}
            onSetClipSpeedRamp={(speedRamp) => {
              if (!activeClipAtPlayhead) return;
              dispatch({ type: 'UPDATE_CLIP', id: activeClipAtPlayhead.id, patch: { speedRamp } });
            }}
            onSetClipTransition={(transitionIn, durationMs) => {
              if (!activeClipAtPlayhead) return;
              dispatch({
                type: 'UPDATE_CLIP',
                id: activeClipAtPlayhead.id,
                patch: {
                  transitionIn,
                  transitionDurationMs: durationMs ?? activeClipAtPlayhead.transitionDurationMs,
                },
              });
            }}
            onUpdateClipAudioDsp={(dspPatch) => {
              if (!activeClipAtPlayhead) return;
              dispatch({
                type: 'UPDATE_CLIP',
                id: activeClipAtPlayhead.id,
                patch: {
                  audioDsp: { ...(activeClipAtPlayhead.audioDsp || DEFAULT_AUDIO_DSP), ...dspPatch },
                },
              });
            }}
            onAddTextOverlay={handleAddTextOverlay}
            onInsertTemplate={handleInsertTemplate}
            onSelectOverlay={(id) => setSelectedItem({ kind: 'text', id })}
            onAddSubtitleCueAtPlayhead={handleAddSubtitleCueAtPlayhead}
            onImportSubtitleFile={handleImportSubtitleFile}
            onExportSubtitleFile={handleExportSubtitleFile}
            onToggleSubtitleBurnIn={(enabled) =>
              dispatch({ type: 'UPDATE_SUBTITLE_STYLE', patch: { enabled } })
            }
            onApplySubtitlePreset={applySubtitleStylePreset}
            onSelectSubtitleIndex={(index) => {
              setSelectedItem({ kind: 'subtitle', index });
              if (project.subtitles[index]) {
                seekAllVideosTo(project.subtitles[index].startMs);
              }
            }}
            onTranslateSubtitles={handleTranslateSubtitles}
            isTranslating={isTranslating}
            translationStatus={translationStatus}
            aiOnline={aiOnline}
            onAddBuiltinAudio={handleAddBuiltinAudio}
            onPreviewBuiltinAudio={handlePreviewBuiltinAudio}
            addingAudioId={addingAudioId}
            isRecordingMic={isRecordingMic}
            micRecordingSec={micRecordingSec}
            micError={micError}
            onStartMicRecording={handleStartMicRecording}
            onStopMicRecording={handleStopMicRecording}
            onSetAudioDucking={(amount) => dispatch({ type: 'SET_AUDIO_DUCKING', amount })}
            isDetectingBeats={isDetectingBeats}
            onDetectBeats={handleDetectBeats}
            onAlignSubtitlesToBeats={() => {
              dispatch({ type: 'ALIGN_SUBTITLES_TO_BEATS' });
              showToast('Snapped subtitle cues to detected beat markers.');
            }}
            onApplyColorPreset={(preset: FilterPresetId) =>
              dispatch({
                type: 'UPDATE_COLOR_GRADING',
                patch: { preset, ...FILTER_PRESETS[preset].values },
              })
            }
            onUpdateColor={(patch) => dispatch({ type: 'UPDATE_COLOR_GRADING', patch })}
            onUpdateEffects={(patch) => dispatch({ type: 'UPDATE_VISUAL_EFFECTS', patch })}
            onApplyWorkflowPreset={(presetId: WorkflowPresetId) => {
              dispatch({ type: 'APPLY_WORKFLOW_PRESET', presetId });
              showToast(`Applied "${presetId.toUpperCase()}" studio workflow preset.`);
            }}
            onUpdateExportSettings={(patch) => dispatch({ type: 'UPDATE_EXPORT_SETTINGS', patch })}
            onStartExport={handleStartExport}
            onCancelExport={() => exportAbortRef.current?.abort()}
            isExporting={isExporting}
            exportProgress={exportProgress}
            exportError={exportError}
            exportResult={exportResult}
            onQuickCompressSelected={handleQuickCompress}
            isCompressing={isCompressing}
            compressProgress={compressProgress}
            compressResult={compressResult}
            onExtractAudioSelected={(fmt) => {
              const target = activeClipAtPlayhead || project.clips[0];
              if (target) handleExtractAudio(target, fmt);
            }}
            isExtractingAudio={isExtractingAudio}
          />

          <StudioPreviewPlayer
            canvasRef={canvasRef}
            hasClips={project.clips.length > 0}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            currentTimeMs={currentTimeMs}
            totalDurationMs={totalDurationMs}
            onSeek={seekAllVideosTo}
            loop={loop}
            onToggleLoop={() => setLoop((l) => !l)}
            masterMuted={masterMuted}
            masterVolume={masterVolume}
            onToggleMasterMute={() => setMasterMuted((m) => !m)}
            onChangeMasterVolume={(vol) => {
              setMasterVolume(vol);
              if (vol > 0 && masterMuted) setMasterMuted(false);
            }}
            aspectRatio={project.aspectRatio}
            resolution={project.exportSettings.resolution}
            fps={project.exportSettings.fps}
            showSafeGuides={showSafeGuides}
            onToggleSafeGuides={() => setShowSafeGuides((s) => !s)}
            onDropFiles={handleUploadedFiles}
            onTriggerFilePicker={() => fileInputRef.current?.click()}
            onLoadSampleClip={handleLoadSampleClip}
            isGeneratingSample={isGeneratingSample}
            onSplitAtPlayhead={handleSplitAtPlayhead}
            onMarkInAtPlayhead={handleMarkInAtPlayhead}
            onMarkOutAtPlayhead={handleMarkOutAtPlayhead}
            canEditActiveClip={Boolean(activeClipAtPlayhead)}
          />

          <StudioPropertiesPanel
            project={project}
            assets={assetsMap}
            selectedItem={selectedItem}
            currentTimeMs={currentTimeMs}
            hasCopiedEffects={Boolean(copiedEffects)}
            onUpdateClip={(id, patch) => dispatch({ type: 'UPDATE_CLIP', id, patch })}
            onDeleteClip={(id) => {
              dispatch({ type: 'DELETE_CLIP', id });
              setSelectedItem(null);
            }}
            onRippleDeleteClip={(id) => handleRippleDeleteClip(id)}
            onDuplicateClip={(id) => handleDuplicateClip(id)}
            onCopyClipEffects={(clip) => handleCopyClipEffects(clip)}
            onPasteClipEffects={(id) => handlePasteClipEffects(id)}
            onMoveClip={(id, direction) => dispatch({ type: 'MOVE_CLIP', id, direction })}
            onSplitClip={(id) => dispatch({ type: 'SPLIT_CLIP_AT', id, timelineMs: currentTimeMs })}
            onUpsertKeyframe={(clipId, keyframe) =>
              dispatch({ type: 'UPSERT_CLIP_KEYFRAME', clipId, keyframe })
            }
            onDeleteKeyframe={(clipId, keyframeId) =>
              dispatch({ type: 'DELETE_CLIP_KEYFRAME', clipId, keyframeId })
            }
            onApplyMotionPreset={(clipId, preset) =>
              dispatch({ type: 'APPLY_MOTION_PRESET', clipId, preset })
            }
            onExtractClipAudio={handleExtractAudio}
            onUpdateOverlay={(id, patch) => dispatch({ type: 'UPDATE_TEXT_OVERLAY', id, patch })}
            onUploadLogoForOverlay={(overlayId, file) => handleUploadedFiles([file], overlayId)}
            onDeleteOverlay={(id) => {
              dispatch({ type: 'DELETE_TEXT_OVERLAY', id });
              setSelectedItem(null);
            }}
            onUpdateSubtitleCue={(index, patch) =>
              dispatch({ type: 'UPDATE_SUBTITLE_CUE', index, patch })
            }
            onDeleteSubtitleCue={(index) => {
              dispatch({ type: 'DELETE_SUBTITLE_CUE', index });
              setSelectedItem(null);
            }}
            onUpdateSubtitleStyle={(patch) => dispatch({ type: 'UPDATE_SUBTITLE_STYLE', patch })}
            onApplySubtitlePreset={applySubtitleStylePreset}
            onUpdateAudioItem={(id, patch) => dispatch({ type: 'UPDATE_AUDIO_ITEM', id, patch })}
            onDeleteAudioItem={(id) => {
              dispatch({ type: 'DELETE_AUDIO_ITEM', id });
              setSelectedItem(null);
            }}
            onSeek={seekAllVideosTo}
          />
        </div>

        {/* Bottom Multi-Track Editing Timeline */}
        <StudioTimeline
          project={project}
          assets={assetsMap}
          currentTimeMs={currentTimeMs}
          selectedItem={selectedItem}
          onSelectItem={setSelectedItem}
          onSeek={seekAllVideosTo}
          onSplitAtPlayhead={handleSplitAtPlayhead}
          onMarkInAtPlayhead={handleMarkInAtPlayhead}
          onMarkOutAtPlayhead={handleMarkOutAtPlayhead}
          onMergeClips={() => {
            dispatch({ type: 'MERGE_ALL_CLIPS' });
            showToast('Merged all V1 clips with seamless transitions.');
          }}
          onDuplicateSelectedClip={() => handleDuplicateClip()}
          onRippleDeleteSelectedClip={() => handleRippleDeleteClip()}
          onToggleTrackFlag={(track, flag) =>
            dispatch({ type: 'TOGGLE_TRACK_FLAG', track, flag })
          }
          onToggleSnapping={() => dispatch({ type: 'TOGGLE_SNAPPING' })}
          onNudgeOverlayStart={(id, deltaMs) => {
            const ov = project.textOverlays.find((t) => t.id === id);
            if (!ov) return;
            const dur = ov.endMs - ov.startMs;
            const nextStart = Math.max(0, ov.startMs + deltaMs);
            dispatch({
              type: 'UPDATE_TEXT_OVERLAY',
              id,
              patch: { startMs: nextStart, endMs: nextStart + dur },
            });
          }}
          onNudgeAudioStart={(id, deltaMs) => {
            const item = project.audioItems.find((a) => a.id === id);
            if (!item) return;
            dispatch({
              type: 'UPDATE_AUDIO_ITEM',
              id,
              patch: { startMs: Math.max(0, item.startMs + deltaMs) },
            });
          }}
          onNudgeSubtitleStart={(index, deltaMs) => {
            const cue = project.subtitles[index];
            if (!cue) return;
            const dur = cue.endMs - cue.startMs;
            const nextStart = Math.max(0, cue.startMs + deltaMs);
            dispatch({
              type: 'UPDATE_SUBTITLE_CUE',
              index,
              patch: { startMs: nextStart, endMs: nextStart + dur },
            });
          }}
        />

        {/* IndexedDB Saved Projects Modal */}
        <StudioProjectsModal
          isOpen={projectsModalOpen}
          onClose={() => setProjectsModalOpen(false)}
          projects={savedProjects}
          currentProjectId={project.id}
          onLoadProject={handleLoadSavedProject}
          onDeleteProject={handleDeleteSavedProject}
          onNewProject={() => {
            setIsPlaying(false);
            dispatch({ type: 'RESET_PROJECT' });
            setCurrentTimeMs(0);
            setSelectedItem(null);
          }}
          onExportJson={() => {
            const json = exportProjectJson(project);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            downloadBlobUrl(
              url,
              `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project'}.subforge.json`
            );
          }}
        />

        {/* Subtle Transient Toast Notification */}
        {studioToast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 border border-blue-500/50 text-xs font-medium text-blue-200 shadow-2xl">
            {studioToast}
          </div>
        )}
      </div>
    </>
  );
}
