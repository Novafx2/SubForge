import { SubtitleCue, ParseResult } from '../types/subtitles';
import { parseTimestampToMs, msToVttTimestamp } from './timeUtils';
import { parseSrt } from './srtParser';

const VTT_TIMESTAMP_REGEX = /(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})(.*)/;

export function parseVtt(rawInput: string): ParseResult {
  const cues: SubtitleCue[] = [];
  const warnings: string[] = [];

  let cleanInput = rawInput.replace(/^\uFEFF/, '');
  cleanInput = cleanInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const blocks = cleanInput.split(/\n\s*\n/);
  let header = 'WEBVTT';
  let firstBlockChecked = false;
  let cueCount = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd()).filter(Boolean);
    if (lines.length === 0) continue;

    // Check header block
    if (!firstBlockChecked) {
      firstBlockChecked = true;
      if (lines[0].startsWith('WEBVTT')) {
        header = block.trim();
        continue;
      }
    }

    // Ignore NOTE or STYLE blocks
    if (lines[0].startsWith('NOTE') || lines[0].startsWith('STYLE') || lines[0].startsWith('REGION')) {
      continue;
    }

    let timeLineIdx = -1;
    let match: RegExpMatchArray | null = null;

    for (let i = 0; i < lines.length; i++) {
      match = lines[i].match(VTT_TIMESTAMP_REGEX);
      if (match) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1 || !match) {
      continue;
    }

    const startMs = parseTimestampToMs(match[1]);
    const endMs = parseTimestampToMs(match[2]);
    const settings = match[3]?.trim();

    let cueId: string | number = cueCount;
    if (timeLineIdx > 0) {
      cueId = lines[timeLineIdx - 1].trim();
    }

    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join('\n').trim();

    cues.push({
      id: cueId,
      startMs,
      endMs,
      text,
      settings: settings || undefined,
    });

    cueCount++;
  }

  return {
    format: 'vtt',
    cues,
    header,
    warnings: warnings.length > 0 ? warnings : undefined,
    rawText: rawInput,
  };
}

export function serializeToVtt(
  cues: SubtitleCue[],
  options?: {
    includeHeaderTitle?: string;
    includeCueIds?: boolean;
    keepSettings?: boolean;
    stripTags?: boolean;
  }
): string {
  const includeCueIds = options?.includeCueIds ?? false;
  const keepSettings = options?.keepSettings ?? false;
  const stripTags = options?.stripTags ?? false;

  const header = options?.includeHeaderTitle ? `WEBVTT - ${options.includeHeaderTitle}` : 'WEBVTT';
  const outLines = [header, ''];

  cues.forEach((cue, index) => {
    if (includeCueIds) {
      outLines.push(String(cue.id ?? index + 1));
    }
    const startStr = msToVttTimestamp(cue.startMs);
    const endStr = msToVttTimestamp(cue.endMs);
    const settingsPart = keepSettings && cue.settings ? ` ${cue.settings}` : '';

    outLines.push(`${startStr} --> ${endStr}${settingsPart}`);

    let text = cue.text || '';
    if (stripTags) {
      text = text.replace(/<\/?[^>]+(>|$)/g, '');
    }
    outLines.push(text);
    outLines.push('');
  });

  return outLines.join('\n').trim() + '\n';
}

/**
 * Auto-detect whether string is WebVTT or SRT
 */
export function autoDetectAndParse(rawInput: string): ParseResult {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith('WEBVTT') || trimmed.includes('.vtt') || /--> \d{1,2}:\d{2}\.\d{3}/.test(trimmed)) {
    return parseVtt(rawInput);
  }
  return parseSrt(rawInput);
}
