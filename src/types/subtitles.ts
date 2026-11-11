export interface SubtitleCue {
  id?: number | string;
  startMs: number;
  endMs: number;
  text: string;
  settings?: string;
}

export type SubtitleFormat = 'srt' | 'vtt' | 'txt' | 'auto';

export interface ParseResult {
  format: 'srt' | 'vtt';
  cues: SubtitleCue[];
  header?: string;
  warnings?: string[];
  rawText: string;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  cueIndex: number; // 1-based index in subtitle file
  code: string;
  title: string;
  message: string;
  timestamp?: string;
  cueSnippet?: string;
  autoFixable?: boolean;
}

export interface ChapterItem {
  id: string;
  timeMs: number;
  timeFormatted: string;
  title: string;
}

export interface ToolMeta {
  id: string;
  slug: string;
  path: string;
  title: string;
  shortName: string;
  tagline: string;
  description: string;
  category: 'convert' | 'sync' | 'audit' | 'creator';
  icon: string;
  keywords: string[];
}
