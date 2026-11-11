import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

// ============================================================================
// SERVER-SIDE ADMIN AUTHENTICATION (Salted scrypt + HMAC-SHA256 HttpOnly Cookie)
// ============================================================================
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'subforge_admin_session';

function hashPassword(password: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, s, 64).toString('hex');
  return `${s}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

// Initial administrator credentials (hashed in memory, never stored in plaintext)
let adminUsername = process.env.ADMIN_USERNAME || 'hamza2007';
let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || hashPassword('hamza2007');

function createSessionToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: username,
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined): { sub: string; role: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.exp || Date.now() > decoded.exp) return null;
    if (decoded.role !== 'admin') return null;
    return { sub: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

function parseCookies(req: express.Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const result: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      result[k] = v;
    }
  });
  return result;
}

function requireAdminMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const cookies = parseCookies(req);
  const session = verifySessionToken(cookies[COOKIE_NAME]);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Administrator session required.' });
  }
  (req as any).adminUser = session;
  next();
}

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const userMatch =
    username.trim().length === adminUsername.length &&
    crypto.timingSafeEqual(Buffer.from(username.trim()), Buffer.from(adminUsername));
  const passMatch = verifyPassword(password, adminPasswordHash);

  if (!userMatch || !passMatch) {
    return res.status(401).json({ error: 'Invalid administrator username or password.' });
  }

  const token = createSessionToken(adminUsername);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`
  );
  return res.json({ authenticated: true, username: adminUsername, role: 'admin' });
});

// GET /api/admin/session
app.get('/api/admin/session', (req, res) => {
  const cookies = parseCookies(req);
  const session = verifySessionToken(cookies[COOKIE_NAME]);
  if (!session) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, username: session.sub, role: session.role });
});

// POST /api/admin/logout
app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res.json({ ok: true });
});

// POST /api/admin/change-password
app.post('/api/admin/change-password', requireAdminMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (!verifyPassword(currentPassword, adminPasswordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  adminPasswordHash = hashPassword(newPassword);
  return res.json({ ok: true, message: 'Administrator password updated.' });
});

// ============================================================================
// AI SUPPORT CHAT ENDPOINT (Gemini 2.5 Flash with graceful offline fallback)
// ============================================================================
function getLocalToolGuidance(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('vtt') && q.includes('srt')) {
    return 'To convert between SRT and WebVTT, visit either our SRT to VTT or VTT to SRT tool. Both tools operate 100% in-browser, preserve millisecond cue timing, and offer options to strip styling tags.';
  }
  if (q.includes('drift') || q.includes('fps') || q.includes('framerate') || q.includes('23.976') || q.includes('24') || q.includes('25')) {
    return 'Gradual audio-video drift is typically caused by framerate differences (e.g. 23.976 fps film to 25 fps PAL broadcast). Use our Subtitle FPS Converter to rescale cue timestamps automatically.';
  }
  if (q.includes('sync') || q.includes('delay') || q.includes('shift') || q.includes('timing')) {
    return 'To fix out-of-sync subtitles, use the Subtitle Timing Fixer. You can shift captions forward or backward with millisecond accuracy or apply a drift ratio.';
  }
  if (q.includes('youtube') || q.includes('chapter') || q.includes('timestamp')) {
    return 'Our YouTube Chapters Generator formats video timestamps that satisfy YouTube requirements: starts at 00:00, at least 3 chapters, and minimum 10-second spacing. You can also auto-detect chapters from uploaded subtitles.';
  }
  if (q.includes('validator') || q.includes('error') || q.includes('overlap') || q.includes('cps')) {
    return 'The Subtitle Syntax Validator audits files for overlapping timestamps, zero durations, and reading speed violations (CPS > 25). It includes a 1-click Auto-Fix button.';
  }
  if (q.includes('merge') || q.includes('dual') || q.includes('bilingual')) {
    return 'The Subtitle Merger combines two subtitle files into either a sequential timeline or a simultaneous dual-language bilingual track for localization.';
  }
  if (q.includes('text') || q.includes('extract') || q.includes('transcript')) {
    return 'The Subtitle Text Extractor removes timestamps, numbers, and sound effects to produce clean readable prose paragraphs or lines.';
  }
  return 'SubForge offers 8 professional in-browser creator utilities: SRT to VTT, VTT to SRT, Timing Fixer, FPS Converter, Syntax Validator, Text Extractor, Bilingual Merger, and YouTube Chapters Generator. All processing occurs 100% locally in your browser with zero server uploads.';
}

// ============================================================================
// AI SUPPORT & YOUTUBE CHAPTERS ENGINE (Gemini 3.8 Flash + Resilient 35s Timeout & 2 Retries)
// ============================================================================
interface GeminiCallOptions {
  systemInstruction?: string;
  timeoutMs?: number; // default 35000 (35s)
  maxRetries?: number; // default 2
}

// In-flight request deduplication map to prevent repeated concurrent calls
const inFlightRequests = new Map<string, Promise<{ text: string; model: string }>>();

async function callGeminiWithRetry(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }

  const timeoutMs = options.timeoutMs ?? 40000;
  const maxRetries = options.maxRetries ?? 2;

  // Deduplication cache key
  const cacheKey = crypto
    .createHash('sha256')
    .update(`${options.systemInstruction || ''}:::${prompt}`)
    .digest('hex');

  const existing = inFlightRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const executionPromise = (async () => {
    const { GoogleGenAI, ThinkingLevel } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const candidateModels = [
      { id: 'gemini-3.8-flash', label: 'Google Gemini 3.8 Flash', thinking: true },
      { id: 'gemini-3.1-flash-lite', label: 'Google Gemini 3.1 Flash Lite', thinking: false },
    ];

    let lastError: any = null;

    for (const targetModel of candidateModels) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        let timerId: NodeJS.Timeout | null = null;
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timerId = setTimeout(() => {
              reject(new Error(`AI response timed out (${Math.round(timeoutMs / 1000)}s)`));
            }, timeoutMs);
          });

          const config: any = {};
          if (options.systemInstruction) {
            config.systemInstruction = options.systemInstruction;
          }
          if (targetModel.thinking) {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const apiPromise = ai.models.generateContent({
            model: targetModel.id,
            contents: prompt,
            config: Object.keys(config).length > 0 ? config : undefined,
          });

          const response = (await Promise.race([apiPromise, timeoutPromise])) as any;
          if (timerId) clearTimeout(timerId);

          const text = response.text || '';
          if (text) {
            return { text, model: targetModel.label };
          }
        } catch (err: any) {
          if (timerId) clearTimeout(timerId);
          lastError = err;
          const status = err?.status || err?.code || err?.error?.code || err?.error?.status;
          const msg = String(err?.message || err?.error?.message || err || '');

          const isQuotaOrNotFound =
            status === 429 ||
            status === 404 ||
            status === 'RESOURCE_EXHAUSTED' ||
            status === 'NOT_FOUND' ||
            msg.includes('quota') ||
            msg.includes('RESOURCE_EXHAUSTED');

          // If quota exhausted or model not available on this model, switch immediately to candidate fallback model
          if (isQuotaOrNotFound) {
            break;
          }

          const isTemporary =
            status === 503 ||
            status === 504 ||
            status === 502 ||
            status === 'DEADLINE_EXCEEDED' ||
            status === 'UNAVAILABLE' ||
            msg.includes('high demand') ||
            msg.includes('timed out') ||
            msg.includes('DEADLINE_EXCEEDED') ||
            msg.includes('Deadline expired') ||
            msg.includes('ECONNRESET') ||
            msg.includes('ETIMEDOUT');

          if (attempt < maxRetries && isTemporary) {
            const backoff = (attempt + 1) * 1500;
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
          break;
        }
      }
    }

    throw lastError || new Error('Gemini API call failed after retries.');
  })();

  inFlightRequests.set(cacheKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

interface ParsedChapter {
  id: string;
  timeMs: number;
  timeFormatted: string;
  title: string;
}

function parseAndValidateYouTubeChapters(rawText: string, fallbackDialogue?: string): ParsedChapter[] {
  const lines = rawText.split('\n');
  const chapters: ParsedChapter[] = [];
  const timestampRegex = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[-–—:]?\s*(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cleanLine = trimmed.replace(/^\d+[\.\)]\s*/, '');
    const match = cleanLine.match(timestampRegex);
    if (match) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      let title = match[4].replace(/^[:\-–—\s]+/, '').trim();
      title = title.replace(/\*+/g, '').trim();

      const timeMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
      const timeFormatted =
        hours > 0
          ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      chapters.push({
        id: `chap-${chapters.length}`,
        timeMs,
        timeFormatted,
        title: title || `Chapter ${chapters.length + 1}`,
      });
    }
  }

  // 1. YouTube Requirement: First chapter MUST start at 00:00
  if (chapters.length === 0 || chapters[0].timeMs !== 0) {
    chapters.unshift({
      id: 'chap-0-intro',
      timeMs: 0,
      timeFormatted: '00:00',
      title: 'Introduction & Overview',
    });
  }

  // Sort chronologically
  chapters.sort((a, b) => a.timeMs - b.timeMs);

  // 2. YouTube Requirement: Minimum 10 seconds between chapters
  const validChapters: ParsedChapter[] = [chapters[0]];
  for (let i = 1; i < chapters.length; i++) {
    const prev = validChapters[validChapters.length - 1];
    if (chapters[i].timeMs - prev.timeMs >= 10000) {
      validChapters.push(chapters[i]);
    }
  }

  // 3. YouTube Requirement: At least 3 chapters
  if (validChapters.length < 3) {
    const defaults = [
      { ms: 60000, formatted: '01:00', title: 'Key Concepts & Demonstration' },
      { ms: 180000, formatted: '03:00', title: 'Advanced Tips & Summary' },
    ];
    for (const def of defaults) {
      if (validChapters.length < 3) {
        const last = validChapters[validChapters.length - 1];
        const nextMs = Math.max(last.timeMs + 30000, def.ms);
        const m = Math.floor(nextMs / 60000);
        const s = Math.floor((nextMs % 60000) / 1000);
        validChapters.push({
          id: `chap-pad-${validChapters.length}`,
          timeMs: nextMs,
          timeFormatted: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
          title: def.title,
        });
      }
    }
  }

  return validChapters;
}

function extractOfflineChaptersFromSubtitles(content: string): ParsedChapter[] {
  const cueRegex = /(\d{2}):(\d{2}):(\d{2})[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}\r?\n([\s\S]*?)(?=\r?\n\r?\n|\s*$)/g;
  let match;
  const chapters: ParsedChapter[] = [];

  chapters.push({
    id: 'ch-0',
    timeMs: 0,
    timeFormatted: '00:00',
    title: 'Introduction & Overview',
  });

  let lastTimeMs = 0;
  let count = 1;

  while ((match = cueRegex.exec(content)) !== null) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseInt(match[3], 10);
    const currentMs = (h * 3600 + m * 60 + s) * 1000;

    if (currentMs - lastTimeMs >= 60000 && chapters.length < 15) {
      let snippet = match[4].replace(/<\/?[^>]+(>|$)/g, '').split('\n')[0].trim();
      snippet = snippet.replace(/^[a-z0-9\s_-]+:\s*/i, '');
      if (snippet.length > 40) snippet = snippet.slice(0, 37).trim() + '...';

      const timeFormatted =
        h > 0
          ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      chapters.push({
        id: `ch-${count++}`,
        timeMs: currentMs,
        timeFormatted,
        title: snippet || `Key Section ${chapters.length + 1}`,
      });
      lastTimeMs = currentMs;
    }
  }

  // Ensure minimum 3 chapters
  if (chapters.length < 3) {
    chapters.push(
      { id: 'ch-pad-1', timeMs: 75000, timeFormatted: '01:15', title: 'Main Discussion & Tutorial' },
      { id: 'ch-pad-2', timeMs: 180000, timeFormatted: '03:00', title: 'Conclusion & Summary' }
    );
  }

  return chapters;
}

// POST /api/ai/chat
app.post('/api/ai/chat', async (req, res) => {
  const { messages, message } = req.body || {};
  const userPrompt = (message || (Array.isArray(messages) && messages[messages.length - 1]?.content) || '').trim();
  if (!userPrompt) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const localHelp = getLocalToolGuidance(userPrompt);
    return res.json({
      configured: false,
      isLiveAi: false,
      provider: 'SubForge Offline Knowledge Engine',
      message: `${localHelp}\n\n[Note: Live LLM generation is currently offline because GEMINI_API_KEY is not set in the server environment. Add GEMINI_API_KEY to enable full conversational AI.]`,
    });
  }

  try {
    const result = await callGeminiWithRetry(userPrompt, {
      systemInstruction:
        'You are the SubForge AI Support Engineer. SubForge is an in-browser platform providing 8 core video creator utilities: SRT to VTT Converter, VTT to SRT Converter, Subtitle Timing Fixer, Subtitle FPS Converter, Subtitle Syntax Validator, Subtitle Text Extractor, Subtitle Merger (Bilingual), and YouTube Chapters Generator. The platform operates 100% client-side with zero server file uploads. Provide concise, expert advice on subtitle formatting, framerate sync (23.976 to 25 fps, 29.97 fps), WCAG accessibility standards, and video SEO. Keep answers professional, practical, and under 3 paragraphs.',
      timeoutMs: 35000,
      maxRetries: 2,
    });

    return res.json({
      configured: true,
      isLiveAi: true,
      provider: result.model,
      message: result.text || 'I have analyzed your request regarding SubForge subtitle tools.',
    });
  } catch (err: any) {
    const localHelp = getLocalToolGuidance(userPrompt);
    return res.json({
      configured: false,
      isLiveAi: false,
      provider: 'SubForge Offline Knowledge Engine (API Fallback)',
      message: `${localHelp}\n\n[Note: Gemini API unavailable (${err?.message || 'timeout'}). Operating in offline mode.]`,
    });
  }
});

// POST /api/ai/chapters - Dedicated YouTube Chapters Generator
app.post('/api/ai/chapters', async (req, res) => {
  const { content, intervalMinutes } = req.body || {};
  const subtitleContent = typeof content === 'string' ? content.trim() : '';

  if (!subtitleContent) {
    return res.status(400).json({ error: 'Subtitle or transcript content is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const targetGap = typeof intervalMinutes === 'number' && intervalMinutes > 0 ? intervalMinutes : 2;

  // If no Gemini key is provided, perform offline chapter detection directly
  if (!apiKey) {
    const offlineChapters = extractOfflineChaptersFromSubtitles(subtitleContent);
    const rawText = offlineChapters.map((c) => `${c.timeFormatted} ${c.title}`).join('\n');
    return res.json({
      configured: false,
      isLiveAi: false,
      provider: 'SubForge Offline Subtitle Engine',
      fallbackNotice: 'Generated via Local Subtitle Detection (Offline Mode: GEMINI_API_KEY not configured).',
      chapters: offlineChapters,
      rawText,
    });
  }

  const prompt = `Analyze the following subtitle file/transcript cues and synthesize a set of high-converting, SEO-optimized YouTube video chapters.
Target interval between chapters: approximately ${targetGap} minutes.

STRICT YOUTUBE RULES:
1. The first chapter MUST start at 00:00 (e.g. "00:00 Introduction & Overview").
2. Produce at least 3 chapters and no more than 15 chapters.
3. Every chapter must be separated by at least 10 seconds.
4. Each line must strictly follow the format:
MM:SS Chapter Title
or
HH:MM:SS Chapter Title
5. Generate clear, descriptive, professional titles that reflect the topic changes in the speech.
6. Output ONLY the timestamp lines. Do NOT include markdown code blocks, numbers, bullet points, or commentary.

SUBTITLE TRANSCRIPT:
${subtitleContent.slice(0, 15000)}`;

  try {
    const result = await callGeminiWithRetry(prompt, {
      systemInstruction:
        'You are a professional YouTube video editor and video SEO specialist. Generate compliant, engaging YouTube video chapters from subtitle transcripts adhering strictly to YouTube timestamp guidelines.',
      timeoutMs: 35000,
      maxRetries: 2,
    });

    const validatedChapters = parseAndValidateYouTubeChapters(result.text, subtitleContent);
    const rawText = validatedChapters.map((c) => `${c.timeFormatted} ${c.title}`).join('\n');

    return res.json({
      configured: true,
      isLiveAi: true,
      provider: result.model,
      chapters: validatedChapters,
      rawText,
    });
  } catch (err: any) {
    // Graceful offline fallback on timeout or API error
    const offlineChapters = extractOfflineChaptersFromSubtitles(subtitleContent);
    const rawText = offlineChapters.map((c) => `${c.timeFormatted} ${c.title}`).join('\n');
    let cleanErr = 'temporary delay';
    try {
      const msg = err?.message || '';
      if (msg.startsWith('{') && msg.endsWith('}')) {
        const parsed = JSON.parse(msg);
        cleanErr = parsed?.error?.message || parsed?.message || msg;
      } else if (msg) {
        cleanErr = msg;
      }
    } catch {
      cleanErr = err?.message || 'request timed out';
    }

    return res.json({
      configured: false,
      isLiveAi: false,
      provider: 'SubForge Offline Subtitle Engine (Fallback)',
      fallbackNotice: `Generated via Local Subtitle Detection (Offline Mode: Gemini API ${cleanErr}).`,
      chapters: offlineChapters,
      rawText,
    });
  }
});

// ============================================================================
// VITE / STATIC SERVING
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const publicPath = path.resolve(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SubForge server running on http://0.0.0.0:${port}`);
  });
}

startServer();
