import { TransitionType, VideoClip, VideoProjectState } from '../../types/videoStudio';

export interface DrawClipFnParams {
  clip: VideoClip;
  video: HTMLVideoElement;
  alpha?: number;
  offsetX?: number;
  offsetY?: number;
  scaleMult?: number;
  extraRotateDeg?: number;
  extraFilter?: string;
}

export function renderClipTransition(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  transition: TransitionType,
  progress: number, // 0..1
  prevClip: VideoClip,
  prevVideo: HTMLVideoElement | undefined,
  activeClip: VideoClip,
  activeVideo: HTMLVideoElement,
  drawClip: (params: DrawClipFnParams) => void
) {
  const t = Math.max(0, Math.min(1, progress));
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  switch (transition) {
    case 'crossfade': {
      if (prevVideo && prevVideo.readyState >= 2) {
        drawClip({ clip: prevClip, video: prevVideo, alpha: 1 - ease });
      }
      drawClip({ clip: activeClip, video: activeVideo, alpha: ease });
      break;
    }

    case 'fade-black': {
      if (t < 0.5) {
        if (prevVideo && prevVideo.readyState >= 2) {
          drawClip({ clip: prevClip, video: prevVideo, alpha: 1 - t * 2 });
        }
      } else {
        drawClip({ clip: activeClip, video: activeVideo, alpha: (t - 0.5) * 2 });
      }
      break;
    }

    case 'flash': {
      if (t < 0.5) {
        if (prevVideo && prevVideo.readyState >= 2) {
          drawClip({ clip: prevClip, video: prevVideo, alpha: 1 });
        }
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${t * 2})`;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.restore();
      } else {
        drawClip({ clip: activeClip, video: activeVideo, alpha: 1 });
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - (t - 0.5) * 2})`;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.restore();
      }
      break;
    }

    case 'slide-left':
    case 'push': {
      if (prevVideo && prevVideo.readyState >= 2) {
        drawClip({ clip: prevClip, video: prevVideo, offsetX: -canvasW * ease });
      }
      drawClip({ clip: activeClip, video: activeVideo, offsetX: canvasW * (1 - ease) });
      break;
    }

    case 'swipe': {
      // Diagonal up-left energetic swipe
      if (prevVideo && prevVideo.readyState >= 2) {
        drawClip({ clip: prevClip, video: prevVideo, offsetY: -canvasH * ease, alpha: 1 - ease * 0.4 });
      }
      drawClip({ clip: activeClip, video: activeVideo, offsetY: canvasH * (1 - ease) });
      break;
    }

    case 'wipe': {
      if (prevVideo && prevVideo.readyState >= 2) {
        drawClip({ clip: prevClip, video: prevVideo, alpha: 1 });
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvasW * ease, canvasH);
      ctx.clip();
      drawClip({ clip: activeClip, video: activeVideo, alpha: 1 });
      ctx.restore();

      // Subtle glowing wipe edge bar
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.fillRect(canvasW * ease - 2, 0, 4, canvasH);
      ctx.restore();
      break;
    }

    case 'zoom-reveal': {
      if (prevVideo && prevVideo.readyState >= 2 && t < 0.45) {
        drawClip({
          clip: prevClip,
          video: prevVideo,
          alpha: 1 - t / 0.45,
          scaleMult: 1 + t * 0.45,
        });
      }
      drawClip({
        clip: activeClip,
        video: activeVideo,
        alpha: ease,
        scaleMult: 1.28 - 0.28 * ease,
      });
      break;
    }

    case 'spin': {
      if (t < 0.5 && prevVideo && prevVideo.readyState >= 2) {
        drawClip({
          clip: prevClip,
          video: prevVideo,
          alpha: 1 - t * 2,
          scaleMult: 1 + t * 0.5,
          extraRotateDeg: t * 180,
        });
      } else {
        const sub = (t - 0.5) * 2;
        drawClip({
          clip: activeClip,
          video: activeVideo,
          alpha: Math.min(1, sub * 1.4),
          scaleMult: 0.7 + 0.3 * sub,
          extraRotateDeg: -180 * (1 - sub),
        });
      }
      break;
    }

    case 'blur': {
      const blurPx = Math.round(Math.sin(t * Math.PI) * 18);
      if (t < 0.5 && prevVideo && prevVideo.readyState >= 2) {
        drawClip({
          clip: prevClip,
          video: prevVideo,
          alpha: 1 - t * 1.6,
          extraFilter: `blur(${blurPx}px)`,
        });
      } else {
        drawClip({
          clip: activeClip,
          video: activeVideo,
          alpha: Math.min(1, (t - 0.3) * 1.5),
          extraFilter: `blur(${blurPx}px)`,
        });
      }
      break;
    }

    case 'glitch': {
      const baseVid = t < 0.5 && prevVideo && prevVideo.readyState >= 2 ? prevVideo : activeVideo;
      const baseClip = t < 0.5 && prevVideo ? prevClip : activeClip;
      const jitter = Math.sin(t * 45) * 24 * Math.sin(t * Math.PI);
      drawClip({ clip: baseClip, video: baseVid, offsetX: jitter, alpha: 0.95 });

      // Digital glitch bars
      ctx.save();
      const bands = 5;
      for (let i = 0; i < bands; i++) {
        const y = ((i * 137 + Math.round(t * 1000)) % 90) * (canvasH / 100);
        const h = Math.max(8, canvasH * 0.06);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(59, 130, 246, 0.38)' : 'rgba(236, 72, 153, 0.35)';
        ctx.fillRect(0, y, canvasW, h);
      }
      ctx.restore();
      break;
    }

    default: {
      drawClip({ clip: activeClip, video: activeVideo, alpha: 1 });
      break;
    }
  }
}

export function isTrackHidden(project: VideoProjectState, track: 'V1' | 'T1' | 'S1'): boolean {
  return Boolean(project.trackStates?.[track]?.hidden);
}
