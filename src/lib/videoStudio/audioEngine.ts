import {
  AudioDspSettings,
  AudioTrackItem,
  DEFAULT_AUDIO_DSP,
  MediaAsset,
  VideoClip,
  VideoProjectState,
  getClipDurationMs,
} from '../../types/videoStudio';

const SAMPLE_RATE = 44100;

/**
 * Encodes an AudioBuffer into a standard stereo 16-bit PCM WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels || 1);
  const length = buffer.length * numChannels * 2;
  const wavBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1)));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export function extractPeaksFromAudioBuffer(buffer: AudioBuffer, bars = 48): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    const start = i * step;
    let maxVal = 0;
    for (let j = 0; j < step && start + j < data.length; j += Math.max(1, Math.floor(step / 32))) {
      const v = Math.abs(data[start + j]);
      if (v > maxVal) maxVal = v;
    }
    peaks.push(Math.min(1, Math.max(0.08, maxVal)));
  }
  return peaks;
}

export async function decodeBlobToAudioBuffer(
  blob: Blob,
  ctx?: BaseAudioContext
): Promise<AudioBuffer | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx: BaseAudioContext = ctx || new AudioContext({ sampleRate: SAMPLE_RATE });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    if (!ctx && audioCtx instanceof AudioContext) {
      await audioCtx.close().catch(() => {});
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function computeWaveformPeaks(blob: Blob): Promise<number[]> {
  const decoded = await decodeBlobToAudioBuffer(blob);
  if (!decoded) {
    return Array.from({ length: 36 }, (_, idx) => 0.2 + 0.5 * Math.abs(Math.sin(idx * 0.55)));
  }
  return extractPeaksFromAudioBuffer(decoded, 44);
}

/**
 * Energy-flux beat detector analyzing decoded AudioBuffer and returning beat marker timestamps in ms.
 */
export async function detectAudioBeats(blob: Blob): Promise<number[]> {
  const decoded = await decodeBlobToAudioBuffer(blob);
  if (!decoded) return [];

  const data = decoded.getChannelData(0);
  const sr = decoded.sampleRate;
  const windowSize = Math.floor(sr * 0.05); // 50ms windows
  const energies: number[] = [];

  for (let i = 0; i < data.length; i += windowSize) {
    let sumSq = 0;
    const end = Math.min(data.length, i + windowSize);
    for (let j = i; j < end; j++) {
      sumSq += data[j] * data[j];
    }
    energies.push(Math.sqrt(sumSq / Math.max(1, end - i)));
  }

  const avgEnergy = energies.reduce((a, b) => a + b, 0) / Math.max(1, energies.length);
  const threshold = Math.max(0.03, avgEnergy * 1.32);
  const beatsMs: number[] = [];
  let lastBeatMs = -350;

  for (let i = 1; i < energies.length - 1; i++) {
    const e = energies[i];
    if (e > threshold && e >= energies[i - 1] && e >= energies[i + 1]) {
      const ms = Math.round(i * 50);
      if (ms - lastBeatMs >= 320) {
        beatsMs.push(ms);
        lastBeatMs = ms;
      }
    }
  }

  return beatsMs.slice(0, 120);
}

export interface BuiltinAudioDescriptor {
  id: string;
  name: string;
  track: 'music' | 'sfx';
  durationSec: number;
  categoryLabel: string;
}

export const BUILTIN_AUDIO_LIBRARY: BuiltinAudioDescriptor[] = [
  { id: 'builtin_music_ambient', name: 'Ambient Horizon Pad', track: 'music', durationSec: 12, categoryLabel: 'Music Bed' },
  { id: 'builtin_music_lofi', name: 'Creator Lo-Fi Pulse', track: 'music', durationSec: 10, categoryLabel: 'Music Bed' },
  { id: 'builtin_music_upbeat', name: 'Neon Drive Synth', track: 'music', durationSec: 10, categoryLabel: 'Music Bed' },
  { id: 'builtin_sfx_whoosh', name: 'Cinematic Whoosh', track: 'sfx', durationSec: 0.9, categoryLabel: 'Transition SFX' },
  { id: 'builtin_sfx_pop', name: 'UI Clean Pop', track: 'sfx', durationSec: 0.25, categoryLabel: 'Action SFX' },
  { id: 'builtin_sfx_chime', name: 'Bright Spark Chime', track: 'sfx', durationSec: 1.1, categoryLabel: 'Success SFX' },
  { id: 'builtin_sfx_boom', name: 'Sub Bass Impact', track: 'sfx', durationSec: 1.4, categoryLabel: 'Impact SFX' },
  { id: 'builtin_sfx_shutter', name: 'Camera Shutter Click', track: 'sfx', durationSec: 0.3, categoryLabel: 'Shutter SFX' },
];

export async function generateBuiltinAudioAsset(desc: BuiltinAudioDescriptor): Promise<MediaAsset> {
  const offline = new OfflineAudioContext(2, Math.round(SAMPLE_RATE * desc.durationSec), SAMPLE_RATE);

  if (desc.id === 'builtin_music_ambient') {
    const chords = [220, 277.18, 329.63, 415.3];
    chords.forEach((freq, i) => {
      const osc = offline.createOscillator();
      const gain = offline.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, 0);
      gain.gain.setValueAtTime(0.001, 0);
      gain.gain.linearRampToValueAtTime(0.08, 1.5);
      gain.gain.setValueAtTime(0.08, desc.durationSec - 1.5);
      gain.gain.linearRampToValueAtTime(0.001, desc.durationSec);
      osc.connect(gain);
      gain.connect(offline.destination);
      osc.start(0);
      osc.stop(desc.durationSec);
    });
  } else if (desc.id === 'builtin_music_lofi') {
    const notes = [261.63, 329.63, 392.0, 493.88, 293.66, 349.23, 440.0, 523.25];
    const step = 0.625;
    for (let t = 0, stepIdx = 0; t < desc.durationSec - 0.3; t += step, stepIdx++) {
      const osc = offline.createOscillator();
      const g = offline.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[stepIdx % notes.length], t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.002, t + step * 0.9);
      osc.connect(g);
      g.connect(offline.destination);
      osc.start(t);
      osc.stop(t + step);
    }
  } else if (desc.id === 'builtin_music_upbeat') {
    const arp = [130.81, 196.0, 261.63, 311.13, 392.0, 311.13, 261.63, 196.0];
    const beat = 0.25;
    for (let t = 0, i = 0; t < desc.durationSec - 0.15; t += beat, i++) {
      const osc = offline.createOscillator();
      const g = offline.createGain();
      osc.type = i % 4 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(arp[i % arp.length], t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(i % 4 === 0 ? 0.14 : 0.09, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.002, t + beat * 0.88);
      osc.connect(g);
      g.connect(offline.destination);
      osc.start(t);
      osc.stop(t + beat);
    }
  } else if (desc.id === 'builtin_sfx_whoosh') {
    const bufferSize = Math.round(SAMPLE_RATE * desc.durationSec);
    const noiseBuffer = offline.createBuffer(1, bufferSize, SAMPLE_RATE);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const src = offline.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = offline.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.5, 0);
    filter.frequency.setValueAtTime(180, 0);
    filter.frequency.exponentialRampToValueAtTime(2600, desc.durationSec * 0.45);
    filter.frequency.exponentialRampToValueAtTime(220, desc.durationSec);
    const g = offline.createGain();
    g.gain.setValueAtTime(0.01, 0);
    g.gain.linearRampToValueAtTime(0.55, desc.durationSec * 0.42);
    g.gain.exponentialRampToValueAtTime(0.001, desc.durationSec);
    src.connect(filter);
    filter.connect(g);
    g.connect(offline.destination);
    src.start(0);
  } else if (desc.id === 'builtin_sfx_pop') {
    const osc = offline.createOscillator();
    const g = offline.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, 0);
    osc.frequency.exponentialRampToValueAtTime(920, 0.08);
    g.gain.setValueAtTime(0.5, 0);
    g.gain.exponentialRampToValueAtTime(0.001, desc.durationSec);
    osc.connect(g);
    g.connect(offline.destination);
    osc.start(0);
    osc.stop(desc.durationSec);
  } else if (desc.id === 'builtin_sfx_chime') {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const t = idx * 0.09;
      const osc = offline.createOscillator();
      const g = offline.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, desc.durationSec);
      osc.connect(g);
      g.connect(offline.destination);
      osc.start(t);
      osc.stop(desc.durationSec);
    });
  } else if (desc.id === 'builtin_sfx_boom') {
    const osc = offline.createOscillator();
    const g = offline.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, 0);
    osc.frequency.exponentialRampToValueAtTime(36, desc.durationSec);
    g.gain.setValueAtTime(0.75, 0);
    g.gain.exponentialRampToValueAtTime(0.001, desc.durationSec);
    osc.connect(g);
    g.connect(offline.destination);
    osc.start(0);
    osc.stop(desc.durationSec);
  } else if (desc.id === 'builtin_sfx_shutter') {
    const bufferSize = Math.round(SAMPLE_RATE * desc.durationSec);
    const noiseBuffer = offline.createBuffer(1, bufferSize, SAMPLE_RATE);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const src = offline.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = offline.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, 0);
    const g = offline.createGain();
    g.gain.setValueAtTime(0.65, 0);
    g.gain.exponentialRampToValueAtTime(0.001, 0.09);
    g.gain.setValueAtTime(0.45, 0.11);
    g.gain.exponentialRampToValueAtTime(0.001, 0.22);
    src.connect(filter);
    filter.connect(g);
    g.connect(offline.destination);
    src.start(0);
  }

  const rendered = await offline.startRendering();
  const wavBlob = audioBufferToWavBlob(rendered);
  const peaks = extractPeaksFromAudioBuffer(rendered, 44);
  const objectUrl = URL.createObjectURL(wavBlob);

  return {
    id: `${desc.id}_${Date.now().toString(36)}`,
    name: desc.name,
    kind: 'audio',
    mimeType: 'audio/wav',
    sizeBytes: wavBlob.size,
    durationMs: Math.round(desc.durationSec * 1000),
    waveformPeaks: peaks,
    objectUrl,
    blob: wavBlob,
    isBuiltin: true,
  };
}

/**
 * Builds a Web Audio DSP chain (Noise Reduction high-pass/low-pass, 3-band EQ, Voice Presence + Compressor).
 */
export function connectAudioDspChain(
  ctx: BaseAudioContext,
  sourceNode: AudioNode,
  destNode: AudioNode,
  dsp?: AudioDspSettings
): void {
  const cfg = dsp || DEFAULT_AUDIO_DSP;
  let tail: AudioNode = sourceNode;

  if (cfg.noiseReduction > 0) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 70 + (cfg.noiseReduction / 100) * 140; // 70Hz..210Hz rumble removal
    tail.connect(hp);
    tail = hp;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 14000 - (cfg.noiseReduction / 100) * 5500; // hiss attenuation
    tail.connect(lp);
    tail = lp;
  }

  if (cfg.eqBass !== 0) {
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 120;
    bass.gain.value = cfg.eqBass;
    tail.connect(bass);
    tail = bass;
  }

  if (cfg.eqMid !== 0) {
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1.1;
    mid.gain.value = cfg.eqMid;
    tail.connect(mid);
    tail = mid;
  }

  if (cfg.eqTreble !== 0) {
    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 5500;
    treble.gain.value = cfg.eqTreble;
    tail.connect(treble);
    tail = treble;
  }

  if (cfg.voiceEnhance) {
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2800;
    presence.Q.value = 1.2;
    presence.gain.value = 4.5;
    tail.connect(presence);
    tail = presence;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.15;
    tail.connect(comp);
    tail = comp;
  }

  tail.connect(destNode);
}

function applyVolumeAndFades(
  gainParam: AudioParam,
  startTimeSec: number,
  durationSec: number,
  volume: number,
  fadeInMs: number,
  fadeOutMs: number
) {
  const safeVol = Math.max(0, Math.min(2, volume));
  const fadeInSec = Math.min(durationSec * 0.48, Math.max(0, fadeInMs / 1000));
  const fadeOutSec = Math.min(durationSec * 0.48, Math.max(0, fadeOutMs / 1000));

  if (fadeInSec > 0.01) {
    gainParam.setValueAtTime(0.0001, startTimeSec);
    gainParam.linearRampToValueAtTime(safeVol, startTimeSec + fadeInSec);
  } else {
    gainParam.setValueAtTime(safeVol, startTimeSec);
  }

  if (fadeOutSec > 0.01) {
    const fadeOutStart = Math.max(startTimeSec + fadeInSec, startTimeSec + durationSec - fadeOutSec);
    gainParam.setValueAtTime(safeVol, fadeOutStart);
    gainParam.linearRampToValueAtTime(0.0001, startTimeSec + durationSec);
  }
}

/**
 * Mixes V1 video audio + A1 Music + A2 SFX with Track Mutes, DSP EQ/Noise Reduction, and Audio Ducking.
 */
export async function renderTimelineAudioToWav(
  clips: VideoClip[],
  audioItems: AudioTrackItem[],
  assets: Record<string, MediaAsset>,
  totalDurationMs: number,
  projectOptions?: Pick<VideoProjectState, 'trackStates' | 'audioDucking'>
): Promise<Blob | null> {
  if (totalDurationMs <= 0) return null;

  const v1Muted = Boolean(projectOptions?.trackStates?.V1?.muted);
  const a1Muted = Boolean(projectOptions?.trackStates?.A1?.muted);
  const a2Muted = Boolean(projectOptions?.trackStates?.A2?.muted);
  const duckPct = Math.max(0, Math.min(100, projectOptions?.audioDucking || 0));

  const totalFrames = Math.max(1, Math.ceil((totalDurationMs / 1000) * SAMPLE_RATE));
  const offline = new OfflineAudioContext(2, totalFrames, SAMPLE_RATE);

  const decodedCache = new Map<string, AudioBuffer | null>();
  const getDecoded = async (assetId: string) => {
    if (decodedCache.has(assetId)) return decodedCache.get(assetId) || null;
    const asset = assets[assetId];
    if (!asset) return null;
    const decoded = await decodeBlobToAudioBuffer(asset.blob, offline);
    decodedCache.set(assetId, decoded);
    return decoded;
  };

  let hasAnySound = false;
  const audibleSpeechWindows: Array<{ startSec: number; endSec: number }> = [];

  if (!v1Muted) {
    for (const clip of clips) {
      if (clip.muted || clip.volume <= 0) continue;
      const buf = await getDecoded(clip.assetId);
      if (!buf) continue;
      hasAnySound = true;

      const src = offline.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = Math.max(0.25, Math.min(4, clip.speed || 1));

      const gainNode = offline.createGain();
      const startSec = clip.timelineStartMs / 1000;
      const timelineDurSec = getClipDurationMs(clip) / 1000;
      const offsetSec = clip.sourceStartMs / 1000;
      const sourceSliceSec = Math.max(0.05, (clip.sourceEndMs - clip.sourceStartMs) / 1000);

      audibleSpeechWindows.push({ startSec, endSec: startSec + timelineDurSec });
      applyVolumeAndFades(gainNode.gain, startSec, timelineDurSec, clip.volume, clip.fadeInMs, clip.fadeOutMs);
      connectAudioDspChain(offline, src, gainNode, clip.audioDsp);
      gainNode.connect(offline.destination);
      src.start(startSec, offsetSec, sourceSliceSec);
    }
  }

  for (const item of audioItems) {
    if (item.muted || item.volume <= 0) continue;
    if (item.track === 'music' && a1Muted) continue;
    if (item.track === 'sfx' && a2Muted) continue;

    const buf = await getDecoded(item.assetId);
    if (!buf) continue;
    hasAnySound = true;

    const src = offline.createBufferSource();
    src.buffer = buf;

    const gainNode = offline.createGain();
    const startSec = item.startMs / 1000;
    const durSec = Math.max(0.05, (item.sourceEndMs - item.sourceStartMs) / 1000);
    const offsetSec = item.sourceStartMs / 1000;

    let effectiveVol = item.volume;
    if (item.track === 'music' && duckPct > 0 && audibleSpeechWindows.length > 0) {
      // Apply smooth ducking factor during overlapping dialogue windows
      const overlaps = audibleSpeechWindows.some(
        (w) => w.startSec < startSec + durSec && w.endSec > startSec
      );
      if (overlaps) {
        effectiveVol = item.volume * (1 - (duckPct / 100) * 0.72);
      }
    }

    applyVolumeAndFades(gainNode.gain, startSec, durSec, effectiveVol, item.fadeInMs, item.fadeOutMs);
    connectAudioDspChain(offline, src, gainNode, item.audioDsp);
    gainNode.connect(offline.destination);
    src.start(startSec, offsetSec, durSec);
  }

  if (!hasAnySound) return null;

  const mixed = await offline.startRendering();
  return audioBufferToWavBlob(mixed);
}

export async function extractClipAudioToWav(clip: VideoClip, asset: MediaAsset): Promise<Blob> {
  const durationMs = getClipDurationMs(clip);
  const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * SAMPLE_RATE));
  const offline = new OfflineAudioContext(2, totalFrames, SAMPLE_RATE);

  const buf = await decodeBlobToAudioBuffer(asset.blob, offline);
  if (!buf) {
    throw new Error('This video file does not contain a readable audio track.');
  }

  const src = offline.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = Math.max(0.25, Math.min(4, clip.speed || 1));

  const gainNode = offline.createGain();
  const durSec = durationMs / 1000;
  applyVolumeAndFades(gainNode.gain, 0, durSec, clip.volume || 1, clip.fadeInMs, clip.fadeOutMs);
  connectAudioDspChain(offline, src, gainNode, clip.audioDsp);
  gainNode.connect(offline.destination);
  src.start(0, clip.sourceStartMs / 1000, Math.max(0.05, (clip.sourceEndMs - clip.sourceStartMs) / 1000));

  const rendered = await offline.startRendering();
  return audioBufferToWavBlob(rendered);
}
