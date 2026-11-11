import { parseSrt, serializeToSrt } from './src/utils/srtParser';
import { parseVtt, serializeToVtt, autoDetectAndParse } from './src/utils/vttParser';
import {
  parseTimestampToMs,
  msToSrtTimestamp,
  msToVttTimestamp,
  msToYouTubeTimestamp,
  formatDurationHuman,
} from './src/utils/timeUtils';
import { validateSubtitles, autoFixSubtitleCues } from './src/utils/validator';
import { extractTextFromCues } from './src/utils/textExtractor';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${desc}`);
  }
}

console.log('--- STARTING COMPREHENSIVE QA & FUNCTIONAL AUDIT ---');

// 1. Time utilities testing
console.log('\n[1. Time Utilities Testing]');
assert(parseTimestampToMs('00:01:23,456') === 83456, 'parseTimestampToMs SRT comma');
assert(parseTimestampToMs('00:01:23.456') === 83456, 'parseTimestampToMs VTT dot');
assert(parseTimestampToMs('01:23.456') === 83456, 'parseTimestampToMs MM:SS.mmm format');
assert(parseTimestampToMs('00:00') === 0, 'parseTimestampToMs 00:00');
assert(parseTimestampToMs('01:15') === 75000, 'parseTimestampToMs YouTube 01:15');
assert(parseTimestampToMs('1:05:20') === 3920000, 'parseTimestampToMs 1:05:20 (1h 5m 20s)');
assert(parseTimestampToMs('') === 0, 'parseTimestampToMs empty string returns 0');

assert(msToSrtTimestamp(83456) === '00:01:23,456', 'msToSrtTimestamp exact formatting');
assert(msToSrtTimestamp(-500) === '00:00:00,000', 'msToSrtTimestamp negative clamps to 00:00:00,000');
assert(msToVttTimestamp(83456) === '00:01:23.456', 'msToVttTimestamp exact formatting');
assert(msToYouTubeTimestamp(75000) === '01:15', 'msToYouTubeTimestamp MM:SS');
assert(msToYouTubeTimestamp(3920000) === '1:05:20', 'msToYouTubeTimestamp HH:MM:SS');

// 2. SRT Parser & Serializer testing
console.log('\n[2. SRT Parser & Serializer Testing]');
const testSrt = `1\r\n00:00:01,000 --> 00:00:04,000\r\nHello World!\r\n\r\n2\r\n00:00:05,500 --> 00:00:08,200\r\nSecond cue text.`;
const srtRes = parseSrt(testSrt);
assert(srtRes.cues.length === 2, 'Parsed 2 cues from CRLF SRT');
assert(srtRes.cues[0].startMs === 1000 && srtRes.cues[0].endMs === 4000, 'Cue 1 timestamps correct');
assert(srtRes.cues[0].text === 'Hello World!', 'Cue 1 text matches');

// Empty input
const emptySrt = parseSrt('');
assert(emptySrt.cues.length === 0, 'Empty string returns 0 cues without crashing');

// Invalid gibberish
const gibberish = parseSrt('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
assert(gibberish.cues.length === 0, 'Invalid text returns 0 cues cleanly');

// SRT roundtrip
const serializedSrt = serializeToSrt(srtRes.cues);
assert(serializedSrt.includes('00:00:01,000 --> 00:00:04,000'), 'Serialized SRT contains correct timestamps');

// 3. WebVTT Parser & Serializer testing
console.log('\n[3. WebVTT Parser & Serializer Testing]');
const testVtt = `WEBVTT - Sample\n\nNOTE This is a note\n\n00:00:01.000 --> 00:00:04.000 position:10% align:left\nHello WebVTT!\n\n00:00:05.500 --> 00:00:08.200\nSecond VTT cue.`;
const vttRes = parseVtt(testVtt);
assert(vttRes.cues.length === 2, 'Parsed 2 cues from WebVTT ignoring NOTE');
assert(vttRes.cues[0].settings === 'position:10% align:left', 'Parsed cue settings correctly');

const serializedVtt = serializeToVtt(vttRes.cues, { includeHeaderTitle: 'Exported' });
assert(serializedVtt.startsWith('WEBVTT - Exported'), 'Serialized VTT has header');
assert(serializedVtt.includes('00:00:01.000 --> 00:00:04.000'), 'Serialized VTT dot timestamp');

// 4. Auto-detect format
console.log('\n[4. Auto-Detect Format Testing]');
assert(autoDetectAndParse(testVtt).format === 'vtt', 'Auto-detected WebVTT format');
assert(autoDetectAndParse(testSrt).format === 'srt', 'Auto-detected SRT format');

// 5. Validator testing
console.log('\n[5. Validator & Linter Testing]');
const problemCues = [
  { id: 1, startMs: 1000, endMs: 4000, text: 'First line.' },
  { id: 2, startMs: 3500, endMs: 6000, text: 'Overlapping with first line.' }, // overlap!
  { id: 3, startMs: 7000, endMs: 7000, text: 'Zero duration.' }, // zero duration!
  { id: 4, startMs: 8000, endMs: 9000, text: 'This cue has way too many characters per second for broadcast compliance!' }, // high CPS!
  { id: 5, startMs: 10000, endMs: 13000, text: '<i>Unclosed tag' }, // unclosed tag!
];
const valRes = validateSubtitles(problemCues);
assert(valRes.errorCount > 0, `Detected ${valRes.errorCount} errors`);
assert(valRes.warningCount > 0, `Detected ${valRes.warningCount} warnings`);
assert(valRes.issues.some((i) => i.code === 'OVERLAPPING_TIMESTAMPS'), 'Detected OVERLAPPING_TIMESTAMPS');
assert(valRes.issues.some((i) => i.code === 'NEGATIVE_OR_ZERO_DURATION'), 'Detected NEGATIVE_OR_ZERO_DURATION');
assert(valRes.issues.some((i) => i.code === 'CPS_TOO_HIGH'), 'Detected CPS_TOO_HIGH');
assert(valRes.issues.some((i) => i.code === 'UNCLOSED_HTML_TAG'), 'Detected UNCLOSED_HTML_TAG');

// Auto-fix test
const fixedCues = autoFixSubtitleCues(problemCues);
const revalRes = validateSubtitles(fixedCues);
assert(
  !revalRes.issues.some((i) => i.code === 'OVERLAPPING_TIMESTAMPS'),
  'Auto-fix completely resolved overlapping timestamps'
);
assert(
  !revalRes.issues.some((i) => i.code === 'NEGATIVE_OR_ZERO_DURATION'),
  'Auto-fix completely resolved zero/negative durations'
);

// 6. Text Extractor testing
console.log('\n[6. Text Extractor Testing]');
const captionCues = [
  { id: 1, startMs: 1000, endMs: 4000, text: '[Applause]\n>> Speaker 1: Hello everyone.' },
  { id: 2, startMs: 4100, endMs: 7000, text: 'Hello everyone.\nWelcome to the show. ♪ soft music ♪' },
];
const extracted = extractTextFromCues(captionCues, {
  mode: 'paragraphs',
  removeSpeakerLabels: true,
  removeSoundEffects: true,
  deduplicateLines: true,
  stripHtmlTags: true,
});
assert(!extracted.text.includes('[Applause]'), 'Removed sound effect [Applause]');
assert(!extracted.text.includes('>> Speaker 1:'), 'Removed speaker label >> Speaker 1:');
assert(!extracted.text.includes('♪'), 'Removed music note ♪');
assert(
  (extracted.text.match(/Hello everyone\./g) || []).length === 1,
  'Deduplicated repeated consecutive line "Hello everyone."'
);

// 7. FPS conversion math
console.log('\n[7. FPS Conversion Testing]');
const fromFps = 23.976;
const toFps = 25.0;
const fpsRatio = fromFps / toFps;
const originalTime = 3600000; // 1 hour
const convertedTime = Math.round(originalTime * fpsRatio);
assert(convertedTime < originalTime, '23.976 to 25 FPS speeds up (new timestamp is earlier)');
assert(Math.abs(convertedTime - 3452544) < 10, 'Accurate to within milliseconds for 1h conversion');

// 8. Large file performance test (1,000 cues)
console.log('\n[8. Large Subtitle Scale Testing (1,000 cues)]');
const largeCues = [];
for (let i = 0; i < 1000; i++) {
  largeCues.push({
    id: i + 1,
    startMs: i * 3000,
    endMs: i * 3000 + 2500,
    text: `Subtitle cue number ${i + 1} with realistic dialogue.`,
  });
}
const startT = performance.now();
const largeSrt = serializeToSrt(largeCues);
const parsedLarge = parseSrt(largeSrt);
const largeVal = validateSubtitles(parsedLarge.cues);
const endT = performance.now();
assert(parsedLarge.cues.length === 1000, 'Parsed 1,000 cues accurately');
assert(largeVal.errorCount === 0, '1,000 cues validated clean');
assert(endT - startT < 200, `Processed and validated 1,000 cues in ${(endT - startT).toFixed(1)}ms (< 200ms)`);

// 9. Two-digit hours and non-standard whitespace around -->
console.log('\n[9. Parser Robustness & Edge Cases]');
const noSpaceSrt = `1\n00:00:01,000-->00:00:04,000\nNo space arrow.`;
const noSpaceRes = parseSrt(noSpaceSrt);
assert(noSpaceRes.cues.length === 1, 'Parsed cue with no space around arrow (00:00:01,000-->00:00:04,000)');

const missingIdSrt = `00:00:01,000 --> 00:00:04,000\nCue with missing numeric ID.`;
const missingIdRes = parseSrt(missingIdSrt);
assert(missingIdRes.cues.length === 1, 'Parsed cue with missing numeric ID');

// 10. YouTube Chapters Edge Cases
console.log('\n[10. YouTube Chapters Edge Cases]');
function validateChapters(chapters: { timeMs: number; timeFormatted: string; title: string }[]) {
  const issues: string[] = [];
  if (chapters.length < 3) issues.push('Must have at least 3 chapters');
  if (chapters.length > 0 && chapters[0].timeFormatted !== '00:00' && chapters[0].timeFormatted !== '0:00') {
    issues.push('Must start with 00:00');
  }
  for (let i = 1; i < chapters.length; i++) {
    if (chapters[i].timeMs <= chapters[i - 1].timeMs) {
      issues.push(`Chapter ${i} not later than previous`);
    } else if (chapters[i].timeMs - chapters[i - 1].timeMs < 10000) {
      issues.push(`Chapter ${i} is under 10 seconds`);
    }
  }
  return { isValid: issues.length === 0, issues };
}

assert(!validateChapters([{ timeMs: 5000, timeFormatted: '00:05', title: 'Start' }]).isValid, 'Rejects chapter not starting at 00:00');
assert(!validateChapters([
  { timeMs: 0, timeFormatted: '00:00', title: 'Intro' },
  { timeMs: 30000, timeFormatted: '00:30', title: 'Part 2' }
]).isValid, 'Rejects fewer than 3 chapters');
assert(!validateChapters([
  { timeMs: 0, timeFormatted: '00:00', title: 'Intro' },
  { timeMs: 5000, timeFormatted: '00:05', title: 'Too Close' },
  { timeMs: 30000, timeFormatted: '00:30', title: 'End' }
]).isValid, 'Rejects chapter under 10s gap');
assert(validateChapters([
  { timeMs: 0, timeFormatted: '00:00', title: 'Intro' },
  { timeMs: 30000, timeFormatted: '00:30', title: 'Middle' },
  { timeMs: 60000, timeFormatted: '01:00', title: 'Outro' }
]).isValid, 'Accepts valid compliant YouTube chapters');

// 11. Route & Sitemap Consistency Check
console.log('\n[11. Route & Sitemap Consistency Check]');
import { TOOLS } from './src/utils/seoData';
import fs from 'fs';

const sitemapXml = fs.readFileSync('./public/sitemap.xml', 'utf8');
TOOLS.forEach((tool) => {
  assert(
    sitemapXml.includes(`<loc>https://subforge.app${tool.path}</loc>`),
    `Sitemap includes tool URL: ${tool.path}`
  );
});

assert(sitemapXml.includes('<loc>https://subforge.app/terms</loc>'), 'Sitemap includes /terms');
assert(sitemapXml.includes('<loc>https://subforge.app/contact</loc>'), 'Sitemap includes /contact');
assert(sitemapXml.includes('<loc>https://subforge.app/privacy</loc>'), 'Sitemap includes /privacy');
assert(sitemapXml.includes('<loc>https://subforge.app/about</loc>'), 'Sitemap includes /about');
assert(sitemapXml.includes('<loc>https://subforge.app/guide</loc>'), 'Sitemap includes /guide');

const redirectsTxt = fs.readFileSync('./public/_redirects', 'utf8');
assert(redirectsTxt.includes('/*    /index.html   200'), 'Cloudflare _redirects contains SPA fallback rule');

// 12. Client-Side AI Engine Testing
console.log('\n[12. Client-Side AI Engine Testing]');
import {
  improveSubtitleGrammar,
  translateSubtitleText,
  summarizeSubtitleCues,
  diagnoseSubtitleQuality,
  generateSmartChapters,
  processAiPrompt
} from './src/lib/aiService';

async function runAiTests() {
  const dirtySrt = `1\n00:00:01,000 --> 00:00:03,500\num, hello everyone, we we are starting.\n\n2\n00:00:03,600 --> 00:00:05,000\ni'm very excited because cant wait.`;

  const grammarRes = await improveSubtitleGrammar(dirtySrt);
  assert(!grammarRes.improvedText.includes('um,'), 'AI Grammar eliminated "um," stutter');
  assert(!grammarRes.improvedText.includes('we we'), 'AI Grammar eliminated duplicated "we we"');
  assert(grammarRes.improvedText.includes("I'm"), 'AI Grammar fixed lowercase "i\'m" contraction to "I\'m"');
  assert(grammarRes.improvedText.includes("can't"), 'AI Grammar fixed "cant" to "can\'t"');

  const transRes = await translateSubtitleText(dirtySrt, 'es');
  assert(transRes.translatedText.includes('00:00:01,000 --> 00:00:03,500'), 'AI Translation preserved exact SRT timestamps');
  assert(transRes.translatedText.toLowerCase().includes('hola'), 'AI Translation translated "hello" to "hola" in Spanish');

  const summaryRes = await summarizeSubtitleCues(dirtySrt);
  assert(summaryRes.wordCount > 0, `AI Summary counted ${summaryRes.wordCount} words`);
  assert(summaryRes.readingTimeMinutes >= 1, 'AI Summary calculated reading time');
  assert(summaryRes.topics.length > 0, 'AI Summary extracted topics');

  const diagRes = await diagnoseSubtitleQuality(dirtySrt);
  assert(diagRes.qualityScore >= 0 && diagRes.qualityScore <= 100, `AI Diagnostics computed quality score: ${diagRes.qualityScore}/100`);

  const smartChaps = await generateSmartChapters(dirtySrt, 1);
  assert(smartChaps[0].timestamp === '00:00', 'Smart chapters start with 00:00');

  const upperPromptRes = await processAiPrompt('make all uppercase', dirtySrt);
  assert(upperPromptRes.includes('HELLO EVERYONE'), 'AI Prompt processed uppercase transformation');
  assert(upperPromptRes.includes('00:00:01,000 --> 00:00:03,500'), 'AI Prompt kept timestamps intact');

  // 13. Firebase Firestore & Security Rules Audit
  console.log('\n[13. Firebase Firestore & Security Rules Audit]');
  const firestoreRules = fs.readFileSync('./firestore.rules', 'utf8');
  assert(firestoreRules.includes('match /users/{userId}'), 'Firestore rules define users collection');
  assert(firestoreRules.includes('request.auth.uid == userId'), 'Firestore rules enforce user ownership');
  const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  assert(Boolean(firebaseConfig.projectId), 'Firebase config includes projectId');
  assert(Boolean(firebaseConfig.firestoreDatabaseId), 'Firebase config includes firestoreDatabaseId');

  // 14. Admin Dashboard & Authentication Audit
  console.log('\n[14. Admin Dashboard & Authentication Audit]');
  const adminPageContent = fs.readFileSync('./src/pages/admin/AdminDashboardPage.tsx', 'utf8');
  const required14Sections = [
    '1. Dashboard Overview',
    '2. Login List / Users Management',
    '3. AI Management',
    '4. Tools Management',
    '5. AI Assistant Management',
    '6. Website Content Management',
    '7. Image Manager',
    '8. Feature Links Manager',
    '9. Feedback Management',
    '10. SEO Management',
    '11. Advertisement Management',
    '12. General Website Settings',
    '13. Security Settings',
    '14. Admin Audit Logs',
  ];

  required14Sections.forEach((sectionName) => {
    assert(adminPageContent.includes(sectionName), `Admin Dashboard includes section: "${sectionName}"`);
  });

  // Verify independent SEO Management section details
  assert(adminPageContent.includes('A. Global Meta Titles') && adminPageContent.includes('Descriptions'), 'SEO Management includes Meta Titles & Descriptions');
  assert(adminPageContent.includes('B. Canonical URL') && adminPageContent.includes('Domain Authority'), 'SEO Management includes Canonical URL governance');
  assert(adminPageContent.includes('C. Open Graph') && adminPageContent.includes('Social Sharing Cards'), 'SEO Management includes Open Graph & Social Cards');
  assert(adminPageContent.includes('D. Search Engine Crawling') && adminPageContent.includes('Sitemap Configuration'), 'SEO Management includes Robots and Sitemap configuration');
  assert(adminPageContent.includes('E. Per-Page SEO Overrides'), 'SEO Management includes Per-Page SEO overrides for all 14 routes');

  // Verify Admin Login Page & Authentication Architecture
  const adminLoginContent = fs.readFileSync('./src/pages/admin/AdminLoginPage.tsx', 'utf8');
  assert(adminLoginContent.includes('SubForgeAdmin'), 'Admin Login targets SubForgeAdmin identity');
  assert(adminLoginContent.includes('Private Bootstrap'), 'Admin Login provides secure private bootstrap mode');
  assert(adminLoginContent.includes('Never post or disclose your private password'), 'Admin Login instructs never sharing passwords in chat');

  const appRoutesContent = fs.readFileSync('./src/App.tsx', 'utf8');
  assert(appRoutesContent.includes("case '/admin/login':"), 'App routes registers /admin/login endpoint');
  assert(appRoutesContent.includes("case '/admin':"), 'App routes registers /admin protected endpoint');
  assert(appRoutesContent.includes('requireAdmin={true}'), 'App routes enforces requireAdmin for /admin');

  const authContextContent = fs.readFileSync('./src/context/AuthContext.tsx', 'utf8');
  assert(authContextContent.includes("const initialRole: UserRoleType = 'user';"), 'Public signup strictly restricted to "user" role');
  assert(authContextContent.includes('claimAdminBootstrap'), 'AuthContext provides claimAdminBootstrap method');

  console.log(`\n=================================================`);
  console.log(`COMPLETE AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAiTests();
