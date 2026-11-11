import { SubtitleCue, ValidationIssue } from '../types/subtitles';
import { msToSrtTimestamp } from './timeUtils';

export interface ValidationSummary {
  totalCues: number;
  totalDurationMs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  avgCps: number;
  maxCps: number;
  issues: ValidationIssue[];
}

export function validateSubtitles(cues: SubtitleCue[]): ValidationSummary {
  const issues: ValidationIssue[] = [];
  let totalChars = 0;
  let maxCps = 0;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const cueNum = i + 1;
    const durationMs = cue.endMs - cue.startMs;
    const durationSec = durationMs / 1000;
    const timeStr = `${msToSrtTimestamp(cue.startMs)} --> ${msToSrtTimestamp(cue.endMs)}`;
    const cleanText = cue.text.replace(/<\/?[^>]+(>|$)/g, '').trim();
    const charCount = cleanText.length;
    totalChars += charCount;

    // 1. Negative or zero duration
    if (cue.endMs <= cue.startMs) {
      issues.push({
        id: `err-duration-${cueNum}`,
        severity: 'error',
        cueIndex: cueNum,
        code: 'NEGATIVE_OR_ZERO_DURATION',
        title: 'Zero or Negative Duration',
        message: `Cue duration is ${durationMs}ms (Start is greater than or equal to End time).`,
        timestamp: timeStr,
        cueSnippet: cue.text,
        autoFixable: true,
      });
    }

    // 2. Ultra-short duration (< 600ms)
    if (durationMs > 0 && durationMs < 600 && charCount > 3) {
      issues.push({
        id: `warn-short-${cueNum}`,
        severity: 'warning',
        cueIndex: cueNum,
        code: 'TOO_SHORT_DURATION',
        title: 'Too Short on Screen',
        message: `Duration is only ${durationMs}ms. Viewers may not be able to read this before it disappears.`,
        timestamp: timeStr,
        cueSnippet: cue.text,
        autoFixable: true,
      });
    }

    // 3. Ultra-long duration (> 7000ms)
    if (durationMs > 7500) {
      issues.push({
        id: `info-long-${cueNum}`,
        severity: 'info',
        cueIndex: cueNum,
        code: 'LONG_DURATION',
        title: 'Extended Duration',
        message: `Cue stays on screen for ${(durationSec).toFixed(1)}s. Broadcast guidelines recommend max 7 seconds per caption.`,
        timestamp: timeStr,
        cueSnippet: cue.text,
      });
    }

    // 4. Overlap with previous cue
    if (i > 0) {
      const prev = cues[i - 1];
      if (cue.startMs < prev.endMs) {
        const overlapMs = prev.endMs - cue.startMs;
        issues.push({
          id: `err-overlap-${cueNum}`,
          severity: 'error',
          cueIndex: cueNum,
          code: 'OVERLAPPING_TIMESTAMPS',
          title: 'Overlapping Subtitle Cues',
          message: `Starts ${overlapMs}ms before previous cue #${i} finishes.`,
          timestamp: timeStr,
          cueSnippet: cue.text,
          autoFixable: true,
        });
      }

      // Out-of-order check
      if (cue.startMs < prev.startMs) {
        issues.push({
          id: `err-order-${cueNum}`,
          severity: 'error',
          cueIndex: cueNum,
          code: 'OUT_OF_ORDER',
          title: 'Timestamp Out of Sequence',
          message: `Starts before cue #${i} starts (${msToSrtTimestamp(prev.startMs)}).`,
          timestamp: timeStr,
          cueSnippet: cue.text,
          autoFixable: true,
        });
      }
    }

    // 5. Empty cue text
    if (!cleanText) {
      issues.push({
        id: `err-empty-${cueNum}`,
        severity: 'error',
        cueIndex: cueNum,
        code: 'EMPTY_CUE_TEXT',
        title: 'Empty Subtitle Text',
        message: 'This subtitle cue contains no readable text or only whitespace.',
        timestamp: timeStr,
        autoFixable: true,
      });
    }

    // 6. Characters Per Second (CPS) reading speed
    if (durationSec > 0 && charCount > 0) {
      const cps = charCount / durationSec;
      if (cps > maxCps) maxCps = cps;

      if (cps > 26) {
        issues.push({
          id: `err-cps-${cueNum}`,
          severity: 'error',
          cueIndex: cueNum,
          code: 'CPS_TOO_HIGH',
          title: 'High Reading Speed (CPS)',
          message: `Reading speed is ${cps.toFixed(1)} chars/sec (Netflix and BBC limit is 20-22 CPS).`,
          timestamp: timeStr,
          cueSnippet: cue.text,
        });
      } else if (cps > 21) {
        issues.push({
          id: `warn-cps-${cueNum}`,
          severity: 'warning',
          cueIndex: cueNum,
          code: 'CPS_ELEVATED',
          title: 'Elevated Reading Speed',
          message: `Reading speed is ${cps.toFixed(1)} chars/sec. Consider extending cue time or condensing text.`,
          timestamp: timeStr,
          cueSnippet: cue.text,
        });
      }
    }

    // 7. Characters Per Line (CPL) and Line Count
    const lines = cue.text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 2) {
      issues.push({
        id: `warn-lines-${cueNum}`,
        severity: 'warning',
        cueIndex: cueNum,
        code: 'TOO_MANY_LINES',
        title: 'More Than 2 Lines',
        message: `Cue has ${lines.length} lines. Standard subtitling format allows at most 2 lines to avoid blocking the video.`,
        timestamp: timeStr,
        cueSnippet: cue.text,
      });
    }

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const cleanLine = lines[lineIdx].replace(/<\/?[^>]+(>|$)/g, '').trim();
      if (cleanLine.length > 42) {
        issues.push({
          id: `warn-cpl-${cueNum}-${lineIdx}`,
          severity: 'warning',
          cueIndex: cueNum,
          code: 'LINE_TOO_LONG',
          title: 'Line Exceeds 42 Characters',
          message: `Line ${lineIdx + 1} has ${cleanLine.length} chars (standard limit is 37–42 characters).`,
          timestamp: timeStr,
          cueSnippet: `"${cleanLine.substring(0, 45)}..."`,
        });
      }
    }

    // 8. Unclosed formatting tags
    const openTags = cue.text.match(/<([ibuvc]|font)[^>]*>/gi) || [];
    const closeTags = cue.text.match(/<\/[ibuvc]|font>/gi) || [];
    if (openTags.length !== closeTags.length) {
      issues.push({
        id: `warn-unclosed-tag-${cueNum}`,
        severity: 'warning',
        cueIndex: cueNum,
        code: 'UNCLOSED_HTML_TAG',
        title: 'Mismatched HTML / Style Tag',
        message: 'Detected unclosed or unbalanced tags (like <i>, <b>). May cause styling to bleed into subsequent subtitles.',
        timestamp: timeStr,
        cueSnippet: cue.text,
        autoFixable: true,
      });
    }
  }

  const totalDurationMs = cues.length > 0 ? Math.max(0, cues[cues.length - 1].endMs - cues[0].startMs) : 0;
  const avgCps = totalDurationMs > 0 ? (totalChars / (totalDurationMs / 1000)) : 0;

  return {
    totalCues: cues.length,
    totalDurationMs,
    errorCount: issues.filter((i) => i.severity === 'error').length,
    warningCount: issues.filter((i) => i.severity === 'warning').length,
    infoCount: issues.filter((i) => i.severity === 'info').length,
    avgCps: Math.round(avgCps * 10) / 10,
    maxCps: Math.round(maxCps * 10) / 10,
    issues,
  };
}

export function autoFixSubtitleCues(cues: SubtitleCue[]): SubtitleCue[] {
  // Sort cues chronologically by start time first
  const sorted = [...cues].sort((a, b) => a.startMs - b.startMs);
  const fixed: SubtitleCue[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const original = sorted[i];
    let startMs = Math.max(0, original.startMs);
    let endMs = original.endMs;

    // Fix zero/negative duration
    if (endMs <= startMs) {
      endMs = startMs + 1500; // minimum 1.5s
    }

    // Fix overlap with previous cue
    if (fixed.length > 0) {
      const prev = fixed[fixed.length - 1];
      if (prev.endMs > startMs) {
        // Adjust previous cue's end time to 20ms before current start
        prev.endMs = Math.max(prev.startMs + 500, startMs - 20);
      }
    }

    // Clean text and tags
    let text = original.text.trim();
    // Fix unclosed tags by closing any unclosed <i>, <b>, <u>
    if (text.includes('<i>') && !text.includes('</i>')) text += '</i>';
    if (text.includes('<b>') && !text.includes('</b>')) text += '</b>';
    if (text.includes('<u>') && !text.includes('</u>')) text += '</u>';

    if (text.length > 0) {
      fixed.push({
        id: fixed.length + 1,
        startMs,
        endMs,
        text,
        settings: original.settings,
      });
    }
  }

  return fixed;
}
