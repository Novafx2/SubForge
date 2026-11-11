import { ToolMeta } from '../types/subtitles';

export const TOOLS: ToolMeta[] = [
  {
    id: 'srt-to-vtt',
    slug: 'srt-to-vtt',
    path: '/tools/srt-to-vtt',
    title: 'SRT to VTT Converter – Free Online WebVTT Generator',
    shortName: 'SRT to VTT Converter',
    tagline: 'Convert SubRip (.srt) files to HTML5 WebVTT (.vtt) format with millisecond precision.',
    description: 'Free browser-based SRT to VTT converter. Transform SubRip subtitle files into standard WebVTT subtitles for HTML5 video, Vimeo, Coursera, and web players. 100% private and client-side.',
    category: 'convert',
    icon: 'FileCode2',
    keywords: ['srt to vtt', 'convert srt to webvtt', 'subrip to vtt', 'html5 video captions', 'free subtitle converter'],
  },
  {
    id: 'vtt-to-srt',
    slug: 'vtt-to-srt',
    path: '/tools/vtt-to-srt',
    title: 'VTT to SRT Converter – Convert WebVTT to SubRip Online',
    shortName: 'VTT to SRT Converter',
    tagline: 'Convert WebVTT (.vtt) captions into universal SubRip (.srt) subtitle files.',
    description: 'Convert WebVTT (.vtt) files to standard SubRip (.srt) subtitle format instantly in your browser. Cleans WebVTT headers, removes cue settings, and fixes comma timestamps for Premiere Pro, VLC, and TV players.',
    category: 'convert',
    icon: 'FileText',
    keywords: ['vtt to srt', 'convert webvtt to srt', 'vtt to subrip', 'clean vtt', 'subtitle format conversion'],
  },
  {
    id: 'timing-fixer',
    slug: 'timing-fixer',
    path: '/tools/timing-fixer',
    title: 'Subtitle Timing Fixer – Shift, Delay & Fix Subtitle Sync',
    shortName: 'Subtitle Timing Fixer',
    tagline: 'Shift subtitle timestamps forward or backward by milliseconds to fix audio sync issues.',
    description: 'Easily fix out-of-sync subtitles. Delay or advance subtitle cues by exact milliseconds, seconds, or minutes. Correct gradual audio-video drift with linear time stretching. Works with SRT and VTT.',
    category: 'sync',
    icon: 'Clock',
    keywords: ['subtitle timing fixer', 'shift subtitle delay', 'sync subtitles', 'srt time offset', 'fix out of sync captions'],
  },
  {
    id: 'fps-converter',
    slug: 'fps-converter',
    path: '/tools/fps-converter',
    title: 'Subtitle FPS Converter – Convert Subtitle Framerates (23.976 to 25)',
    shortName: 'Subtitle FPS Converter',
    tagline: 'Convert subtitle framerates between 23.976, 24, 25, 29.97, and 30 FPS to fix timing drift.',
    description: 'Convert subtitle framerates between 23.976 fps film, 24 fps cinema, 25 fps PAL, and 29.97/30 fps NTSC. Fix cumulative subtitle desync caused by video framerate speed differences.',
    category: 'sync',
    icon: 'FastForward',
    keywords: ['subtitle fps converter', '23.976 to 25 fps srt', 'pal to ntsc subtitle converter', 'subtitle framerate speedup', 'framerate sync fix'],
  },
  {
    id: 'validator',
    slug: 'validator',
    path: '/tools/validator',
    title: 'Subtitle Validator & Linter – Quality & Broadcast Syntax Auditor',
    shortName: 'Subtitle Validator',
    tagline: 'Audit SRT and WebVTT files for overlapping timestamps, reading speed (CPS), line limits, and syntax errors.',
    description: 'Professional subtitle quality checker and linter. Detect overlapping cues, negative durations, excessive characters-per-second (CPS), line length violations, and unclosed tags. Includes 1-click Auto-Fix.',
    category: 'audit',
    icon: 'ShieldAlert',
    keywords: ['subtitle validator', 'srt linter', 'check subtitle errors', 'reading speed cps checker', 'fix overlapping subtitles'],
  },
  {
    id: 'text-extractor',
    slug: 'text-extractor',
    path: '/tools/text-extractor',
    title: 'Subtitle Text Extractor – Convert SRT & VTT to Clean Plain Text',
    shortName: 'Subtitle Text Extractor',
    tagline: 'Strip timestamps, speaker tags, and sound effects to turn captions into clean readable transcripts.',
    description: 'Extract clean readable text from SRT, VTT, or subtitle files. Removes timestamps, cue numbers, sound effect brackets [music], and speaker labels. Groups captions into natural prose paragraphs.',
    category: 'creator',
    icon: 'FileSpreadsheet',
    keywords: ['extract text from srt', 'srt to txt converter', 'turn subtitles into transcript', 'clean captions text', 'remove srt timestamps'],
  },
  {
    id: 'merger',
    slug: 'merger',
    path: '/tools/merger',
    title: 'Subtitle Merger – Combine Files or Create Bilingual Dual Subtitles',
    shortName: 'Subtitle Merger',
    tagline: 'Merge multiple subtitle files sequentially or combine two languages into dual bilingual captions.',
    description: 'Combine two subtitle files into one. Append CD1 and CD2 movie parts with automatic timestamp offsets, or merge two languages into bilingual dual-caption subtitles for language learning and localization.',
    category: 'creator',
    icon: 'Layers',
    keywords: ['merge subtitles', 'combine srt files', 'bilingual subtitles generator', 'dual language srt merger', 'join srt cd1 cd2'],
  },
  {
    id: 'youtube-chapters',
    slug: 'youtube-chapters',
    path: '/tools/youtube-chapters',
    title: 'YouTube Chapters Generator – Create Video Timestamps for YouTube',
    shortName: 'YouTube Chapters Generator',
    tagline: 'Generate YouTube video chapters from subtitle cues or build timestamp descriptions that rank on Google.',
    description: 'Free YouTube Chapters generator. Automatically build and validate YouTube video timestamps from your subtitle files or create custom chapters. Enforces 00:00 start, minimum 3 chapters, and 10s intervals.',
    category: 'creator',
    icon: 'Video',
    keywords: ['youtube chapters generator', 'youtube timestamp generator', 'video chapters maker', 'youtube description chapters', 'auto generate youtube chapters'],
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const TOOL_FAQS: Record<string, FaqItem[]> = {
  'srt-to-vtt': [
    {
      question: 'What is the main difference between SRT and WebVTT files?',
      answer: 'SubRip (.srt) uses commas for millisecond separators (00:01:23,456) and sequential numeric cue IDs. WebVTT (.vtt) requires a "WEBVTT" header line, uses periods/dots for milliseconds (00:01:23.456), and supports advanced HTML5 styling and cue positioning (like align:left position:10%).',
    },
    {
      question: 'Will this converter change my subtitle timing or sync?',
      answer: 'No. The conversion preserves exact millisecond timestamps down to the single millisecond. It only transforms the syntax formatting from comma to dot notation and attaches the required WebVTT header.',
    },
    {
      question: 'Are my uploaded subtitle files stored on any server?',
      answer: 'Never. SubForge runs 100% inside your web browser using client-side JavaScript. Your subtitle files never leave your device, ensuring total privacy for unreleased videos, enterprise webinars, and confidential content.',
    },
    {
      question: 'Where is WebVTT commonly required instead of SRT?',
      answer: 'HTML5 `<track>` video elements, Vimeo, Apple iOS Safari native video, Canvas LMS, Coursera, and modern web application video players require WebVTT (.vtt) format for native browser compatibility.',
    },
  ],
  'vtt-to-srt': [
    {
      question: 'Why do video editing programs like Adobe Premiere Pro prefer SRT over VTT?',
      answer: 'SubRip (.srt) is the oldest and most widely supported subtitle standard across Non-Linear Video Editors (NLEs) such as Premiere Pro, DaVinci Resolve, Final Cut Pro, and physical TV set-top boxes. WebVTT headers and cue settings frequently cause import errors in legacy NLEs.',
    },
    {
      question: 'Does this tool remove WebVTT header tags, styles, and cue positions?',
      answer: 'Yes. Our converter cleans away the "WEBVTT" declaration, NOTE blocks, STYLE blocks, and positioning settings (such as line:0 position:50%), leaving only pure, standardized SubRip numbers, timestamps, and caption text.',
    },
    {
      question: 'How are decimal dots converted to SubRip commas?',
      answer: 'Timestamps are precisely parsed into milliseconds and formatted according to the official SubRip standard (HH:MM:SS,mmm), guaranteeing full compatibility with VLC, MPC-HC, and video editors.',
    },
  ],
  'timing-fixer': [
    {
      question: 'How do I know how many milliseconds to shift my subtitles?',
      answer: '1 second equals 1,000 milliseconds. If the speech appears 2 seconds before the subtitles show up, add a negative shift (-2,000 ms) to display the subtitles earlier. If subtitles show up too early before the speaker talks, add a positive shift (+2,000 ms).',
    },
    {
      question: 'What is linear drift, and how does drift correction work?',
      answer: 'Linear drift occurs when subtitles start perfectly synchronized at the beginning of a video, but gradually slip out of sync as the movie progresses. This is typically caused by a framerate mismatch (e.g. 23.976 fps film converted to 25 fps PAL video). Our drift correction allows you to stretch or compress time proportionally across the entire file.',
    },
    {
      question: 'What happens if a negative shift pushes a timestamp before 00:00:00?',
      answer: 'SubForge automatically clamps the earliest timestamp to 00:00:00,000 and ensures cue start and end durations remain valid, preventing broken or negative timestamps.',
    },
  ],
  'fps-converter': [
    {
      question: 'Why do subtitles lose synchronization when framerates differ?',
      answer: 'Movies recorded at 24 fps or 23.976 fps are often sped up by approximately 4.1% when broadcast in PAL regions (25 fps). As a result, 1 second in 24 fps spans a different duration than in 25 fps, causing subtitles to drift by several seconds over a 90-minute film.',
    },
    {
      question: 'What is the exact mathematical conversion formula used?',
      answer: 'For each timestamp T, the new timestamp is calculated as T_new = T_old * (source_fps / target_fps). For example, converting 23.976 fps to 25 fps multiplies all cue times by (23.976 / 25) = 0.95904, speeding up the subtitles to match PAL playback.',
    },
    {
      question: 'Which preset should I use for a film that drifts on TV?',
      answer: 'If your movie video plays at 25 fps (PAL) but your subtitle was downloaded for a 23.976 fps US/Web video release, select "23.976 fps -> 25 fps". If the reverse occurs, select "25 fps -> 23.976 fps".',
    },
  ],
  'validator': [
    {
      question: 'What are the most common subtitle validation errors?',
      answer: 'The most frequent issues are overlapping cue timestamps (where cue 2 begins before cue 1 finishes), zero-duration cues, reading speeds exceeding 25 characters per second (CPS), and lines exceeding 42 characters that clip off screen edges.',
    },
    {
      question: 'What is the standard Characters Per Second (CPS) limit for video?',
      answer: 'Broadcast networks (such as BBC, Netflix, and Amazon Prime Video) specify an optimal reading speed between 17 and 20 CPS, with a hard ceiling at 22-25 CPS. Exceeding this rate causes viewer cognitive fatigue.',
    },
    {
      question: 'How does the 1-Click Auto-Fix feature work?',
      answer: 'The auto-fixer chronologically re-sorts cues, clamps previous cue end times to 20ms before the next cue to eliminate overlaps, guarantees a minimum 1.5-second duration for zero-duration cues, and closes unclosed HTML tags.',
    },
  ],
  'text-extractor': [
    {
      question: 'Can I extract text from YouTube auto-generated captions?',
      answer: 'Yes! Download the SRT or VTT file from YouTube Studio, upload it here, and turn on "Deduplicate repeated lines" to eliminate the rolling caption duplicates commonly found in YouTube automated transcripts.',
    },
    {
      question: 'What formatting options are available for the extracted text?',
      answer: 'You can format the output as natural prose paragraphs (great for blog posts, newsletters, and summaries), line-by-line, or a single continuous string. You can also strip bracketed sound effects like [applause] and speaker names.',
    },
    {
      question: 'Can I use this for podcast and webinar transcription cleanup?',
      answer: 'Absolutely. It instantly turns caption files into publication-ready transcripts, including word counts and estimated reading times.',
    },
  ],
  'merger': [
    {
      question: 'How does Sequential Append mode work for multi-part videos?',
      answer: 'When a video is split into two parts (e.g. CD1 and CD2), the second subtitle file timestamps start at 00:00:00. In Sequential Append mode, you can specify the duration or end time of Part 1, and SubForge will offset all Part 2 timestamps accordingly before combining them.',
    },
    {
      question: 'How does Bilingual / Dual Subtitle mode work?',
      answer: 'Bilingual mode matches overlapping cue intervals between your primary language (e.g., English) and secondary language (e.g., Spanish). It stacks both lines together inside each cue, enabling language learners and multilingual audiences to read both translations simultaneously.',
    },
    {
      question: 'Can I choose which language appears on the top vs bottom line?',
      answer: 'Yes. You can assign which file is the primary (top line) and which is the secondary (bottom line).',
    },
  ],
  'youtube-chapters': [
    {
      question: 'What are YouTube rules for video chapters to show up in the player?',
      answer: 'YouTube requires: 1) The first chapter must start at exactly 00:00. 2) There must be at least 3 chapters in ascending chronological order. 3) Each chapter must be at least 10 seconds long.',
    },
    {
      question: 'How do video chapters improve YouTube SEO and Google Search visibility?',
      answer: 'Google Search indexes YouTube chapters directly in search results as "Key Moments", allowing searchers to click straight to relevant answers in your video, multiplying click-through rates and search reach.',
    },
    {
      question: 'Can I paste the output directly into my YouTube description?',
      answer: 'Yes. Click "Copy YouTube Chapters", paste it directly into your video description box in YouTube Studio, and YouTube will automatically generate the interactive progress bar on your video.',
    },
  ],
};
