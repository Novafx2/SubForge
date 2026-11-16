import { SubtitleCue } from './subtitles';

export type StudioToolTab =
  | 'media'
  | 'edit'
  | 'animate'
  | 'text'
  | 'subtitles'
  | 'audio'
  | 'color'
  | 'effects'
  | 'presets'
  | 'export';

export type AspectRatioMode = '16:9' | '9:16' | '1:1';
export type VideoFitMode = 'contain-black' | 'contain-blur' | 'cover';

export type TransitionType =
  | 'none'
  | 'crossfade'
  | 'fade-black'
  | 'zoom-reveal'
  | 'swipe'
  | 'wipe'
  | 'glitch'
  | 'flash'
  | 'spin'
  | 'blur'
  | 'slide-left'
  | 'push';

export type FilterPresetId =
  | 'original'
  | 'cinema-warm'
  | 'cyber-blue'
  | 'noir-bw'
  | 'vintage-sepia'
  | 'vivid-punch'
  | 'matte-fade'
  | 'teal-orange'
  | 'tokyo-neon'
  | 'documentary-crisp'
  | 'golden-hour';

export type ExportFormat = 'mp4' | 'webm' | 'gif';
export type ExportResolution = '480p' | '720p' | '1080p' | '4k';
export type ExportFps = 24 | 30 | 60;
export type CompressionPreset = 'high' | 'balanced' | 'compact' | 'ultra-small' | 'custom';

export type TrackId = 'V1' | 'T1' | 'S1' | 'A1' | 'A2';

export interface TrackControlState {
  locked: boolean;
  hidden: boolean;
  muted: boolean;
}

export interface MediaAsset {
  id: string;
  name: string;
  kind: 'video' | 'audio' | 'image';
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  width?: number;
  height?: number;
  waveformPeaks?: number[];
  objectUrl: string;
  blob: Blob;
  isBuiltin?: boolean;
}

export interface CropRect {
  top: number; // % 0-45
  right: number;
  bottom: number;
  left: number;
}

export type KeyframeEasing = 'linear' | 'ease-in-out' | 'ease-out';

export interface ClipKeyframe {
  id: string;
  timeOffsetMs: number; // relative to clip timeline start (0..clipDurationMs)
  x: number; // % offset -50..50
  y: number; // % offset -50..50
  scale: number; // 0.2..3.0
  rotation: number; // degrees -360..360
  opacity: number; // 0..1
  easing: KeyframeEasing;
}

export type SpeedRampPreset =
  | 'uniform'
  | 'ramp-up'
  | 'ramp-down'
  | 'hero-slowmo'
  | 'bullet-peak';

export interface AudioDspSettings {
  noiseReduction: number; // 0..100
  eqBass: number; // -12..12 dB
  eqMid: number; // -12..12 dB
  eqTreble: number; // -12..12 dB
  voiceEnhance: boolean;
}

export interface ChromaKeySettings {
  enabled: boolean;
  keyColor: string; // e.g. '#00FF00'
  similarity: number; // 5..65
  smoothness: number; // 2..40
  spillReduction: number; // 0..100
  replacementBgColor: string;
}

export interface VideoClip {
  id: string;
  assetId: string;
  name: string;
  timelineStartMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  speed: number; // 0.25 - 4.0
  speedRamp?: SpeedRampPreset;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  crop: CropRect;
  muted: boolean;
  volume: number; // 0 - 2.0
  fadeInMs: number;
  fadeOutMs: number;
  audioDsp?: AudioDspSettings;
  transitionIn: TransitionType;
  transitionDurationMs: number;
  keyframes?: ClipKeyframe[];
}

export type TextOverlayAnimation =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'pop'
  | 'typewriter'
  | 'reveal-wipe'
  | 'bounce'
  | 'glow-pulse';

export interface TextOverlay {
  id: string;
  text: string;
  subtitleText?: string;
  preset: 'title' | 'lower-third' | 'caption' | 'badge' | 'logo';
  logoAssetId?: string;
  startMs: number;
  endMs: number;
  xPercent: number;
  yPercent: number;
  fontSize: number;
  color: string;
  bgColor: string;
  bgOpacity: number; // 0 - 1
  fontWeight: '600' | '700' | '800';
  animation: TextOverlayAnimation;
}

export interface AudioTrackItem {
  id: string;
  track: 'music' | 'sfx';
  assetId: string;
  name: string;
  startMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  volume: number; // 0 - 2.0
  muted: boolean;
  fadeInMs: number;
  fadeOutMs: number;
  audioDsp?: AudioDspSettings;
}

export interface ColorGradingSettings {
  preset: FilterPresetId;
  brightness: number; // 50 - 150 (100 default)
  contrast: number; // 50 - 150 (100 default)
  saturation: number; // 0 - 200 (100 default)
  hueRotate: number; // -180 to 180 (0 default)
  temperature: number; // -50 to 50 (0 default)
  vignette: number; // 0 to 100 (0 default)
  blur: number; // 0 to 10 (0 default)
}

export interface VisualEffectsSettings {
  filmGrain: number; // 0 - 100
  scanlines: boolean;
  letterbox: boolean;
  chromaticTint: boolean;
  glitchIntensity: number; // 0 - 100
  rgbSplit: number; // 0 - 100
  chromaticAberration: number; // 0 - 100
  vhsEffect: number; // 0 - 100
  motionBlur: number; // 0 - 100
  glowIntensity: number; // 0 - 100
  neonEdge: number; // 0 - 100
  shakeIntensity: number; // 0 - 100
  backgroundBlur: number; // 0 - 100
  chromaKey: ChromaKeySettings;
}

export type SubtitlePresetStyleId =
  | 'custom'
  | 'classic-cinema'
  | 'bold-social'
  | 'minimal-clean'
  | 'neon-cyber'
  | 'documentary';

export interface SubtitleBurnInStyle {
  enabled: boolean;
  presetId?: SubtitlePresetStyleId;
  fontSize: number;
  color: string;
  bgColor: string;
  bgOpacity: number;
  yPercent: number;
}

export interface ExportSettings {
  format: ExportFormat;
  resolution: ExportResolution;
  fps: ExportFps;
  compressionPreset: CompressionPreset;
  crf: number; // 16 - 40
  gifFps: 10 | 12 | 15 | 20;
  gifWidth: 320 | 480 | 640 | 720;
}

export interface StudioClipboardEffects {
  crop: CropRect;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  speed: number;
  speedRamp?: SpeedRampPreset;
  transitionIn: TransitionType;
  transitionDurationMs: number;
  keyframes?: ClipKeyframe[];
  audioDsp?: AudioDspSettings;
  colorGrading: ColorGradingSettings;
  visualEffects: VisualEffectsSettings;
}

export type WorkflowPresetId =
  | 'cinematic'
  | 'youtube'
  | 'shorts'
  | 'tiktok'
  | 'reels'
  | 'gaming'
  | 'podcast'
  | 'documentary';

export interface VideoProjectState {
  id: string;
  name: string;
  updatedAt: string;
  aspectRatio: AspectRatioMode;
  fitMode: VideoFitMode;
  clips: VideoClip[];
  textOverlays: TextOverlay[];
  subtitles: SubtitleCue[];
  subtitleStyle: SubtitleBurnInStyle;
  audioItems: AudioTrackItem[];
  colorGrading: ColorGradingSettings;
  visualEffects: VisualEffectsSettings;
  exportSettings: ExportSettings;
  trackStates: Record<TrackId, TrackControlState>;
  audioDucking: number; // 0 - 100% auto-duck music under dialogue
  beatMarkersMs: number[];
  snappingEnabled: boolean;
}

export type SelectedTimelineItem =
  | { kind: 'clip'; id: string }
  | { kind: 'text'; id: string }
  | { kind: 'subtitle'; index: number }
  | { kind: 'audio'; id: string }
  | null;

export interface SavedProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  clipCount: number;
  durationMs: number;
  aspectRatio: AspectRatioMode;
}

export const DEFAULT_AUDIO_DSP: AudioDspSettings = {
  noiseReduction: 0,
  eqBass: 0,
  eqMid: 0,
  eqTreble: 0,
  voiceEnhance: false,
};

export const DEFAULT_CHROMA_KEY: ChromaKeySettings = {
  enabled: false,
  keyColor: '#00FF00',
  similarity: 28,
  smoothness: 12,
  spillReduction: 35,
  replacementBgColor: '#050b1a',
};

export const DEFAULT_TRACK_STATES: Record<TrackId, TrackControlState> = {
  V1: { locked: false, hidden: false, muted: false },
  T1: { locked: false, hidden: false, muted: false },
  S1: { locked: false, hidden: false, muted: false },
  A1: { locked: false, hidden: false, muted: false },
  A2: { locked: false, hidden: false, muted: false },
};

export const FILTER_PRESETS: Record<
  FilterPresetId,
  { label: string; values: Omit<ColorGradingSettings, 'preset'> }
> = {
  original: {
    label: 'Original',
    values: { brightness: 100, contrast: 100, saturation: 100, hueRotate: 0, temperature: 0, vignette: 0, blur: 0 },
  },
  'cinema-warm': {
    label: 'Cinema Warm',
    values: { brightness: 102, contrast: 114, saturation: 112, hueRotate: -6, temperature: 22, vignette: 35, blur: 0 },
  },
  'cyber-blue': {
    label: 'Cyber Blue',
    values: { brightness: 98, contrast: 118, saturation: 125, hueRotate: 12, temperature: -28, vignette: 28, blur: 0 },
  },
  'noir-bw': {
    label: 'Noir B&W',
    values: { brightness: 100, contrast: 132, saturation: 0, hueRotate: 0, temperature: 0, vignette: 45, blur: 0 },
  },
  'vintage-sepia': {
    label: 'Vintage Film',
    values: { brightness: 104, contrast: 96, saturation: 72, hueRotate: -12, temperature: 34, vignette: 40, blur: 0 },
  },
  'vivid-punch': {
    label: 'Vivid Punch',
    values: { brightness: 106, contrast: 116, saturation: 145, hueRotate: 0, temperature: 6, vignette: 10, blur: 0 },
  },
  'matte-fade': {
    label: 'Matte Fade',
    values: { brightness: 108, contrast: 86, saturation: 85, hueRotate: 4, temperature: 8, vignette: 18, blur: 0 },
  },
  'teal-orange': {
    label: 'LUT: Teal & Orange',
    values: { brightness: 101, contrast: 122, saturation: 128, hueRotate: -8, temperature: 16, vignette: 32, blur: 0 },
  },
  'tokyo-neon': {
    label: 'LUT: Tokyo Neon',
    values: { brightness: 96, contrast: 128, saturation: 152, hueRotate: 18, temperature: -24, vignette: 34, blur: 0 },
  },
  'documentary-crisp': {
    label: 'LUT: Documentary',
    values: { brightness: 102, contrast: 110, saturation: 94, hueRotate: 0, temperature: -4, vignette: 16, blur: 0 },
  },
  'golden-hour': {
    label: 'LUT: Golden Hour',
    values: { brightness: 107, contrast: 108, saturation: 124, hueRotate: -4, temperature: 38, vignette: 24, blur: 0 },
  },
};

export const SUBTITLE_STYLE_PRESETS: Record<
  Exclude<SubtitlePresetStyleId, 'custom'>,
  { label: string; patch: Partial<SubtitleBurnInStyle> }
> = {
  'classic-cinema': {
    label: 'Classic Cinema',
    patch: { fontSize: 32, color: '#FEF08A', bgColor: '#000000', bgOpacity: 0.45, yPercent: 88 },
  },
  'bold-social': {
    label: 'Bold Pop (Shorts)',
    patch: { fontSize: 42, color: '#FFFFFF', bgColor: '#2563EB', bgOpacity: 0.9, yPercent: 78 },
  },
  'minimal-clean': {
    label: 'Minimal Clean',
    patch: { fontSize: 28, color: '#F8FAFC', bgColor: '#0F172A', bgOpacity: 0.65, yPercent: 86 },
  },
  'neon-cyber': {
    label: 'Neon Cyber',
    patch: { fontSize: 36, color: '#38BDF8', bgColor: '#020617', bgOpacity: 0.85, yPercent: 84 },
  },
  documentary: {
    label: 'Documentary',
    patch: { fontSize: 30, color: '#E2E8F0', bgColor: '#09090B', bgOpacity: 0.78, yPercent: 88 },
  },
};

export const TRANSITION_OPTIONS: Array<{ id: TransitionType; label: string }> = [
  { id: 'none', label: 'None (Hard Cut)' },
  { id: 'fade-black', label: 'Fade (Black)' },
  { id: 'crossfade', label: 'Cross Dissolve' },
  { id: 'zoom-reveal', label: 'Zoom' },
  { id: 'swipe', label: 'Swipe' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'flash', label: 'Flash' },
  { id: 'spin', label: 'Spin' },
  { id: 'blur', label: 'Blur' },
  { id: 'slide-left', label: 'Slide' },
  { id: 'push', label: 'Push' },
];

export const COMPRESSION_PRESETS: Record<
  Exclude<CompressionPreset, 'custom'>,
  { label: string; crf: number; desc: string }
> = {
  high: { label: 'Studio Master (CRF 18)', crf: 18, desc: 'Virtually lossless quality, larger file size' },
  balanced: { label: 'Balanced Web (CRF 24)', crf: 24, desc: 'Optimal clarity & size for YouTube / web' },
  compact: { label: 'Social Compact (CRF 30)', crf: 30, desc: 'Noticeably smaller upload size' },
  'ultra-small': { label: 'Ultra Compact (CRF 36)', crf: 36, desc: 'Maximum compression for lightweight sharing' },
};

export const SPEED_RAMP_PRESETS: Record<
  SpeedRampPreset,
  { label: string; multipliers: [number, number, number, number] }
> = {
  uniform: { label: 'Uniform Speed', multipliers: [1, 1, 1, 1] },
  'ramp-up': { label: 'Ramp Up (0.5x → 2.0x)', multipliers: [0.5, 0.9, 1.4, 2.0] },
  'ramp-down': { label: 'Ramp Down (2.0x → 0.5x)', multipliers: [2.0, 1.4, 0.9, 0.5] },
  'hero-slowmo': { label: 'Hero Slow-Mo (1.5x → 0.4x → 1.5x)', multipliers: [1.5, 0.4, 0.4, 1.5] },
  'bullet-peak': { label: 'Bullet Peak (1x → 2.8x → 1x)', multipliers: [1.0, 2.8, 2.8, 1.0] },
};

export interface WorkflowPresetDefinition {
  id: WorkflowPresetId;
  label: string;
  tagline: string;
  aspectRatio: AspectRatioMode;
  fitMode: VideoFitMode;
  colorPreset: FilterPresetId;
  effectsPatch: Partial<VisualEffectsSettings>;
  subtitlePreset: Exclude<SubtitlePresetStyleId, 'custom'>;
  exportPatch: Partial<ExportSettings>;
  audioDucking: number;
  voiceEnhance: boolean;
}

export const WORKFLOW_PRESETS: WorkflowPresetDefinition[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    tagline: '24fps wide scope, Cinema Warm LUT, grain & letterbox',
    aspectRatio: '16:9',
    fitMode: 'contain-black',
    colorPreset: 'cinema-warm',
    effectsPatch: { filmGrain: 22, letterbox: true, scanlines: false, neonEdge: 0, glowIntensity: 18 },
    subtitlePreset: 'classic-cinema',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 24, crf: 20, compressionPreset: 'custom' },
    audioDucking: 35,
    voiceEnhance: false,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    tagline: '16:9 Vivid Punch, voice clarity, auto-ducking & 1080p',
    aspectRatio: '16:9',
    fitMode: 'contain-black',
    colorPreset: 'vivid-punch',
    effectsPatch: { filmGrain: 0, letterbox: false, glowIntensity: 8 },
    subtitlePreset: 'minimal-clean',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 30, crf: 22, compressionPreset: 'custom' },
    audioDucking: 65,
    voiceEnhance: true,
  },
  {
    id: 'shorts',
    label: 'Shorts',
    tagline: '9:16 vertical blur backdrop, 60fps & bold pop captions',
    aspectRatio: '9:16',
    fitMode: 'contain-blur',
    colorPreset: 'vivid-punch',
    effectsPatch: { backgroundBlur: 65, letterbox: false, filmGrain: 0 },
    subtitlePreset: 'bold-social',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 60, crf: 24, compressionPreset: 'balanced' },
    audioDucking: 60,
    voiceEnhance: true,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    tagline: '9:16 fill-frame energy, Tokyo Neon LUT & pop captions',
    aspectRatio: '9:16',
    fitMode: 'cover',
    colorPreset: 'tokyo-neon',
    effectsPatch: { glowIntensity: 20, neonEdge: 22, letterbox: false },
    subtitlePreset: 'bold-social',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 60, crf: 24, compressionPreset: 'balanced' },
    audioDucking: 55,
    voiceEnhance: true,
  },
  {
    id: 'reels',
    label: 'Instagram Reels',
    tagline: '9:16 aesthetic Matte Fade, blur frame & clean subs',
    aspectRatio: '9:16',
    fitMode: 'contain-blur',
    colorPreset: 'matte-fade',
    effectsPatch: { backgroundBlur: 55, glowIntensity: 14, letterbox: false },
    subtitlePreset: 'minimal-clean',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 30, crf: 23, compressionPreset: 'custom' },
    audioDucking: 45,
    voiceEnhance: false,
  },
  {
    id: 'gaming',
    label: 'Gaming',
    tagline: '16:9 60fps, Cyber Blue, neon glow & RGB crispness',
    aspectRatio: '16:9',
    fitMode: 'contain-black',
    colorPreset: 'cyber-blue',
    effectsPatch: { neonEdge: 32, chromaticAberration: 16, glowIntensity: 24, letterbox: false },
    subtitlePreset: 'neon-cyber',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 60, crf: 22, compressionPreset: 'custom' },
    audioDucking: 50,
    voiceEnhance: true,
  },
  {
    id: 'podcast',
    label: 'Podcast',
    tagline: '16:9 crisp look, heavy speech enhancement & ducking',
    aspectRatio: '16:9',
    fitMode: 'contain-black',
    colorPreset: 'documentary-crisp',
    effectsPatch: { filmGrain: 0, letterbox: false, neonEdge: 0 },
    subtitlePreset: 'minimal-clean',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 30, crf: 24, compressionPreset: 'balanced' },
    audioDucking: 80,
    voiceEnhance: true,
  },
  {
    id: 'documentary',
    label: 'Documentary',
    tagline: '16:9 24fps, Documentary LUT, subtle grain & lower-thirds',
    aspectRatio: '16:9',
    fitMode: 'contain-black',
    colorPreset: 'documentary-crisp',
    effectsPatch: { filmGrain: 16, letterbox: false, glowIntensity: 6 },
    subtitlePreset: 'documentary',
    exportPatch: { format: 'mp4', resolution: '1080p', fps: 24, crf: 20, compressionPreset: 'custom' },
    audioDucking: 65,
    voiceEnhance: true,
  },
];

/**
 * Computes average multiplier of a clip's speed ramp (integrating piecewise segments).
 */
export function getAverageSpeedMultiplier(clip: VideoClip): number {
  const base = Math.max(0.25, clip.speed || 1);
  const ramp = clip.speedRamp || 'uniform';
  if (ramp === 'uniform') return base;
  const mults = SPEED_RAMP_PRESETS[ramp]?.multipliers || [1, 1, 1, 1];
  // Harmonic mean gives exact timeline duration factor across equal source slices
  const avgInv = mults.reduce((acc, m) => acc + 1 / m, 0) / mults.length;
  return base / avgInv;
}

export function getClipDurationMs(clip: VideoClip): number {
  const raw = Math.max(100, clip.sourceEndMs - clip.sourceStartMs);
  const effectiveSpeed = getAverageSpeedMultiplier(clip);
  return Math.max(100, Math.round(raw / Math.max(0.25, effectiveSpeed)));
}

export function recomputeClipTimelineStarts(clips: VideoClip[]): VideoClip[] {
  let cursor = 0;
  return clips.map((clip) => {
    const updated = { ...clip, timelineStartMs: cursor };
    cursor += getClipDurationMs(updated);
    return updated;
  });
}

export function getTotalTimelineDurationMs(project: VideoProjectState): number {
  let maxEnd = 0;
  for (const clip of project.clips) {
    maxEnd = Math.max(maxEnd, clip.timelineStartMs + getClipDurationMs(clip));
  }
  for (const t of project.textOverlays) {
    maxEnd = Math.max(maxEnd, t.endMs);
  }
  for (const s of project.subtitles) {
    maxEnd = Math.max(maxEnd, s.endMs);
  }
  for (const a of project.audioItems) {
    maxEnd = Math.max(maxEnd, a.startMs + Math.max(100, a.sourceEndMs - a.sourceStartMs));
  }
  return maxEnd;
}

export function getResolutionDimensions(
  aspectRatio: AspectRatioMode,
  resolution: ExportResolution
): { width: number; height: number } {
  const shortSideMap: Record<ExportResolution, number> = {
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '4k': 2160,
  };
  const s = shortSideMap[resolution];
  const makeEven = (n: number) => (n % 2 === 0 ? n : n + 1);

  if (aspectRatio === '16:9') {
    return { width: makeEven(Math.round((s * 16) / 9)), height: makeEven(s) };
  }
  if (aspectRatio === '9:16') {
    return { width: makeEven(s), height: makeEven(Math.round((s * 16) / 9)) };
  }
  const squareSide =
    resolution === '480p' ? 480 : resolution === '720p' ? 720 : resolution === '1080p' ? 1080 : 2160;
  return { width: squareSide, height: squareSide };
}

export function createDefaultVisualEffects(): VisualEffectsSettings {
  return {
    filmGrain: 0,
    scanlines: false,
    letterbox: false,
    chromaticTint: false,
    glitchIntensity: 0,
    rgbSplit: 0,
    chromaticAberration: 0,
    vhsEffect: 0,
    motionBlur: 0,
    glowIntensity: 0,
    neonEdge: 0,
    shakeIntensity: 0,
    backgroundBlur: 0,
    chromaKey: { ...DEFAULT_CHROMA_KEY },
  };
}

export function createInitialProjectState(id?: string): VideoProjectState {
  return {
    id: id || `proj_${Date.now()}`,
    name: 'Untitled Studio Project',
    updatedAt: new Date().toISOString(),
    aspectRatio: '16:9',
    fitMode: 'contain-black',
    clips: [],
    textOverlays: [],
    subtitles: [],
    subtitleStyle: {
      enabled: true,
      presetId: 'minimal-clean',
      fontSize: 34,
      color: '#FFFFFF',
      bgColor: '#020617',
      bgOpacity: 0.72,
      yPercent: 86,
    },
    audioItems: [],
    colorGrading: {
      preset: 'original',
      ...FILTER_PRESETS.original.values,
    },
    visualEffects: createDefaultVisualEffects(),
    exportSettings: {
      format: 'mp4',
      resolution: '1080p',
      fps: 30,
      compressionPreset: 'balanced',
      crf: 24,
      gifFps: 12,
      gifWidth: 480,
    },
    trackStates: {
      V1: { ...DEFAULT_TRACK_STATES.V1 },
      T1: { ...DEFAULT_TRACK_STATES.T1 },
      S1: { ...DEFAULT_TRACK_STATES.S1 },
      A1: { ...DEFAULT_TRACK_STATES.A1 },
      A2: { ...DEFAULT_TRACK_STATES.A2 },
    },
    audioDucking: 0,
    beatMarkersMs: [],
    snappingEnabled: true,
  };
}
