import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  MediaAsset,
  VideoClip,
  VideoProjectState,
  getResolutionDimensions,
  getTotalTimelineDurationMs,
} from '../../types/videoStudio';
import {
  findActiveClipAtTime,
  getClipSourceTimeSec,
  renderStudioFrameToCanvas,
} from './canvasCompositor';
import { extractClipAudioToWav, renderTimelineAudioToWav } from './audioEngine';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

export interface ExportProgressUpdate {
  stage: 'loading-ffmpeg' | 'rendering-audio' | 'rendering-frames' | 'encoding' | 'done';
  percent: number;
  message: string;
}

export interface ExportResult {
  blob: Blob;
  objectUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  engineUsed: 'ffmpeg-wasm' | 'mediarecorder-fallback';
}

export async function getFFmpeg(onStatus?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }
  if (ffmpegLoadingPromise) {
    return ffmpegLoadingPromise;
  }

  ffmpegLoadingPromise = (async () => {
    onStatus?.('Loading FFmpeg WASM core...');
    const instance = new FFmpeg();
    const baseUrl = `${window.location.origin}/ffmpeg`;
    const coreURL = await toBlobURL(`${baseUrl}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, 'application/wasm');

    await instance.load({
      coreURL,
      wasmURL,
    });
    ffmpegInstance = instance;
    return instance;
  })();

  try {
    return await ffmpegLoadingPromise;
  } catch (err) {
    ffmpegLoadingPromise = null;
    throw err;
  }
}

function seekVideoElement(video: HTMLVideoElement, targetTimeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const safeSec = Math.max(0, Math.min(isFinite(video.duration) ? Math.max(0, video.duration - 0.02) : targetTimeSec, targetTimeSec));
    if (Math.abs(video.currentTime - safeSec) < 0.008 && video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', finish);
      resolve();
    };
    const fallbackTimer = setTimeout(finish, 350);
    video.addEventListener(
      'seeked',
      () => {
        clearTimeout(fallbackTimer);
        finish();
      },
      { once: true }
    );
    video.currentTime = safeSec;
  });
}

async function createHiddenVideoElements(
  clips: VideoClip[],
  assets: Record<string, MediaAsset>
): Promise<Record<string, HTMLVideoElement>> {
  const elements: Record<string, HTMLVideoElement> = {};
  const uniqueAssetIds = Array.from(new Set(clips.map((c) => c.assetId)));

  await Promise.all(
    uniqueAssetIds.map(
      (assetId) =>
        new Promise<void>((resolve) => {
          const asset = assets[assetId];
          if (!asset) {
            resolve();
            return;
          }
          const video = document.createElement('video');
          video.src = asset.objectUrl;
          video.muted = true;
          video.playsInline = true;
          video.preload = 'auto';
          const done = () => {
            elements[assetId] = video;
            resolve();
          };
          if (video.readyState >= 2) {
            done();
            return;
          }
          video.addEventListener('loadeddata', done, { once: true });
          video.addEventListener('error', done, { once: true });
          video.load();
        })
    )
  );
  return elements;
}

async function createHiddenImageElements(
  assets: Record<string, MediaAsset>
): Promise<Record<string, HTMLImageElement>> {
  const imgs: Record<string, HTMLImageElement> = {};
  const imageAssets = Object.values(assets).filter((a) => a.kind === 'image');
  await Promise.all(
    imageAssets.map(
      (asset) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = asset.objectUrl;
          const done = () => {
            imgs[asset.id] = img;
            resolve();
          };
          if (img.complete) {
            done();
            return;
          }
          img.onload = done;
          img.onerror = done;
        })
    )
  );
  return imgs;
}

function sanitizeFileBaseName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'subforge-video';
}

/**
 * Estimates output file size in MB cleanly for user feedback before rendering.
 */
export function estimateExportSizeMb(project: VideoProjectState): string {
  const durSec = Math.max(1, getTotalTimelineDurationMs(project) / 1000);
  const { format, resolution, crf, gifFps, gifWidth } = project.exportSettings;
  if (format === 'gif') {
    const mb = (durSec * gifFps * (gifWidth / 480) * 0.045);
    return `${Math.max(0.2, mb).toFixed(1)} MB`;
  }
  const resFactor =
    resolution === '4k' ? 6.5 : resolution === '1080p' ? 2.2 : resolution === '720p' ? 1.15 : 0.65;
  const crfFactor = Math.max(0.28, Math.pow(0.92, crf - 20));
  const mb = durSec * 0.45 * resFactor * crfFactor;
  return `${Math.max(0.2, mb).toFixed(1)} MB`;
}

/**
 * Exports full composited timeline (cuts, splits, speed/ramps, crop, rotate, transitions,
 * keyframes, color grading, effects, chroma key, text/logo overlays, burned-in subtitles, music/SFX DSP & ducking)
 * into MP4, WebM, or GIF using FFmpeg.wasm.
 */
export async function exportProjectVideo(
  project: VideoProjectState,
  assets: Record<string, MediaAsset>,
  onProgress: (update: ExportProgressUpdate) => void,
  signal?: AbortSignal
): Promise<ExportResult> {
  const totalDurationMs = getTotalTimelineDurationMs(project);
  if (totalDurationMs <= 0 || project.clips.length === 0) {
    throw new Error('Add at least one video clip to the timeline before exporting.');
  }

  const { format, resolution, fps, crf, gifFps, gifWidth } = project.exportSettings;
  const dims =
    format === 'gif'
      ? (() => {
          const target = getResolutionDimensions(project.aspectRatio, '720p');
          const ratio = target.height / target.width;
          const w = gifWidth % 2 === 0 ? gifWidth : gifWidth + 1;
          const h = Math.round(w * ratio);
          return { width: w, height: h % 2 === 0 ? h : h + 1 };
        })()
      : getResolutionDimensions(project.aspectRatio, resolution);

  const exportFps = format === 'gif' ? gifFps : fps;
  const frameIntervalMs = 1000 / exportFps;
  const totalFrames = Math.max(1, Math.ceil((totalDurationMs / 1000) * exportFps));
  const baseName = sanitizeFileBaseName(project.name);

  onProgress({
    stage: 'loading-ffmpeg',
    percent: 4,
    message: 'Initializing FFmpeg WASM compiler...',
  });

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await getFFmpeg((msg) =>
      onProgress({ stage: 'loading-ffmpeg', percent: 8, message: msg })
    );
  } catch (err) {
    if (format !== 'gif') {
      return await exportViaMediaRecorderFallback(project, assets, dims, exportFps, totalDurationMs, baseName, onProgress, signal);
    }
    throw err;
  }

  if (signal?.aborted) throw new Error('Export cancelled.');

  // Step 1: Mix Audio Tracks via Web Audio OfflineAudioContext (DSP + Ducking + Track Mutes)
  let wavBlob: Blob | null = null;
  if (format !== 'gif') {
    onProgress({
      stage: 'rendering-audio',
      percent: 12,
      message: 'Mixing video audio, EQ/noise reduction, ducking & SFX...',
    });
    wavBlob = await renderTimelineAudioToWav(
      project.clips,
      project.audioItems,
      assets,
      totalDurationMs,
      {
        trackStates: project.trackStates,
        audioDucking: project.audioDucking,
      }
    );
  }

  if (signal?.aborted) throw new Error('Export cancelled.');

  // Step 2: Render Canvas frames & write JPEG frames incrementally to MEMFS
  const offscreen = document.createElement('canvas');
  offscreen.width = dims.width;
  offscreen.height = dims.height;
  const ctx = offscreen.getContext('2d')!;
  const videoElements = await createHiddenVideoElements(project.clips, assets);
  const imageElements = await createHiddenImageElements(assets);

  const writtenFiles: string[] = [];
  const outputFilename = `${baseName}.${format}`;
  const paletteFilename = `palette_${Date.now()}.png`;
  const audioFilename = `mixed_audio_${Date.now()}.wav`;

  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    const pct = Math.min(99, Math.max(66, Math.round(66 + Math.max(0, Math.min(1, progress)) * 33)));
    onProgress({
      stage: 'encoding',
      percent: pct,
      message: `Encoding ${format.toUpperCase()} stream (${pct}%)...`,
    });
  };

  ffmpeg.on('progress', onFfmpegProgress);

  try {
    for (let f = 0; f < totalFrames; f++) {
      if (signal?.aborted) throw new Error('Export cancelled.');
      const tMs = Math.min(totalDurationMs, f * frameIntervalMs);
      const { active, prev } = findActiveClipAtTime(project.clips, tMs);

      if (active && videoElements[active.assetId]) {
        await seekVideoElement(
          videoElements[active.assetId],
          getClipSourceTimeSec(active, tMs)
        );
      }
      if (prev && videoElements[prev.assetId] && tMs - (active?.timelineStartMs || 0) < (active?.transitionDurationMs || 800)) {
        await seekVideoElement(
          videoElements[prev.assetId],
          getClipSourceTimeSec(prev, tMs)
        );
      }

      renderStudioFrameToCanvas(
        ctx,
        dims.width,
        dims.height,
        project,
        tMs,
        videoElements,
        false,
        imageElements
      );

      const frameBlob = await new Promise<Blob>((resolve) =>
        offscreen.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.9)
      );
      const frameName = `frame_${String(f).padStart(6, '0')}.jpg`;
      await ffmpeg.writeFile(frameName, new Uint8Array(await frameBlob.arrayBuffer()));
      writtenFiles.push(frameName);

      if (f % 3 === 0 || f === totalFrames - 1) {
        const pct = 15 + Math.round(((f + 1) / totalFrames) * 50);
        onProgress({
          stage: 'rendering-frames',
          percent: pct,
          message: `Compositing frame ${f + 1} / ${totalFrames} (${dims.width}×${dims.height})...`,
        });
      }
    }

    if (wavBlob) {
      await ffmpeg.writeFile(audioFilename, new Uint8Array(await wavBlob.arrayBuffer()));
      writtenFiles.push(audioFilename);
    }

    if (signal?.aborted) throw new Error('Export cancelled.');

    onProgress({
      stage: 'encoding',
      percent: 68,
      message: `Encoding final ${format.toUpperCase()} (${resolution}, ${exportFps} fps)...`,
    });

    if (format === 'mp4') {
      const args = [
        '-framerate',
        String(exportFps),
        '-i',
        'frame_%06d.jpg',
        ...(wavBlob ? ['-i', audioFilename] : []),
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        String(crf),
        '-pix_fmt',
        'yuv420p',
        ...(wavBlob ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
        '-movflags',
        '+faststart',
        outputFilename,
      ];
      const code = await ffmpeg.exec(args, undefined, { signal });
      if (code !== 0) throw new Error(`FFmpeg MP4 encoding exited with code ${code}`);
    } else if (format === 'webm') {
      const targetBitrate = resolution === '4k' ? '6000k' : resolution === '1080p' ? '2800k' : '1400k';
      const args = [
        '-framerate',
        String(exportFps),
        '-i',
        'frame_%06d.jpg',
        ...(wavBlob ? ['-i', audioFilename] : []),
        '-c:v',
        'libvpx',
        '-b:v',
        targetBitrate,
        '-crf',
        String(Math.min(40, Math.max(10, crf))),
        '-deadline',
        'realtime',
        '-cpu-used',
        '4',
        ...(wavBlob ? ['-c:a', 'libvorbis', '-q:a', '4', '-shortest'] : []),
        outputFilename,
      ];
      const code = await ffmpeg.exec(args, undefined, { signal });
      if (code !== 0) throw new Error(`FFmpeg WebM encoding exited with code ${code}`);
    } else {
      // High quality 2-pass palette GIF conversion
      await ffmpeg.exec(
        ['-framerate', String(exportFps), '-i', 'frame_%06d.jpg', '-vf', 'palettegen=stats_mode=diff', paletteFilename],
        undefined,
        { signal }
      );
      writtenFiles.push(paletteFilename);

      const code = await ffmpeg.exec(
        [
          '-framerate',
          String(exportFps),
          '-i',
          'frame_%06d.jpg',
          '-i',
          paletteFilename,
          '-lavfi',
          'paletteuse=dither=bayer:bayer_scale=3',
          outputFilename,
        ],
        undefined,
        { signal }
      );
      if (code !== 0) throw new Error(`FFmpeg GIF encoding exited with code ${code}`);
    }

    writtenFiles.push(outputFilename);
    const data = await ffmpeg.readFile(outputFilename);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const mimeType =
      format === 'mp4' ? 'video/mp4' : format === 'webm' ? 'video/webm' : 'image/gif';
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);

    onProgress({
      stage: 'done',
      percent: 100,
      message: `Rendered ${outputFilename} (${(blob.size / (1024 * 1024)).toFixed(2)} MB)`,
    });

    return {
      blob,
      objectUrl,
      fileName: outputFilename,
      mimeType,
      sizeBytes: blob.size,
      engineUsed: 'ffmpeg-wasm',
    };
  } finally {
    ffmpeg.off('progress', onFfmpegProgress);
    for (const v of Object.values(videoElements)) {
      v.src = '';
    }
    for (const file of writtenFiles) {
      await ffmpeg.deleteFile(file).catch(() => {});
    }
  }
}

/**
 * Fallback real-time Canvas + MediaRecorder exporter if FFmpeg WASM fails on constrained devices.
 */
async function exportViaMediaRecorderFallback(
  project: VideoProjectState,
  assets: Record<string, MediaAsset>,
  dims: { width: number; height: number },
  fps: number,
  totalDurationMs: number,
  baseName: string,
  onProgress: (update: ExportProgressUpdate) => void,
  signal?: AbortSignal
): Promise<ExportResult> {
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d')!;
  const videoElements = await createHiddenVideoElements(project.clips, assets);
  const stream = canvas.captureStream(fps);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
    ? 'video/webm;codecs=vp8'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 3_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });

  recorder.start(200);
  const startWall = performance.now();

  await new Promise<void>((resolve, reject) => {
    const tick = async () => {
      if (signal?.aborted) {
        recorder.stop();
        reject(new Error('Export cancelled.'));
        return;
      }
      const elapsed = performance.now() - startWall;
      const tMs = Math.min(totalDurationMs, elapsed);
      const { active } = findActiveClipAtTime(project.clips, tMs);
      if (active && videoElements[active.assetId]) {
        await seekVideoElement(videoElements[active.assetId], getClipSourceTimeSec(active, tMs));
      }
      renderStudioFrameToCanvas(ctx, dims.width, dims.height, project, tMs, videoElements, false);
      onProgress({
        stage: 'encoding',
        percent: Math.min(99, Math.round((tMs / totalDurationMs) * 100)),
        message: `Fallback WebM stream render (${Math.round((tMs / totalDurationMs) * 100)}%)...`,
      });

      if (elapsed >= totalDurationMs) {
        recorder.stop();
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const blob = await stopped;
  for (const v of Object.values(videoElements)) v.src = '';
  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    fileName: `${baseName}.webm`,
    mimeType: 'video/webm',
    sizeBytes: blob.size,
    engineUsed: 'mediarecorder-fallback',
  };
}

/**
 * Direct FFmpeg.wasm Quick Video Compressor (shrinks an uploaded clip using CRF & scale).
 */
export async function compressAssetDirect(
  asset: MediaAsset,
  crf: number,
  targetHeight: number | null,
  onProgress: (percent: number, msg: string) => void
): Promise<ExportResult> {
  onProgress(8, 'Loading FFmpeg WASM compressor...');
  const ffmpeg = await getFFmpeg();
  const ext = asset.name.split('.').pop()?.toLowerCase() || 'mp4';
  const inputFile = `in_comp_${Date.now()}.${ext}`;
  const outFile = `compressed_${Date.now()}.mp4`;

  const handler = ({ progress }: { progress: number }) => {
    const pct = Math.min(99, Math.max(15, Math.round(15 + Math.max(0, Math.min(1, progress)) * 84)));
    onProgress(pct, `Compressing video stream (${pct}%)...`);
  };
  ffmpeg.on('progress', handler);

  try {
    await ffmpeg.writeFile(inputFile, await fetchFile(asset.blob));
    const scaleArgs = targetHeight ? ['-vf', `scale=-2:${targetHeight}`] : [];
    const code = await ffmpeg.exec([
      '-i',
      inputFile,
      ...scaleArgs,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      String(crf),
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outFile,
    ]);
    if (code !== 0) throw new Error(`Compression failed (exit code ${code})`);

    const data = await ffmpeg.readFile(outFile);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'video/mp4' });
    const base = sanitizeFileBaseName(asset.name.replace(/\.[^.]+$/, ''));

    return {
      blob,
      objectUrl: URL.createObjectURL(blob),
      fileName: `${base}-compressed-crf${crf}.mp4`,
      mimeType: 'video/mp4',
      sizeBytes: blob.size,
      engineUsed: 'ffmpeg-wasm',
    };
  } finally {
    ffmpeg.off('progress', handler);
    await ffmpeg.deleteFile(inputFile).catch(() => {});
    await ffmpeg.deleteFile(outFile).catch(() => {});
  }
}

/**
 * Extracts clip audio to WAV (Web Audio) or MP3 (FFmpeg.wasm).
 */
export async function extractClipAudioFile(
  clip: VideoClip,
  asset: MediaAsset,
  format: 'wav' | 'mp3'
): Promise<{ blob: Blob; fileName: string; objectUrl: string }> {
  const wavBlob = await extractClipAudioToWav(clip, asset);
  const base = sanitizeFileBaseName(clip.name.replace(/\.[^.]+$/, ''));

  if (format === 'wav') {
    return {
      blob: wavBlob,
      fileName: `${base}-audio.wav`,
      objectUrl: URL.createObjectURL(wavBlob),
    };
  }

  const ffmpeg = await getFFmpeg();
  const inWav = `extract_${Date.now()}.wav`;
  const outMp3 = `extract_${Date.now()}.mp3`;
  try {
    await ffmpeg.writeFile(inWav, new Uint8Array(await wavBlob.arrayBuffer()));
    const code = await ffmpeg.exec(['-i', inWav, '-b:a', '192k', outMp3]);
    if (code !== 0) throw new Error(`MP3 conversion failed (${code})`);
    const data = await ffmpeg.readFile(outMp3);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const mp3Blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/mpeg' });
    return {
      blob: mp3Blob,
      fileName: `${base}-audio.mp3`,
      objectUrl: URL.createObjectURL(mp3Blob),
    };
  } finally {
    await ffmpeg.deleteFile(inWav).catch(() => {});
    await ffmpeg.deleteFile(outMp3).catch(() => {});
  }
}
