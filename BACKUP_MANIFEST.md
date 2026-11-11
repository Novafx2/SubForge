# SUBFORGE PRE-UPGRADE BACKUP & ROLLBACK MANIFEST

**Snapshot Date**: 2026-11-02
**Base State**: SubForge Subtitle Studio v1.0.0
**Core Architecture**: Vite + React 19 + TypeScript + Tailwind CSS v4

## Existing Working Routes Verified
1. `/` - Home Page (Tool directory, search, category filter, educational features)
2. `/tools/srt-to-vtt` - Tool 1: SRT to VTT Converter
3. `/tools/vtt-to-srt` - Tool 2: VTT to SRT Converter
4. `/tools/timing-fixer` - Tool 3: Subtitle Timing Fixer & Linear Drift Shifter
5. `/tools/fps-converter` - Tool 4: Subtitle FPS Converter (23.976, 24, 25, 29.97, 30 FPS)
6. `/tools/validator` - Tool 5: Subtitle Validator & Linter (Broadcast compliance & Auto-Fix)
7. `/tools/text-extractor` - Tool 6: Subtitle Text Extractor & Transcript Formatter
8. `/tools/merger` - Tool 7: Subtitle Merger (Sequential Append & Bilingual Dual Language)
9. `/tools/youtube-chapters` - Tool 8: YouTube Chapters Generator & Rule Validator
10. `/guide` - Subtitle Format Guide (SRT vs VTT vs SBV)
11. `/privacy` - Privacy Policy & 100% Client-Side Security Guarantee
12. `/terms` - Terms of Service
13. `/contact` - Contact & Bug Feedback
14. `/about` - About SubForge

## Existing Dependencies
- `@google/genai`: ^2.4.0
- `@tailwindcss/vite`: ^4.3.3
- `@vitejs/plugin-react`: ^6.1.1
- `lucide-react`: ^0.546.0
- `react`: ^19.0.1
- `react-dom`: ^19.0.1
- `vite`: ^8.3.0
- `express`: ^4.21.2
- `dotenv`: ^17.2.3
- `motion`: ^12.23.24

## Rollback Procedure
If any breaking regression occurs, original route files in `/src/pages/` and core parsers in `/src/utils/` can be restored directly. All existing deterministic subtitle conversion, parsing, and serialization functions remain untouched.
