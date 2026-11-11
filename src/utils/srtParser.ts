import { SubtitleCue, ParseResult } from '../types/subtitles';
import { parseTimestampToMs, msToSrtTimestamp } from './timeUtils';

const TIMESTAMP_REGEX = /(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}|\d{1,2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}|\d{1,2}:\d{2}[,\.]\d{1,3})/;

export function parseSrt(rawInput: string): ParseResult {
  const warnings: string[] = [];
  const cues: SubtitleCue[] = [];

  // Strip BOM if present
  let cleanInput = rawInput.replace(/^\uFEFF/, '');
  // Normalize line endings to \n
  cleanInput = cleanInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into raw cue blocks (separated by 2 or more newlines)
  const blocks = cleanInput.split(/\n\s*\n/);

  let currentCueNum = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd()).filter(Boolean);
    if (lines.length === 0) continue;

    let timeLineIdx = -1;
    let match: RegExpMatchArray | null = null;

    // Search for the timestamp arrow in the first few lines of the block
    for (let i = 0; i < lines.length; i++) {
      match = lines[i].match(TIMESTAMP_REGEX);
      if (match) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1 || !match) {
      // Not a valid cue block (could be header or trailing note)
      continue;
    }

    const startMs = parseTimestampToMs(match[1]);
    const endMs = parseTimestampToMs(match[2]);

    if (endMs < startMs) {
      warnings.push(`Cue #${currentCueNum} has end time earlier than start time.`);
    }

    // Cue ID is typically the line immediately before timestamp (if numeric)
    let cueId: string | number = currentCueNum;
    if (timeLineIdx > 0) {
      const potentialId = lines[timeLineIdx - 1].trim();
      if (/^\d+$/.test(potentialId)) {
        cueId = parseInt(potentialId, 10);
      } else {
        cueId = potentialId;
      }
    }

    // Lines after timestamp line are text lines
    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join('\n').trim();

    cues.push({
      id: cueId,
      startMs,
      endMs,
      text,
    });

    currentCueNum++;
  }

  return {
    format: 'srt',
    cues,
    warnings: warnings.length > 0 ? warnings : undefined,
    rawText: rawInput,
  };
}

export function serializeToSrt(cues: SubtitleCue[], options?: { reindex?: boolean; stripTags?: boolean }): string {
  const reindex = options?.reindex ?? true;
  const stripTags = options?.stripTags ?? false;

  return cues
    .map((cue, index) => {
      const cueNumber = reindex ? index + 1 : cue.id ?? index + 1;
      const startStr = msToSrtTimestamp(cue.startMs);
      const endStr = msToSrtTimestamp(cue.endMs);
      let text = cue.text || '';

      if (stripTags) {
        // Strip HTML / styling tags like <i>, <b>, <font ...>, etc.
        text = text.replace(/<\/?[^>]+(>|$)/g, '');
      }

      return `${cueNumber}\n${startStr} --> ${endStr}\n${text}\n`;
    })
    .join('\n')
    .trim() + '\n';
}
