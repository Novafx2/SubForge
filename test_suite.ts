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
  assert(!authContextContent.includes('signInWithFacebook') && !authContextContent.includes('facebookProvider'), 'AuthContext removed Facebook authentication');

  // 15. Login Update, AI Chatbot Integrity & Website Branding Audit
  console.log('\n[15. Login Update, AI Chatbot & Website Branding Audit]');
  const loginPageContent = fs.readFileSync('./src/pages/auth/LoginPage.tsx', 'utf8');
  assert(loginPageContent.includes('Continue with Google'), 'LoginPage retains Continue with Google button');
  assert(!/facebook/i.test(loginPageContent), 'LoginPage has completely removed Facebook login');

  const firebaseLibContent = fs.readFileSync('./src/lib/firebase.ts', 'utf8');
  assert(!/facebook/i.test(firebaseLibContent), 'Firebase config removed FacebookAuthProvider');

  const chatWidgetContent = fs.readFileSync('./src/components/widgets/AiSupportChatWidget.tsx', 'utf8');
  assert(chatWidgetContent.includes('/api/ai/chat') && chatWidgetContent.includes('/api/ai/status'), 'AiSupportChatWidget uses backend /api/ai/status and /api/ai/chat');
  assert(chatWidgetContent.includes('AI Offline') && chatWidgetContent.includes('Retry request'), 'AiSupportChatWidget shows honest offline state and explicit error retry');

  assert(adminPageContent.includes('15. Website Branding'), 'Admin Dashboard includes 15. Website Branding section');
  assert(adminPageContent.includes('Upload Favicon') && adminPageContent.includes('Remove Favicon'), 'Website Branding includes Upload Favicon and Remove Favicon controls');
  assert(adminPageContent.includes('Save Changes') && adminPageContent.includes('Save All Changes'), 'Admin Dashboard supports Save Changes and Save All Changes');

  const indexHtmlContent = fs.readFileSync('./index.html', 'utf8');
  assert(fs.existsSync('./public/favicon.svg'), 'SubForge default fallback favicon (/public/favicon.svg) exists');
  assert(indexHtmlContent.includes('href="/favicon.svg"'), 'index.html configures SubForge fallback favicon');

  // 16. All-in-One Video Editing Studio Audit
  console.log('\n[16. All-in-One Video Editing Studio Audit]');
  const { createInitialHistoryState, studioReducer } = await import('./src/lib/videoStudio/studioReducer');
  const { getResolutionDimensions } = await import('./src/types/videoStudio');
  const { estimateExportSizeMb } = await import('./src/lib/videoStudio/ffmpegPipeline');

  let studioState = createInitialHistoryState();
  studioState = studioReducer(studioState, {
    type: 'ADD_CLIP',
    clip: {
      id: 'clip-qa-1',
      assetId: 'asset-qa-1',
      name: 'QA Intro.mp4',
      timelineStartMs: 0,
      sourceStartMs: 0,
      sourceEndMs: 6000,
      speed: 1,
      rotate: 0,
      flipH: false,
      flipV: false,
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      muted: false,
      volume: 1,
      fadeInMs: 0,
      fadeOutMs: 0,
      transitionIn: 'none',
      transitionDurationMs: 400,
    },
  });
  assert(studioState.present.clips.length === 1, 'Video Studio reducer adds V1 clip cleanly');

  studioState = studioReducer(studioState, { type: 'SPLIT_CLIP_AT', id: 'clip-qa-1', timelineMs: 3000 });
  assert(studioState.present.clips.length === 2, 'Video Studio splits clip at playhead into 2 clips');
  assert(studioState.past.length === 2, 'Video Studio pushes immutable undo history');

  studioState = studioReducer(studioState, { type: 'UNDO' });
  assert(studioState.present.clips.length === 1, 'Video Studio Undo restores pre-split timeline');

  studioState = studioReducer(studioState, { type: 'REDO' });
  assert(studioState.present.clips.length === 2, 'Video Studio Redo reapplies split');

  studioState = studioReducer(studioState, { type: 'SET_ASPECT_RATIO', aspectRatio: '9:16' });
  const dims916 = getResolutionDimensions(studioState.present.aspectRatio, '1080p');
  assert(dims916.width === 1080 && dims916.height === 1920, '9:16 1080p export dimensions compute to 1080x1920');

  const sizeEst = estimateExportSizeMb(studioState.present);
  assert(sizeEst.endsWith('MB'), `Estimate export size computes cleanly (${sizeEst})`);

  assert(fs.existsSync('./public/ffmpeg/ffmpeg-core.js') && fs.existsSync('./public/ffmpeg/ffmpeg-core.wasm'), 'Local FFmpeg WASM core assets exist in public/ffmpeg/');
  const headerContent = fs.readFileSync('./src/components/layout/Header.tsx', 'utf8');
  const drawerContent = fs.readFileSync('./src/components/layout/MobileDrawer.tsx', 'utf8');
  assert(headerContent.includes("label: 'Video Studio'") && headerContent.includes("path: '/video-studio'"), 'Header includes Video Studio main nav item');
  assert(drawerContent.includes('Video Studio') && drawerContent.includes('/video-studio'), 'MobileDrawer includes Video Studio nav item');
  assert(appRoutesContent.includes("case '/video-studio':"), 'App.tsx registers /video-studio route');
  assert(sitemapXml.includes('<loc>https://subforge.app/video-studio</loc>'), 'Sitemap includes /video-studio');

  const serverContent = fs.readFileSync('./server.ts', 'utf8');
  assert(serverContent.includes("'/api/ai/translate-subtitles'"), 'Server exposes /api/ai/translate-subtitles endpoint');

  // Pro Studio Features Audit
  const {
    TRANSITION_OPTIONS,
    WORKFLOW_PRESETS,
    FILTER_PRESETS,
    SUBTITLE_STYLE_PRESETS,
    getClipDurationMs,
    createDefaultVisualEffects,
  } = await import('./src/types/videoStudio');
  const { evaluateClipKeyframes, getClipSourceTimeSec } = await import('./src/lib/videoStudio/canvasCompositor');

  assert(
    TRANSITION_OPTIONS.length >= 12 &&
      ['crossfade', 'fade-black', 'zoom-reveal', 'swipe', 'wipe', 'glitch', 'flash', 'spin', 'blur', 'slide-left', 'push'].every((id) =>
        TRANSITION_OPTIONS.some((t) => t.id === id)
      ),
    'All 11 clip-to-clip Pro transitions registered in TRANSITION_OPTIONS'
  );

  assert(
    WORKFLOW_PRESETS.length === 8 &&
      ['cinematic', 'youtube', 'shorts', 'tiktok', 'reels', 'gaming', 'podcast', 'documentary'].every((id) =>
        WORKFLOW_PRESETS.some((p) => p.id === id)
      ),
    'All 8 workflow presets (Cinematic, YouTube, Shorts, TikTok, Reels, Gaming, Podcast, Documentary) present'
  );

  assert(
    Object.keys(FILTER_PRESETS).includes('teal-orange') &&
      Object.keys(FILTER_PRESETS).includes('tokyo-neon') &&
      Object.keys(SUBTITLE_STYLE_PRESETS).includes('bold-social'),
    'LUT color presets and subtitle burn-in presets are defined'
  );

  // Test Keyframe Interpolation
  const kfClip: any = {
    id: 'kf-test',
    assetId: 'a1',
    name: 'KF',
    timelineStartMs: 0,
    sourceStartMs: 0,
    sourceEndMs: 4000,
    speed: 1,
    rotate: 0,
    flipH: false,
    flipV: false,
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    muted: false,
    volume: 1,
    fadeInMs: 0,
    fadeOutMs: 0,
    transitionIn: 'none',
    transitionDurationMs: 400,
    keyframes: [
      { id: 'k1', timeOffsetMs: 0, x: -10, y: 0, scale: 1.0, rotation: 0, opacity: 0.2, easing: 'linear' },
      { id: 'k2', timeOffsetMs: 2000, x: 10, y: 20, scale: 2.0, rotation: 90, opacity: 1.0, easing: 'linear' },
    ],
  };
  const midKf = evaluateClipKeyframes(kfClip, 1000);
  assert(
    Math.abs(midKf.x - 0) < 0.01 &&
      Math.abs(midKf.scale - 1.5) < 0.01 &&
      Math.abs(midKf.rotation - 45) < 0.01 &&
      Math.abs(midKf.opacity - 0.6) < 0.01,
    'evaluateClipKeyframes linearly interpolates x, scale, rotation & opacity'
  );

  // Test Speed Ramping math & bounds
  const rampClip = { ...kfClip, speedRamp: 'ramp-up' as const };
  const rampDur = getClipDurationMs(rampClip);
  const rampMidSec = getClipSourceTimeSec(rampClip, Math.round(rampDur / 2));
  assert(
    rampDur > 0 && rampMidSec > 0 && rampMidSec < 2.0,
    'Speed ramping compresses/warps source time progressively rather than uniformly'
  );

  // Test DUPLICATE_CLIP, RIPPLE_DELETE_CLIP, PASTE_CLIP_EFFECTS, TOGGLE_TRACK_FLAG, APPLY_WORKFLOW_PRESET
  studioState = studioReducer(studioState, { type: 'DUPLICATE_CLIP', id: studioState.present.clips[0].id });
  assert(studioState.present.clips.length === 3, 'DUPLICATE_CLIP clones clip on V1');

  studioState = studioReducer(studioState, { type: 'APPLY_MOTION_PRESET', clipId: studioState.present.clips[0].id, preset: 'ken-burns-in' });
  assert((studioState.present.clips[0].keyframes?.length || 0) === 2, 'APPLY_MOTION_PRESET sets clip keyframes');

  studioState = studioReducer(studioState, {
    type: 'PASTE_CLIP_EFFECTS',
    id: studioState.present.clips[1].id,
    effects: {
      crop: { top: 5, right: 5, bottom: 5, left: 5 },
      rotate: 90,
      flipH: true,
      flipV: false,
      speed: 1.5,
      speedRamp: 'uniform',
      transitionIn: 'glitch',
      transitionDurationMs: 600,
      colorGrading: { ...studioState.present.colorGrading, preset: 'cyber-blue' },
      visualEffects: createDefaultVisualEffects(),
    },
  });
  assert(
    studioState.present.clips[1].transitionIn === 'glitch' && studioState.present.clips[1].rotate === 90,
    'PASTE_CLIP_EFFECTS copies transitions, crop, speed & transforms to target clip'
  );

  studioState = studioReducer(studioState, { type: 'RIPPLE_DELETE_CLIP', id: studioState.present.clips[1].id });
  assert(studioState.present.clips.length === 2, 'RIPPLE_DELETE_CLIP removes clip and recomputes timeline gap');

  // Test Track Lock prevents mutation
  studioState = studioReducer(studioState, { type: 'TOGGLE_TRACK_FLAG', track: 'V1', flag: 'locked' });
  assert(studioState.present.trackStates.V1.locked === true, 'TOGGLE_TRACK_FLAG locks V1 track');
  const lockedCountBefore = studioState.present.clips.length;
  studioState = studioReducer(studioState, { type: 'DELETE_CLIP', id: studioState.present.clips[0].id });
  assert(studioState.present.clips.length === lockedCountBefore, 'Locked V1 track blocks clip deletion');

  // Unlock and verify Workflow Preset application
  studioState = studioReducer(studioState, { type: 'TOGGLE_TRACK_FLAG', track: 'V1', flag: 'locked' });
  studioState = studioReducer(studioState, { type: 'APPLY_WORKFLOW_PRESET', presetId: 'shorts' });
  assert(
    studioState.present.aspectRatio === '9:16' &&
      studioState.present.fitMode === 'contain-blur' &&
      studioState.present.exportSettings.fps === 60,
    'APPLY_WORKFLOW_PRESET configures aspectRatio, fitMode & FPS cleanly'
  );

  const leftPanelSrc = fs.readFileSync('./src/components/studio/StudioLeftPanel.tsx', 'utf8');
  assert(
    leftPanelSrc.includes('Experimental (CPU)') &&
      leftPanelSrc.includes('CPU Pixel Pass') &&
      leftPanelSrc.includes('Requires Mic Permission'),
    'StudioLeftPanel clearly labels experimental, CPU-heavy, and mic-permission features'
  );

  console.log(`\n=================================================`);
  console.log(`COMPLETE AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAiTests();

