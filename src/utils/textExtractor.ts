import { SubtitleCue } from '../types/subtitles';

export interface TextExtractionOptions {
  mode: 'paragraphs' | 'lines' | 'single-string';
  removeSpeakerLabels: boolean;
  removeSoundEffects: boolean;
  deduplicateLines: boolean;
  stripHtmlTags: boolean;
}

export interface ExtractedTextResult {
  text: string;
  wordCount: number;
  characterCount: number;
  readingTimeMinutes: number;
  totalCues: number;
}

export function extractTextFromCues(
  cues: SubtitleCue[],
  options: TextExtractionOptions
): ExtractedTextResult {
  const processedLines: string[] = [];
  let lastSeenLine = '';

  for (const cue of cues) {
    let cueText = cue.text;

    // 1. Strip HTML tags
    if (options.stripHtmlTags) {
      cueText = cueText.replace(/<\/?[^>]+(>|$)/g, '');
    }

    // 2. Remove sound effects [music], (applause), ♪ notes ♪
    if (options.removeSoundEffects) {
      cueText = cueText.replace(/\[[^\]]*\]/g, ''); // [anything]
      cueText = cueText.replace(/\([^)]*\)/g, ''); // (anything)
      cueText = cueText.replace(/[♪♫#][^♪♫#]*[♪♫#]/g, ''); // ♪ music ♪
      cueText = cueText.replace(/^[♪♫#\s]+|[♪♫#\s]+$/g, '');
    }

    // 3. Remove speaker labels like "JOHN:", ">> Host:", "Speaker 1:", "Dr. Smith:"
    if (options.removeSpeakerLabels) {
      cueText = cueText.replace(/^>>\s*/gm, '');
      cueText = cueText.replace(/^[A-Za-z0-9\s_.-]{1,25}:\s*/gm, '');
      cueText = cueText.replace(/^\[[A-Za-z0-9\s_.-]{1,25}\]:\s*/gm, '');
      cueText = cueText.replace(/^\([A-Za-z0-9\s_.-]{1,25}\):\s*/gm, '');
    }

    const rawLines = cueText.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const line of rawLines) {
      if (!line) continue;

      // 4. Deduplicate consecutive repeated lines (rolling captions)
      if (options.deduplicateLines && line === lastSeenLine) {
        continue;
      }

      processedLines.push(line);
      lastSeenLine = line;
    }
  }

  let finalText = '';

  if (options.mode === 'single-string') {
    finalText = processedLines.join(' ').replace(/\s+/g, ' ').trim();
  } else if (options.mode === 'lines') {
    finalText = processedLines.join('\n');
  } else {
    // 'paragraphs' mode: smart joining of sentences
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      currentParagraph.push(line);

      // End paragraph on sentence-ending punctuation when paragraph has accumulated sufficient length
      const isSentenceEnd = /[.!?]["']?$/.test(line);
      const isLongEnough = currentParagraph.join(' ').length > 280;

      if (isSentenceEnd && isLongEnough) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    }

    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    finalText = paragraphs.join('\n\n');
  }

  // Calculate statistics
  const words = finalText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const characterCount = finalText.length;
  // Average human reading speed: ~200-220 words per minute
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    text: finalText,
    wordCount,
    characterCount,
    readingTimeMinutes,
    totalCues: cues.length,
  };
}
