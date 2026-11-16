import {
  ClipKeyframe,
  KeyframeEasing,
  MediaAsset,
  SPEED_RAMP_PRESETS,
  TextOverlay,
  VideoClip,
  VideoProjectState,
  getClipDurationMs,
} from '../../types/videoStudio';
import { DrawClipFnParams, isTrackHidden, renderClipTransition } from './transitionRenderer';

// Reusable offscreen scratch canvases to avoid GC churn during 30/60fps playback
let chromaScratch: HTMLCanvasElement | null = null;
let fxScratch: HTMLCanvasElement | null = null;
let motionTrailCanvas: HTMLCanvasElement | null = null;

function ensureScratchCanvas(
  existing: HTMLCanvasElement | null,
  w: number,
  h: number
): HTMLCanvasElement {
  const c = existing || document.createElement('canvas');
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

export function findActiveClipAtTime(
  clips: VideoClip[],
  timeMs: number
): { active: VideoClip | null; prev: VideoClip | null; index: number } {
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const start = c.timelineStartMs;
    const end = start + getClipDurationMs(c);
    if (timeMs >= start && timeMs <= end) {
      return { active: c, prev: i > 0 ? clips[i - 1] : null, index: i };
    }
  }
  if (clips.length > 0 && timeMs > clips[clips.length - 1].timelineStartMs) {
    const lastIdx = clips.length - 1;
    return { active: clips[lastIdx], prev: lastIdx > 0 ? clips[lastIdx - 1] : null, index: lastIdx };
  }
  return { active: null, prev: null, index: -1 };
}

/**
 * Integrates speed & speedRamp preset to map timelineMs -> source video time (seconds).
 */
export function getClipSourceTimeSec(clip: VideoClip, timelineTimeMs: number): number {
  const localMs = Math.max(0, timelineTimeMs - clip.timelineStartMs);
  const durMs = getClipDurationMs(clip);
  const ratio = Math.max(0, Math.min(1, localMs / Math.max(1, durMs)));
  const sourceSpan = Math.max(1, clip.sourceEndMs - clip.sourceStartMs);

  const ramp = clip.speedRamp || 'uniform';
  if (ramp === 'uniform') {
    const srcMs = clip.sourceStartMs + ratio * sourceSpan;
    return Math.max(0, Math.min(clip.sourceEndMs, srcMs)) / 1000;
  }

  // Compute non-linear progress across 4 equal timeline slices weighted by speed curve
  const mults = SPEED_RAMP_PRESETS[ramp]?.multipliers || [1, 1, 1, 1];
  const totalWeight = mults.reduce((a, b) => a + b, 0);
  const segLen = 1 / mults.length;
  let accumSourceFrac = 0;

  for (let i = 0; i < mults.length; i++) {
    const segStart = i * segLen;
    const segEnd = (i + 1) * segLen;
    if (ratio >= segEnd) {
      accumSourceFrac += mults[i] / totalWeight;
    } else if (ratio > segStart) {
      const sub = (ratio - segStart) / segLen;
      accumSourceFrac += sub * (mults[i] / totalWeight);
      break;
    } else {
      break;
    }
  }

  const srcMs = clip.sourceStartMs + Math.min(1, accumSourceFrac) * sourceSpan;
  return Math.max(0, Math.min(clip.sourceEndMs, srcMs)) / 1000;
}

function applyEasing(t: number, easing: KeyframeEasing): number {
  const c = Math.max(0, Math.min(1, t));
  if (easing === 'ease-out') return 1 - Math.pow(1 - c, 2);
  if (easing === 'ease-in-out') return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
  return c;
}

export interface EvaluatedKeyframes {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export function evaluateClipKeyframes(
  clip: VideoClip,
  localTimeMs: number
): EvaluatedKeyframes {
  const base: EvaluatedKeyframes = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  const kfs = clip.keyframes;
  if (!kfs || kfs.length === 0) return base;

  const sorted = [...kfs].sort((a, b) => a.timeOffsetMs - b.timeOffsetMs);
  if (localTimeMs <= sorted[0].timeOffsetMs) {
    const k = sorted[0];
    return { x: k.x, y: k.y, scale: k.scale, rotation: k.rotation, opacity: k.opacity };
  }
  const last = sorted[sorted.length - 1];
  if (localTimeMs >= last.timeOffsetMs) {
    return { x: last.x, y: last.y, scale: last.scale, rotation: last.rotation, opacity: last.opacity };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (localTimeMs >= a.timeOffsetMs && localTimeMs <= b.timeOffsetMs) {
      const rawT = (localTimeMs - a.timeOffsetMs) / Math.max(1, b.timeOffsetMs - a.timeOffsetMs);
      const t = applyEasing(rawT, a.easing);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        scale: a.scale + (b.scale - a.scale) * t,
        rotation: a.rotation + (b.rotation - a.rotation) * t,
        opacity: a.opacity + (b.opacity - a.opacity) * t,
      };
    }
  }
  return base;
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 255,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  }
  return [0, 255, 0];
}

function drawClipWithTransforms(
  ctx: CanvasRenderingContext2D,
  params: DrawClipFnParams,
  canvasW: number,
  canvasH: number,
  project: VideoProjectState,
  kf: EvaluatedKeyframes,
  shakeX = 0,
  shakeY = 0,
  shakeDeg = 0
) {
  const { clip, video, alpha = 1, offsetX = 0, offsetY = 0, scaleMult = 1, extraRotateDeg = 0, extraFilter = '' } = params;
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;

  const cropL = Math.max(0, Math.min(0.45, clip.crop.left / 100));
  const cropR = Math.max(0, Math.min(0.45, clip.crop.right / 100));
  const cropT = Math.max(0, Math.min(0.45, clip.crop.top / 100));
  const cropB = Math.max(0, Math.min(0.45, clip.crop.bottom / 100));

  const sx = vw * cropL;
  const sy = vh * cropT;
  const sw = Math.max(2, vw * (1 - cropL - cropR));
  const sh = Math.max(2, vh * (1 - cropT - cropB));

  const rotated90 = clip.rotate === 90 || clip.rotate === 270;
  const effectiveW = rotated90 ? sh : sw;
  const effectiveH = rotated90 ? sw : sh;

  const containScale = Math.min(canvasW / effectiveW, canvasH / effectiveH);
  const coverScale = Math.max(canvasW / effectiveW, canvasH / effectiveH);
  const bgBlurStrength = Math.max(
    project.visualEffects.backgroundBlur || 0,
    project.fitMode === 'contain-blur' ? 55 : 0
  );

  // Background blur backdrop layer
  if (bgBlurStrength > 0) {
    const blurPx = Math.max(8, Math.round((bgBlurStrength / 100) * 32));
    ctx.save();
    ctx.globalAlpha = alpha * kf.opacity * 0.78;
    ctx.filter = `${ctx.filter === 'none' ? '' : ctx.filter} blur(${blurPx}px)`.trim();
    ctx.translate(canvasW / 2 + offsetX, canvasH / 2 + offsetY);
    ctx.rotate((clip.rotate * Math.PI) / 180);
    ctx.scale(clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);
    const bgW = sw * coverScale * 1.12;
    const bgH = sh * coverScale * 1.12;
    ctx.drawImage(video, sx, sy, sw, sh, -bgW / 2, -bgH / 2, bgW, bgH);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }

  const drawScale =
    (project.fitMode === 'cover' ? coverScale : containScale) * scaleMult * kf.scale;
  const drawW = sw * drawScale;
  const drawH = sh * drawScale;
  const kfOffsetX = (kf.x / 100) * canvasW;
  const kfOffsetY = (kf.y / 100) * canvasH;

  // Chroma Key / Green Screen pixel pass (CPU ImageData pass)
  const ck = project.visualEffects.chromaKey;
  let drawSource: CanvasImageSource = video;
  let srcDrawX = sx;
  let srcDrawY = sy;
  let srcDrawW = sw;
  let srcDrawH = sh;

  if (ck?.enabled) {
    // Downscale chroma scratch to max 640px wide for smooth real-time playback speed
    const ckScale = Math.min(1, 640 / Math.max(1, sw));
    const ckW = Math.max(4, Math.round(sw * ckScale));
    const ckH = Math.max(4, Math.round(sh * ckScale));
    chromaScratch = ensureScratchCanvas(chromaScratch, ckW, ckH);
    const ckCtx = chromaScratch.getContext('2d', { willReadFrequently: true });
    if (ckCtx) {
      ckCtx.clearRect(0, 0, ckW, ckH);
      ckCtx.drawImage(video, sx, sy, sw, sh, 0, 0, ckW, ckH);
      const img = ckCtx.getImageData(0, 0, ckW, ckH);
      const data = img.data;
      const [kr, kg, kb] = parseHexRgb(ck.keyColor);
      const simThresh = ck.similarity * 2.55;
      const smoothRange = Math.max(4, ck.smoothness * 2.2);
      const spillAmt = (ck.spillReduction || 0) / 100;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.sqrt((r - kr) * (r - kr) + (g - kg) * (g - kg) + (b - kb) * (b - kb));
        if (dist < simThresh) {
          data[i + 3] = 0;
        } else if (dist < simThresh + smoothRange) {
          const factor = (dist - simThresh) / smoothRange;
          data[i + 3] = Math.round(data[i + 3] * factor);
        } else if (spillAmt > 0 && kg > kr && kg > kb && g > (r + b) * 0.55) {
          data[i + 1] = Math.round(g - (g - (r + b) * 0.5) * spillAmt);
        }
      }
      ckCtx.putImageData(img, 0, 0);

      // Paint replacement chroma backdrop behind keyed foreground
      ctx.save();
      ctx.fillStyle = ck.replacementBgColor || '#050b1a';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();

      drawSource = chromaScratch;
      srcDrawX = 0;
      srcDrawY = 0;
      srcDrawW = ckW;
      srcDrawH = ckH;
    }
  }

  ctx.save();
  if (extraFilter) {
    ctx.filter = `${ctx.filter === 'none' ? '' : ctx.filter} ${extraFilter}`.trim();
  }
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * kf.opacity));
  ctx.translate(canvasW / 2 + offsetX + kfOffsetX + shakeX, canvasH / 2 + offsetY + kfOffsetY + shakeY);
  ctx.rotate(((clip.rotate + kf.rotation + extraRotateDeg + shakeDeg) * Math.PI) / 180);
  ctx.scale(clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);
  ctx.drawImage(drawSource, srcDrawX, srcDrawY, srcDrawW, srcDrawH, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(2,6,23,${alpha})`;
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawTextOverlayItem(
  ctx: CanvasRenderingContext2D,
  overlay: TextOverlay,
  timeMs: number,
  canvasW: number,
  canvasH: number,
  imageElements?: Record<string, HTMLImageElement>
) {
  const elapsed = timeMs - overlay.startMs;
  const total = Math.max(100, overlay.endMs - overlay.startMs);
  const animWindow = Math.min(550, total * 0.35);
  const inProgress = Math.min(1, Math.max(0, elapsed / animWindow));
  const outWindow = Math.min(250, total * 0.15);
  const outAlpha = timeMs > overlay.endMs - outWindow ? Math.max(0, (overlay.endMs - timeMs) / outWindow) : 1;

  let alpha = outAlpha;
  let yOffsetPx = 0;
  let scale = 1;
  let wipeFrac = 1;
  let textToRender = overlay.text || '';
  let extraShadowBlur = 8;
  let extraShadowColor = 'rgba(0,0,0,0.65)';

  if (overlay.animation === 'fade') {
    alpha *= inProgress;
  } else if (overlay.animation === 'slide-up') {
    alpha *= inProgress;
    yOffsetPx = (1 - inProgress) * 32;
  } else if (overlay.animation === 'pop') {
    alpha *= inProgress;
    scale = 0.72 + 0.28 * inProgress;
  } else if (overlay.animation === 'bounce') {
    const s = inProgress < 1 ? 0.6 + Math.sin(inProgress * Math.PI * 0.72) * 0.48 : 1;
    scale = s;
    alpha *= Math.min(1, inProgress * 2);
  } else if (overlay.animation === 'typewriter') {
    const typeDuration = Math.min(total * 0.72, Math.max(400, textToRender.length * 42));
    const charCount = Math.max(1, Math.ceil((elapsed / typeDuration) * textToRender.length));
    textToRender = textToRender.slice(0, charCount);
  } else if (overlay.animation === 'reveal-wipe') {
    wipeFrac = inProgress;
  } else if (overlay.animation === 'glow-pulse') {
    const pulse = 0.5 + 0.5 * Math.sin((elapsed / 1000) * Math.PI * 3);
    extraShadowBlur = 12 + pulse * 20;
    extraShadowColor = 'rgba(56, 189, 248, 0.9)';
  }

  const baseScale = canvasH / 720;
  const anchorX = (overlay.xPercent / 100) * canvasW;
  const anchorY = (overlay.yPercent / 100) * canvasH + yOffsetPx;

  // Logo Graphic Overlay Mode
  if (overlay.preset === 'logo') {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(anchorX, anchorY);
    ctx.scale(scale, scale);

    const img = overlay.logoAssetId ? imageElements?.[overlay.logoAssetId] : undefined;
    const logoSize = Math.max(44, Math.round(overlay.fontSize * 1.9 * baseScale));

    if (img && img.complete && img.naturalWidth > 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const drawW = ratio >= 1 ? logoSize : logoSize * ratio;
      const drawH = ratio >= 1 ? logoSize / ratio : logoSize;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // Built-in SubForge Studio Vector Emblem
      ctx.fillStyle = hexToRgba(overlay.bgColor || '#2563EB', overlay.bgOpacity || 0.85);
      drawRoundedBox(ctx, -logoSize / 2, -logoSize / 2, logoSize, logoSize, logoSize * 0.24);
      ctx.fill();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = Math.max(2, logoSize * 0.05);
      ctx.stroke();

      ctx.fillStyle = overlay.color || '#FFFFFF';
      ctx.font = `800 ${Math.round(logoSize * 0.42)}px "Poppins", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(overlay.text.slice(0, 4) || 'SF', 0, 0);
    }
    ctx.restore();
    return;
  }

  const scaledFontSize = Math.max(12, Math.round(overlay.fontSize * baseScale));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(anchorX, anchorY);
  ctx.scale(scale, scale);

  ctx.font = `${overlay.fontWeight} ${scaledFontSize}px "Poppins", system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = overlay.preset === 'lower-third' ? 'left' : 'center';

  const lines = textToRender.split('\n').filter(Boolean);
  const fullLines = (overlay.text || '').split('\n').filter(Boolean);
  const lineHeight = scaledFontSize * 1.25;
  const maxWidth = Math.max(...fullLines.map((l) => ctx.measureText(l).width), 40);
  const padX = Math.round(18 * baseScale);
  const padY = Math.round(10 * baseScale);

  const subText = overlay.subtitleText?.trim();
  const subFontSize = Math.max(10, Math.round(scaledFontSize * 0.56));
  const totalTextHeight = Math.max(1, lines.length) * lineHeight + (subText ? subFontSize * 1.4 : 0);

  const boxW = Math.min(canvasW * 0.9, maxWidth + padX * 2);
  const boxH = totalTextHeight + padY * 2;
  const boxX = overlay.preset === 'lower-third' ? -boxW * 0.45 : -boxW / 2;
  const boxY = -boxH / 2;

  if (wipeFrac < 1) {
    ctx.beginPath();
    ctx.rect(boxX - 4, boxY - 4, (boxW + 8) * wipeFrac, boxH + 8);
    ctx.clip();
  }

  if (overlay.bgOpacity > 0.01) {
    ctx.fillStyle = hexToRgba(overlay.bgColor, overlay.bgOpacity);
    drawRoundedBox(ctx, boxX, boxY, boxW, boxH, Math.round(10 * baseScale));
    ctx.fill();

    if (overlay.preset === 'lower-third') {
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(boxX, boxY + 4, Math.max(4, Math.round(5 * baseScale)), boxH - 8);
    }
  }

  ctx.shadowColor = extraShadowColor;
  ctx.shadowBlur = extraShadowBlur;
  ctx.fillStyle = overlay.color;

  const textStartX = overlay.preset === 'lower-third' ? boxX + padX + 6 : 0;
  let curY = boxY + padY + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, textStartX, curY, canvasW * 0.85);
    curY += lineHeight;
  }

  if (subText) {
    ctx.font = `500 ${subFontSize}px "Poppins", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(203, 213, 225, 0.95)';
    ctx.fillText(subText, textStartX, curY + 2, canvasW * 0.85);
  }

  ctx.restore();
}

export function renderStudioFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  project: VideoProjectState,
  timeMs: number,
  videoElements: Record<string, HTMLVideoElement>,
  showSafeGuides = false,
  imageElements?: Record<string, HTMLImageElement>
) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const { colorGrading: cg, visualEffects: fx } = project;
  const v1Hidden = isTrackHidden(project, 'V1');
  const t1Hidden = isTrackHidden(project, 'T1');
  const s1Hidden = isTrackHidden(project, 'S1');

  const filterParts = [
    `brightness(${cg.brightness}%)`,
    `contrast(${cg.contrast}%)`,
    `saturate(${cg.saturation}%)`,
    `hue-rotate(${cg.hueRotate}deg)`,
  ];
  if (cg.blur > 0) {
    filterParts.push(`blur(${cg.blur}px)`);
  }
  const videoFilter = filterParts.join(' ');

  // Deterministic Camera Shake offset
  let shakeX = 0;
  let shakeY = 0;
  let shakeDeg = 0;
  if ((fx.shakeIntensity || 0) > 0) {
    const sAmt = fx.shakeIntensity / 100;
    const tSec = timeMs / 1000;
    shakeX = Math.sin(tSec * 29) * 14 * sAmt;
    shakeY = Math.cos(tSec * 37) * 11 * sAmt;
    shakeDeg = Math.sin(tSec * 21) * 1.8 * sAmt;
  }

  const { active, prev } = findActiveClipAtTime(project.clips, timeMs);

  if (!v1Hidden && active) {
    const vid = videoElements[active.assetId];
    if (vid && vid.readyState >= 2) {
      const localElapsed = Math.max(0, timeMs - active.timelineStartMs);
      const kf = evaluateClipKeyframes(active, localElapsed);
      const transDur =
        active.transitionIn !== 'none' ? Math.max(150, active.transitionDurationMs || 450) : 0;
      const inTransition = Boolean(prev && transDur > 0 && localElapsed < transDur);
      const tProg = inTransition ? Math.min(1, localElapsed / transDur) : 1;

      ctx.save();
      ctx.filter = videoFilter;

      const drawHelper = (params: DrawClipFnParams) =>
        drawClipWithTransforms(
          ctx,
          params,
          canvasW,
          canvasH,
          project,
          params.clip.id === active.id ? kf : evaluateClipKeyframes(params.clip, getClipDurationMs(params.clip)),
          shakeX,
          shakeY,
          shakeDeg
        );

      if (inTransition && prev) {
        renderClipTransition(
          ctx,
          canvasW,
          canvasH,
          active.transitionIn,
          tProg,
          prev,
          videoElements[prev.assetId],
          active,
          vid,
          drawHelper
        );
      } else {
        drawHelper({ clip: active, video: vid, alpha: 1 });
      }

      ctx.restore();
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    grad.addColorStop(0, '#050a18');
    grad.addColorStop(1, '#0b142c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Motion Blur (Experimental trail blend)
  if ((fx.motionBlur || 0) > 0 && !v1Hidden && active) {
    motionTrailCanvas = ensureScratchCanvas(motionTrailCanvas, canvasW, canvasH);
    const mCtx = motionTrailCanvas.getContext('2d');
    if (mCtx) {
      const trailAlpha = Math.min(0.62, (fx.motionBlur / 100) * 0.58);
      ctx.save();
      ctx.globalAlpha = trailAlpha;
      ctx.drawImage(motionTrailCanvas, 0, 0);
      ctx.restore();
      mCtx.clearRect(0, 0, canvasW, canvasH);
      mCtx.drawImage(ctx.canvas, 0, 0);
    }
  }

  // RGB Split / Chromatic Aberration offscreen channel offset
  const splitLevel = Math.max(fx.rgbSplit || 0, fx.chromaticAberration || 0);
  if (splitLevel > 0) {
    fxScratch = ensureScratchCanvas(fxScratch, canvasW, canvasH);
    const fCtx = fxScratch.getContext('2d');
    if (fCtx) {
      fCtx.clearRect(0, 0, canvasW, canvasH);
      fCtx.drawImage(ctx.canvas, 0, 0);
      const pxOffset = Math.max(2, Math.round((splitLevel / 100) * (canvasW * 0.014)));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.min(0.45, (splitLevel / 100) * 0.42);
      ctx.drawImage(fxScratch, -pxOffset, 0);
      ctx.drawImage(fxScratch, pxOffset, 0);
      ctx.restore();
    }
  }

  // Additive Glow / Bloom pass
  if ((fx.glowIntensity || 0) > 0) {
    fxScratch = ensureScratchCanvas(fxScratch, canvasW, canvasH);
    const gCtx = fxScratch.getContext('2d');
    if (gCtx) {
      gCtx.clearRect(0, 0, canvasW, canvasH);
      gCtx.filter = `blur(${Math.round(6 + (fx.glowIntensity / 100) * 18)}px) brightness(140%)`;
      gCtx.drawImage(ctx.canvas, 0, 0);
      gCtx.filter = 'none';
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.min(0.55, (fx.glowIntensity / 100) * 0.5);
      ctx.drawImage(fxScratch, 0, 0);
      ctx.restore();
    }
  }

  // Glitch Effect (slice displacements & cyan/magenta artifacts)
  if ((fx.glitchIntensity || 0) > 0) {
    fxScratch = ensureScratchCanvas(fxScratch, canvasW, canvasH);
    const glCtx = fxScratch.getContext('2d');
    if (glCtx) {
      glCtx.clearRect(0, 0, canvasW, canvasH);
      glCtx.drawImage(ctx.canvas, 0, 0);
      const intensity = fx.glitchIntensity / 100;
      const seed = Math.floor(timeMs / 65);
      const sliceCount = Math.max(2, Math.round(intensity * 7));
      for (let i = 0; i < sliceCount; i++) {
        const hRand = Math.sin((seed + i * 19) * 12.9898) * 43758.5453;
        const yFrac = hRand - Math.floor(hRand);
        const y = Math.floor(yFrac * (canvasH - 24));
        const h = Math.max(8, Math.round(canvasH * (0.02 + 0.05 * intensity)));
        const shift = Math.sin(seed * 3.1 + i) * 34 * intensity;
        ctx.drawImage(fxScratch, 0, y, canvasW, h, shift, y, canvasW, h);
        if (i % 2 === 0) {
          ctx.save();
          ctx.fillStyle = `rgba(56, 189, 248, ${0.18 * intensity})`;
          ctx.fillRect(0, y, canvasW, Math.max(3, Math.round(h * 0.35)));
          ctx.restore();
        }
      }
    }
  }

  // Neon Edge Halo
  if ((fx.neonEdge || 0) > 0) {
    const nAlpha = (fx.neonEdge / 100) * 0.48;
    ctx.save();
    const neonGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    neonGrad.addColorStop(0, `rgba(59, 130, 246, ${nAlpha})`);
    neonGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    neonGrad.addColorStop(1, `rgba(6, 182, 212, ${nAlpha})`);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = neonGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(0.9, nAlpha * 1.4)})`;
    ctx.lineWidth = Math.max(3, canvasW * 0.005);
    ctx.strokeRect(4, 4, canvasW - 8, canvasH - 8);
    ctx.restore();
  }

  // Temperature wash
  if (Math.abs(cg.temperature) > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    if (cg.temperature > 0) {
      ctx.fillStyle = `rgba(255, 148, 56, ${Math.min(0.45, cg.temperature / 110)})`;
    } else {
      ctx.fillStyle = `rgba(56, 165, 255, ${Math.min(0.45, Math.abs(cg.temperature) / 110)})`;
    }
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }

  if (fx.chromaticTint) {
    ctx.save();
    const cGrad = ctx.createLinearGradient(0, 0, canvasW, 0);
    cGrad.addColorStop(0, 'rgba(59, 130, 246, 0.14)');
    cGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    cGrad.addColorStop(1, 'rgba(6, 182, 212, 0.16)');
    ctx.fillStyle = cGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }

  // VHS Retro Effect (tracking bar + warm analog scanlines)
  if ((fx.vhsEffect || 0) > 0) {
    const vAmt = fx.vhsEffect / 100;
    ctx.save();
    ctx.fillStyle = `rgba(255, 210, 170, ${0.07 * vAmt})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    const barY = ((timeMs * 0.08) % (canvasH + 40)) - 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.14 * vAmt})`;
    ctx.fillRect(0, barY, canvasW, 6);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.28 * vAmt})`;
    const step = Math.max(3, Math.round(canvasH / 160));
    for (let y = 0; y < canvasH; y += step * 2) {
      ctx.fillRect(0, y, canvasW, step);
    }
    ctx.restore();
  }

  // Vignette
  if (cg.vignette > 0) {
    ctx.save();
    const radius = Math.max(canvasW, canvasH) * 0.72;
    const rad = ctx.createRadialGradient(
      canvasW / 2,
      canvasH / 2,
      radius * 0.35,
      canvasW / 2,
      canvasH / 2,
      radius
    );
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, cg.vignette / 105)})`);
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }

  if (fx.scanlines) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    const step = Math.max(3, Math.round(canvasH / 180));
    for (let y = 0; y < canvasH; y += step * 2) {
      ctx.fillRect(0, y, canvasW, step);
    }
    ctx.restore();
  }

  if (fx.filmGrain > 0) {
    ctx.save();
    const alpha = Math.min(0.24, (fx.filmGrain / 100) * 0.22);
    const seed = Math.floor(timeMs / 40);
    const count = Math.min(450, Math.round((fx.filmGrain / 100) * 420));
    for (let i = 0; i < count; i++) {
      const h1 = Math.sin((seed + i * 17) * 12.9898) * 43758.5453;
      const h2 = Math.sin((seed + i * 31) * 78.233) * 43758.5453;
      const gx = (h1 - Math.floor(h1)) * canvasW;
      const gy = (h2 - Math.floor(h2)) * canvasH;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.fillRect(gx, gy, 2, 2);
    }
    ctx.restore();
  }

  if (fx.letterbox) {
    ctx.save();
    const barH = Math.round(canvasH * 0.1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasW, barH);
    ctx.fillRect(0, canvasH - barH, canvasW, barH);
    ctx.restore();
  }

  // Active Text & Logo Overlays (respecting T1 hidden track state)
  if (!t1Hidden) {
    for (const overlay of project.textOverlays) {
      if (timeMs >= overlay.startMs && timeMs <= overlay.endMs) {
        drawTextOverlayItem(ctx, overlay, timeMs, canvasW, canvasH, imageElements);
      }
    }
  }

  // Active Burned-in Subtitles (respecting S1 hidden track state)
  if (!s1Hidden && project.subtitleStyle.enabled) {
    const activeCue = project.subtitles.find((c) => timeMs >= c.startMs && timeMs <= c.endMs);
    if (activeCue && activeCue.text.trim()) {
      const subOverlay: TextOverlay = {
        id: 'sub_burn',
        text: activeCue.text.replace(/<\/?[^>]+(>|$)/g, ''),
        preset: 'caption',
        startMs: activeCue.startMs,
        endMs: activeCue.endMs,
        xPercent: 50,
        yPercent: project.subtitleStyle.yPercent,
        fontSize: project.subtitleStyle.fontSize,
        color: project.subtitleStyle.color,
        bgColor: project.subtitleStyle.bgColor,
        bgOpacity: project.subtitleStyle.bgOpacity,
        fontWeight: '700',
        animation: 'none',
      };
      drawTextOverlayItem(ctx, subOverlay, timeMs, canvasW, canvasH, imageElements);
    }
  }

  // Interactive Safe-Frame Guides (preview only)
  if (showSafeGuides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    const mx = canvasW * 0.08;
    const my = canvasH * 0.08;
    ctx.strokeRect(mx, my, canvasW - mx * 2, canvasH - my * 2);
    ctx.restore();
  }
}

export async function generateSampleCreatorClip(): Promise<MediaAsset> {
  const width = 1280;
  const height = 720;
  const durationSec = 6;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);

  let audioCtx: AudioContext | null = null;
  try {
    audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const dest = audioCtx.createMediaStreamDestination();
    osc.type = 'sine';
    osc.frequency.value = 220;
    osc2.type = 'triangle';
    osc2.frequency.value = 329.63;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);
    osc.start();
    osc2.start();
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    setTimeout(() => {
      try {
        osc.stop();
        osc2.stop();
      } catch {
        // ignore
      }
    }, durationSec * 1000 + 200);
  } catch {
    // Video-only fallback
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const blobPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      if (audioCtx) audioCtx.close().catch(() => {});
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  recorder.start(150);

  const startTime = performance.now();
  await new Promise<void>((resolve) => {
    const drawTick = () => {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const t = Math.min(1, elapsedSec / durationSec);

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#040816');
      grad.addColorStop(0.5, '#0b1d45');
      grad.addColorStop(1, '#07122a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 4; i++) {
        const cx = width * (0.25 + 0.5 * ((t + i * 0.25) % 1));
        const cy = height * (0.5 + 0.18 * Math.sin(elapsedSec * 2 + i));
        const r = 130 + i * 45;
        const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
        glow.addColorStop(0, i % 2 === 0 ? 'rgba(59, 130, 246, 0.45)' : 'rgba(6, 182, 212, 0.4)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.16)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 54px "Poppins", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SUBFORGE SAMPLE CLIP', width / 2, height * 0.44);

      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 26px "JetBrains Mono", monospace';
      ctx.fillText(
        `00:0${Math.floor(elapsedSec)}.${String(Math.floor((elapsedSec % 1) * 100)).padStart(2, '0')} · 1280×720`,
        width / 2,
        height * 0.56
      );

      if (elapsedSec >= durationSec) {
        recorder.stop();
        resolve();
        return;
      }
      requestAnimationFrame(drawTick);
    };
    requestAnimationFrame(drawTick);
  });

  const blob = await blobPromise;
  const objectUrl = URL.createObjectURL(blob);
  return {
    id: `sample_${Date.now().toString(36)}`,
    name: 'SubForge Sample Clip.webm',
    kind: 'video',
    mimeType: 'video/webm',
    sizeBytes: blob.size,
    durationMs: durationSec * 1000,
    width,
    height,
    objectUrl,
    blob,
    isBuiltin: true,
  };
}
