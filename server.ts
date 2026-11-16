import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));

// ============================================================================
// PERSISTENT STORAGE DIRECTORY (.subforge-data/)
// ============================================================================
const DATA_DIR = path.resolve(__dirname, '.subforge-data');
const SETTINGS_FILE = path.join(DATA_DIR, 'site-settings.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const SESSION_SECRET_FILE = path.join(DATA_DIR, 'session.secret');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface PersistedBranding {
  customFaviconDataUrl: string | null;
  customFaviconMimeType: string | null;
  customFaviconName: string | null;
  siteName?: string;
  updatedAt: string | null;
}

interface PersistedFeedbackItem {
  id: string;
  name?: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  status: 'unread' | 'reviewed' | 'resolved';
}

interface PersistedSiteSettings {
  branding: PersistedBranding;
  adminConfig?: Record<string, any>;
  adminSecurity?: {
    passwordHash?: string;
    updatedAt?: string;
  };
  updatedAt: string | null;
}

const DEFAULT_BRANDING: PersistedBranding = {
  customFaviconDataUrl: null,
  customFaviconMimeType: null,
  customFaviconName: null,
  siteName: 'SubForge',
  updatedAt: null,
};

function readSiteSettings(): PersistedSiteSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        branding: { ...DEFAULT_BRANDING, ...(parsed.branding || {}) },
        adminConfig: parsed.adminConfig || undefined,
        adminSecurity: parsed.adminSecurity || undefined,
        updatedAt: parsed.updatedAt || null,
      };
    }
  } catch (err) {
    console.warn('Failed to read site settings from disk:', err);
  }
  return { branding: { ...DEFAULT_BRANDING }, updatedAt: null };
}

function writeSiteSettings(next: PersistedSiteSettings) {
  try {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist site settings to disk:', err);
  }
}

function getOrCreateSessionSecret(): string {
  if (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.trim()) {
    return process.env.ADMIN_SESSION_SECRET.trim();
  }
  try {
    if (fs.existsSync(SESSION_SECRET_FILE)) {
      const existing = fs.readFileSync(SESSION_SECRET_FILE, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    ensureDataDir();
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SESSION_SECRET_FILE, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

// ============================================================================
// SERVER-SIDE ADMIN AUTHENTICATION (Salted scrypt + HMAC-SHA256 HttpOnly Cookie)
// ============================================================================
const SESSION_SECRET = getOrCreateSessionSecret();
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

// Initial administrator credentials (persisted hash > env hash > bootstrap default)
const adminUsername = process.env.ADMIN_USERNAME || 'SubForgeAdmin';
const persistedSettingsAtBoot = readSiteSettings();
let adminPasswordHash =
  persistedSettingsAtBoot.adminSecurity?.passwordHash ||
  process.env.ADMIN_PASSWORD_HASH ||
  hashPassword('hamza2007');

function isHttpsRequest(req: express.Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protoStr = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return Boolean(req.secure || (protoStr && protoStr.split(',')[0].trim() === 'https'));
}

function buildSessionCookieHeader(req: express.Request, value: string, maxAgeSeconds: number): string {
  const securePart = isHttpsRequest(req) ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${securePart}`;
}

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

function verifyBootstrapSecret(provided: string): boolean {
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();
  if (!expected) return false;
  const providedBuf = Buffer.from(provided.trim());
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
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
  res.setHeader('Set-Cookie', buildSessionCookieHeader(req, encodeURIComponent(token), 43200));
  return res.json({ authenticated: true, username: adminUsername, role: 'admin' });
});

// POST /api/admin/bootstrap - Claim admin session using server ADMIN_BOOTSTRAP_SECRET
app.post('/api/admin/bootstrap', (req, res) => {
  if (!process.env.ADMIN_BOOTSTRAP_SECRET?.trim()) {
    return res.status(503).json({
      error: 'ADMIN_BOOTSTRAP_SECRET is not configured in server environment variables.',
    });
  }
  const { secretKey } = req.body || {};
  if (typeof secretKey !== 'string' || !secretKey.trim()) {
    return res.status(400).json({ error: 'Bootstrap secret key is required.' });
  }
  if (!verifyBootstrapSecret(secretKey)) {
    return res.status(401).json({ error: 'Invalid ADMIN_BOOTSTRAP_SECRET.' });
  }

  const token = createSessionToken(adminUsername);
  res.setHeader('Set-Cookie', buildSessionCookieHeader(req, encodeURIComponent(token), 43200));
  return res.json({
    authenticated: true,
    username: adminUsername,
    role: 'admin',
    message: 'Administrator bootstrap session verified.',
  });
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
app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', buildSessionCookieHeader(req, '', 0));
  return res.json({ ok: true });
});

function persistAdminPasswordHash(newHash: string) {
  adminPasswordHash = newHash;
  const current = readSiteSettings();
  const now = new Date().toISOString();
  writeSiteSettings({
    ...current,
    adminSecurity: {
      passwordHash: newHash,
      updatedAt: now,
    },
    updatedAt: now,
  });
}

// POST /api/admin/change-password
app.post('/api/admin/change-password', requireAdminMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (!verifyPassword(currentPassword, adminPasswordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  persistAdminPasswordHash(hashPassword(newPassword));
  return res.json({ ok: true, message: 'Administrator password updated and persisted.' });
});

// POST /api/admin/rotate-password - Rotate password via ADMIN_BOOTSTRAP_SECRET
app.post('/api/admin/rotate-password', requireAdminMiddleware, (req, res) => {
  if (!process.env.ADMIN_BOOTSTRAP_SECRET?.trim()) {
    return res.status(503).json({
      error: 'ADMIN_BOOTSTRAP_SECRET is not configured in server environment variables.',
    });
  }
  const { bootstrapSecretKey, newPassword } = req.body || {};
  if (typeof bootstrapSecretKey !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Bootstrap secret key and new password are required.' });
  }
  if (!verifyBootstrapSecret(bootstrapSecretKey)) {
    return res.status(401).json({ error: 'Invalid ADMIN_BOOTSTRAP_SECRET.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  persistAdminPasswordHash(hashPassword(newPassword));
  return res.json({ ok: true, message: 'Administrator credentials rotated and persisted successfully!' });
});

const ALLOWED_FAVICON_MIME_TYPES = new Set([
  'image/png',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
]);

function validateFaviconPayload(dataUrl: unknown, mimeType: unknown, fileName: unknown): { ok: true; dataUrl: string; mimeType: string; fileName: string } | { ok: false; error: string } {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return { ok: false, error: 'Invalid favicon data URL.' };
  }
  if (dataUrl.length > 2_000_000) {
    return { ok: false, error: 'Favicon file is too large. Please upload an icon under 1.5 MB.' };
  }
  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return { ok: false, error: 'Favicon must be a valid base64-encoded PNG, ICO, or SVG file.' };
  }
  const detectedMime = match[1].toLowerCase();
  const normalizedMime = typeof mimeType === 'string' && ALLOWED_FAVICON_MIME_TYPES.has(mimeType.toLowerCase())
    ? mimeType.toLowerCase()
    : detectedMime;

  if (!ALLOWED_FAVICON_MIME_TYPES.has(normalizedMime) && !ALLOWED_FAVICON_MIME_TYPES.has(detectedMime)) {
    return { ok: false, error: 'Unsupported favicon format. Allowed types: PNG, ICO, or SVG.' };
  }

  const safeName = typeof fileName === 'string' && fileName.trim()
    ? fileName.trim().slice(0, 120)
    : 'custom-favicon';

  return {
    ok: true,
    dataUrl,
    mimeType: ALLOWED_FAVICON_MIME_TYPES.has(detectedMime) ? detectedMime : normalizedMime,
    fileName: safeName,
  };
}

// Serve uploaded custom favicon at /favicon.ico or fallback to SubForge /public/favicon.svg
app.get('/favicon.ico', (_req, res) => {
  const settings = readSiteSettings();
  const customUrl = settings.branding.customFaviconDataUrl;
  if (customUrl) {
    const match = customUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      const buf = Buffer.from(match[2], 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return res.send(buf);
    }
  }
  const fallbackSvg = path.resolve(__dirname, 'public', 'favicon.svg');
  if (fs.existsSync(fallbackSvg)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    return res.sendFile(fallbackSvg);
  }
  return res.status(404).end();
});

// Public endpoint to retrieve current website branding (favicon & site name)
app.get('/api/branding', (_req, res) => {
  const settings = readSiteSettings();
  res.setHeader('Cache-Control', 'no-store');
  return res.json(settings.branding);
});

// Admin endpoint to upload/save custom favicon
app.post('/api/admin/branding', requireAdminMiddleware, (req, res) => {
  const { faviconDataUrl, faviconMimeType, faviconFileName, siteName } = req.body || {};
  const validated = validateFaviconPayload(faviconDataUrl, faviconMimeType, faviconFileName);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  const current = readSiteSettings();
  const now = new Date().toISOString();
  const updatedBranding: PersistedBranding = {
    customFaviconDataUrl: validated.dataUrl,
    customFaviconMimeType: validated.mimeType,
    customFaviconName: validated.fileName,
    siteName: typeof siteName === 'string' && siteName.trim() ? siteName.trim().slice(0, 80) : current.branding.siteName || 'SubForge',
    updatedAt: now,
  };
  writeSiteSettings({
    ...current,
    branding: updatedBranding,
    updatedAt: now,
  });

  return res.json({ ok: true, branding: updatedBranding });
});

// Admin endpoint to remove custom favicon and revert to SubForge fallback
app.delete('/api/admin/branding', requireAdminMiddleware, (_req, res) => {
  const current = readSiteSettings();
  const now = new Date().toISOString();
  const updatedBranding: PersistedBranding = {
    ...DEFAULT_BRANDING,
    siteName: current.branding.siteName || 'SubForge',
    updatedAt: now,
  };
  writeSiteSettings({
    ...current,
    branding: updatedBranding,
    updatedAt: now,
  });

  return res.json({ ok: true, branding: updatedBranding });
});

// Admin endpoints to persist & load all Admin Dashboard settings ("Save All Changes")
app.get('/api/admin/settings', requireAdminMiddleware, (_req, res) => {
  const settings = readSiteSettings();
  return res.json({
    branding: settings.branding,
    adminConfig: settings.adminConfig,
    updatedAt: settings.updatedAt,
  });
});

app.post('/api/admin/settings', requireAdminMiddleware, (req, res) => {
  const { branding, adminConfig } = req.body || {};
  const current = readSiteSettings();
  const now = new Date().toISOString();

  let nextBranding = current.branding;
  if (branding && typeof branding === 'object') {
    if (branding.customFaviconDataUrl === null) {
      nextBranding = {
        ...DEFAULT_BRANDING,
        siteName: typeof branding.siteName === 'string' ? branding.siteName.slice(0, 80) : current.branding.siteName || 'SubForge',
        updatedAt: now,
      };
    } else if (typeof branding.customFaviconDataUrl === 'string') {
      const validated = validateFaviconPayload(
        branding.customFaviconDataUrl,
        branding.customFaviconMimeType,
        branding.customFaviconName
      );
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }
      nextBranding = {
        customFaviconDataUrl: validated.dataUrl,
        customFaviconMimeType: validated.mimeType,
        customFaviconName: validated.fileName,
        siteName: typeof branding.siteName === 'string' ? branding.siteName.slice(0, 80) : current.branding.siteName || 'SubForge',
        updatedAt: now,
      };
    } else if (typeof branding.siteName === 'string' && branding.siteName.trim()) {
      nextBranding = {
        ...current.branding,
        siteName: branding.siteName.trim().slice(0, 80),
        updatedAt: now,
      };
    }
  }

  const nextSettings: PersistedSiteSettings = {
    ...current,
    branding: nextBranding,
    adminConfig: adminConfig && typeof adminConfig === 'object' ? adminConfig : current.adminConfig,
    updatedAt: now,
  };
  writeSiteSettings(nextSettings);

  return res.json({
    ok: true,
    settings: {
      branding: nextSettings.branding,
      adminConfig: nextSettings.adminConfig,
      updatedAt: nextSettings.updatedAt,
    },
  });
});

// Public site health & configuration endpoints
app.get('/api/health', (_req, res) => {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return res.json({
    ok: true,
    status: 'healthy',
    service: 'subforge',
    aiConfigured,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/site-config', (_req, res) => {
  const settings = readSiteSettings();
  const cfg = settings.adminConfig || {};
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    branding: settings.branding,
    contentConfig: cfg.contentConfig || null,
    generalConfig: cfg.generalConfig || null,
    toolSettings: cfg.toolSettings || null,
    adsConfig: cfg.adsConfig || null,
  });
});

// ============================================================================
// CONTACT & FEEDBACK SUBMISSIONS (.subforge-data/feedback.json)
// ============================================================================
const DEFAULT_FEEDBACK_SEED: PersistedFeedbackItem[] = [
  {
    id: 'fb-1',
    name: 'Indie Film Director',
    email: 'director@indiefilm.org',
    subject: 'Subtitle Merger Feedback',
    message: 'The bilingual dual-language merger saved our team hours on foreign festival subtitling!',
    date: '2026-11-02 08:30 UTC',
    status: 'reviewed',
  },
  {
    id: 'fb-2',
    name: 'Creator Support',
    email: 'creator@youtube.com',
    subject: 'Feature Request: 120 FPS',
    message: 'Could you add 120 FPS support in the FPS converter for high-framerate action cameras?',
    date: '2026-11-02 10:15 UTC',
    status: 'unread',
  },
  {
    id: 'fb-3',
    name: 'Accessibility Lead',
    email: 'accessibility@edutech.edu',
    subject: 'Validator Rule Inquiry',
    message: 'The 37 characters per line warning was extremely helpful for our WCAG AAA compliance checks.',
    date: '2026-11-02 11:20 UTC',
    status: 'resolved',
  },
];

function readFeedbackList(): PersistedFeedbackItem[] {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const raw = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to read feedback file:', err);
  }
  return [...DEFAULT_FEEDBACK_SEED];
}

function writeFeedbackList(items: PersistedFeedbackItem[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist feedback file:', err);
  }
}

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const cleanSubject = typeof subject === 'string' && subject.trim() ? subject.trim().slice(0, 120) : 'Feedback';
  const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!cleanMessage || cleanMessage.length < 5) {
    return res.status(400).json({ error: 'Please enter a message of at least 5 characters.' });
  }
  if (cleanMessage.length > 5000) {
    return res.status(400).json({ error: 'Message exceeds the 5,000 character limit.' });
  }

  const list = readFeedbackList();
  const entry: PersistedFeedbackItem = {
    id: `fb-${Date.now().toString(36)}`,
    ...(cleanName ? { name: cleanName } : {}),
    email: cleanEmail.slice(0, 160),
    subject: cleanSubject,
    message: cleanMessage,
    date: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    status: 'unread',
  };
  writeFeedbackList([entry, ...list].slice(0, 500));

  return res.status(201).json({ ok: true, id: entry.id, message: 'Feedback received successfully.' });
});

app.get('/api/admin/feedback', requireAdminMiddleware, (_req, res) => {
  return res.json({ items: readFeedbackList() });
});

app.patch('/api/admin/feedback/:id', requireAdminMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['unread', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  const list = readFeedbackList();
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Feedback entry not found.' });
  }
  list[idx] = { ...list[idx], status };
  writeFeedbackList(list);
  return res.json({ ok: true, item: list[idx] });
});

app.delete('/api/admin/feedback/:id', requireAdminMiddleware, (req, res) => {
  const { id } = req.params;
  const list = readFeedbackList();
  const next = list.filter((item) => item.id !== id);
  writeFeedbackList(next);
  return res.json({ ok: true });
});

// ============================================================================
// AI SUPPORT & YOUTUBE CHAPTERS ENGINE (Gemini 3.8 Flash + Fallback Model + Retry)
// ============================================================================
interface GeminiCallOptions {
  systemInstruction?: string;
  timeoutMs?: number; // default 40000 (40s)
  maxRetries?: number; // default 2
}

type GeminiContentPart = { text: string };
type GeminiTurn = { role: 'user' | 'model'; parts: GeminiContentPart[] };

// In-flight request deduplication map to prevent repeated concurrent calls
const inFlightRequests = new Map<string, Promise<{ text: string; model: string }>>();

async function callGeminiWithRetry(
  promptOrContents: string | GeminiTurn[],
  options: GeminiCallOptions = {}
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }

  const timeoutMs = options.timeoutMs ?? 40000;
  const maxRetries = options.maxRetries ?? 2;

  // Deduplication cache key
  const serializedPrompt =
    typeof promptOrContents === 'string' ? promptOrContents : JSON.stringify(promptOrContents);
  const cacheKey = crypto
    .createHash('sha256')
    .update(`${options.systemInstruction || ''}:::${serializedPrompt}`)
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
      { id: 'gemini-4-hydrogen', label: 'Google Gemini AI (Flash)', thinking: true },
      { id: 'gemini-3.1-flash-lite', label: 'Google Gemini AI (Flash Lite)', thinking: false },
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
            contents: promptOrContents,
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

// GET /api/ai/status - Honest AI backend status check (no fake online claims)
app.get('/api/ai/status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return res.json({
    configured: hasKey,
    online: hasKey,
    provider: hasKey ? 'Google Gemini AI (Backend)' : null,
  });
});

// POST /api/ai/chat - Multi-turn AI chatbot powered by Gemini on the backend
app.post('/api/ai/chat', async (req, res) => {
  const { messages, message } = req.body || {};

  // Build normalized conversation history
  const conversationTurns: GeminiTurn[] = [];
  if (Array.isArray(messages)) {
    for (const item of messages.slice(-14)) {
      const rawText = typeof item?.text === 'string' ? item.text : typeof item?.content === 'string' ? item.content : '';
      const trimmed = rawText.trim();
      if (!trimmed) continue;
      const role: 'user' | 'model' =
        item?.role === 'user' || item?.sender === 'user' ? 'user' : 'model';
      // Ensure alternating turns cleanly for Gemini contents array
      if (conversationTurns.length === 0 && role === 'model') {
        continue; // Skip leading welcome greeting so conversation begins with user turn
      }
      const prev = conversationTurns[conversationTurns.length - 1];
      if (prev && prev.role === role) {
        prev.parts[0].text += `\n\n${trimmed}`;
      } else {
        conversationTurns.push({ role, parts: [{ text: trimmed }] });
      }
    }
  }

  const explicitMessage = typeof message === 'string' ? message.trim() : '';
  if (explicitMessage) {
    const prev = conversationTurns[conversationTurns.length - 1];
    if (prev && prev.role === 'user') {
      if (prev.parts[0].text !== explicitMessage) {
        prev.parts[0].text = explicitMessage;
      }
    } else {
      conversationTurns.push({ role: 'user', parts: [{ text: explicitMessage }] });
    }
  }

  if (conversationTurns.length === 0 || conversationTurns[conversationTurns.length - 1].role !== 'user') {
    return res.status(400).json({
      error: 'Message content is required.',
      isLiveAi: false,
      offline: false,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(503).json({
      configured: false,
      isLiveAi: false,
      offline: true,
      error: 'AI chatbot is currently offline because the server AI API key is not configured.',
    });
  }

  try {
    const result = await callGeminiWithRetry(conversationTurns, {
      systemInstruction:
        'You are the SubForge AI Support & Video Editing Specialist. SubForge is a browser-based creator studio providing 8 privacy-first utilities: SRT to VTT Converter (/tools/srt-to-vtt), VTT to SRT Converter (/tools/vtt-to-srt), Subtitle Timing Fixer (/tools/timing-fixer), Subtitle FPS Converter (/tools/fps-converter), Subtitle Syntax Validator (/tools/validator), Subtitle Text Extractor (/tools/text-extractor), Subtitle Merger for sequential or dual-language bilingual tracks (/tools/merger), and YouTube Chapters Generator (/tools/youtube-chapters), plus the AI Subtitle Assistant (/ai-assistant). Help users with subtitles, SRT and WebVTT syntax, cue timing/sync, video editing workflows, framerate conversions (23.976, 24, 25, 29.97, 30, 60 fps), subtitle translation, reading speed (CPS) & WCAG accessibility, and SubForge tools. Keep answers clear, accurate, concise, and practical.',
      timeoutMs: 30000,
      maxRetries: 2,
    });

    if (!result.text || !result.text.trim()) {
      return res.status(502).json({
        configured: true,
        isLiveAi: false,
        offline: true,
        error: 'The AI service returned an empty response. Please try again.',
      });
    }

    return res.json({
      configured: true,
      isLiveAi: true,
      offline: false,
      provider: result.model,
      message: result.text.trim(),
    });
  } catch (err: any) {
    let cleanErr = 'Upstream AI request failed.';
    try {
      const msg = String(err?.message || '');
      if (msg.startsWith('{') && msg.endsWith('}')) {
        const parsed = JSON.parse(msg);
        cleanErr = parsed?.error?.message || parsed?.message || msg;
      } else if (msg) {
        cleanErr = msg;
      }
    } catch {
      cleanErr = String(err?.message || 'AI service unavailable.');
    }

    const isTimeout = cleanErr.toLowerCase().includes('timed out') || cleanErr.toLowerCase().includes('deadline');
    return res.status(isTimeout ? 504 : 503).json({
      configured: true,
      isLiveAi: false,
      offline: true,
      error: `AI chatbot could not reach the AI service (${cleanErr}). Please try again in a moment.`,
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

// POST /api/ai/translate-subtitles - Real server-side Gemini subtitle translation (never fakes AI output)
app.post('/api/ai/translate-subtitles', async (req, res) => {
  const { cues, targetLang, targetLangName } = req.body || {};

  if (!Array.isArray(cues) || cues.length === 0) {
    return res.status(400).json({
      error: 'At least one subtitle cue is required for translation.',
      isLiveAi: false,
    });
  }

  const normalizedLang = typeof targetLang === 'string' ? targetLang.trim() : '';
  if (!normalizedLang) {
    return res.status(400).json({
      error: 'Target language is required.',
      isLiveAi: false,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(503).json({
      configured: false,
      isLiveAi: false,
      offline: true,
      error: 'External AI Translation is unavailable because GEMINI_API_KEY is not configured on the server.',
    });
  }

  const sanitizedCues = cues.slice(0, 250).map((c: any, idx: number) => ({
    index: idx,
    text: String(c?.text || '').trim(),
  }));

  const languageLabel =
    typeof targetLangName === 'string' && targetLangName.trim()
      ? `${targetLangName.trim()} (${normalizedLang})`
      : normalizedLang;

  const prompt = `Translate the following subtitle cue dialogue lines accurately into ${languageLabel}.
Rules:
1. Keep the exact array length (${sanitizedCues.length} items) and matching "index" integer for every cue.
2. Preserve line breaks inside subtitles where natural, and keep subtitle phrasing concise for on-screen readability.
3. Return ONLY valid JSON in this exact shape (no markdown fences):
{"translations":[{"index":0,"text":"..."}]}

CUES:
${JSON.stringify(sanitizedCues)}`;

  try {
    const result = await callGeminiWithRetry(prompt, {
      systemInstruction:
        'You are a professional audiovisual subtitle localization translator. Output strict JSON containing translated subtitle cues matching every input index.',
      timeoutMs: 35000,
      maxRetries: 2,
    });

    let rawJson = result.text.trim();
    const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      rawJson = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(rawJson);
    const list: Array<{ index: number; text: string }> = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.translations)
      ? parsed.translations
      : [];

    if (list.length === 0) {
      return res.status(502).json({
        configured: true,
        isLiveAi: false,
        offline: true,
        error: 'AI translation returned an unrecognized structure. Please retry.',
      });
    }

    const byIndex = new Map<number, string>();
    for (const item of list) {
      if (typeof item?.index === 'number' && typeof item?.text === 'string') {
        byIndex.set(item.index, item.text.trim());
      }
    }

    const translatedCues = cues.slice(0, 250).map((orig: any, idx: number) => ({
      ...orig,
      text: byIndex.get(idx) || String(orig?.text || ''),
    }));

    return res.json({
      configured: true,
      isLiveAi: true,
      offline: false,
      provider: result.model,
      targetLang: normalizedLang,
      cues: translatedCues,
    });
  } catch (err: any) {
    const cleanErr = String(err?.message || 'AI translation failed.');
    const isTimeout = cleanErr.toLowerCase().includes('timed out') || cleanErr.toLowerCase().includes('deadline');
    return res.status(isTimeout ? 504 : 503).json({
      configured: true,
      isLiveAi: false,
      offline: true,
      error: `External AI Translation failed (${cleanErr}).`,
    });
  }
});

// POST /api/ai/assist - Server-side Gemini Subtitle Assistant (Grammar, Summary, Diagnose, Custom)
app.post('/api/ai/assist', async (req, res) => {
  const { task, content, customPrompt, targetLang, targetLangName } = req.body || {};
  const subtitleContent = typeof content === 'string' ? content.trim() : '';

  if (!subtitleContent) {
    return res.status(400).json({ error: 'Subtitle content is required.', isLiveAi: false });
  }

  const validTasks = new Set(['grammar', 'summary', 'diagnose', 'custom', 'translate']);
  if (!validTasks.has(task)) {
    return res.status(400).json({ error: 'Unsupported assistant task.', isLiveAi: false });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(503).json({
      configured: false,
      isLiveAi: false,
      offline: true,
      error: 'Gemini AI is currently offline because GEMINI_API_KEY is not configured on the server.',
    });
  }

  const clipped = subtitleContent.slice(0, 18000);

  try {
    if (task === 'grammar') {
      const prompt = `Clean and polish the following SRT or WebVTT subtitle file.
Rules:
1. Fix grammar, spelling, punctuation, capitalization, contractions, and remove verbal fillers/stutters (um, uh, repeated words).
2. STRICTLY preserve the exact SRT/VTT header, cue numbers, timestamps ("-->"), and cue structure without shifting any timing.
3. Return ONLY valid JSON in this shape (no markdown fences):
{"improvedText":"...","changesCount":1,"explanations":["..."]}

SUBTITLE INPUT:
${clipped}`;

      const result = await callGeminiWithRetry(prompt, {
        systemInstruction:
          'You are an expert subtitle copy editor. Preserve all SRT/WebVTT timestamps verbatim while polishing grammar and readability. Output valid JSON only.',
        timeoutMs: 35000,
        maxRetries: 2,
      });

      let rawJson = result.text.trim();
      const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) rawJson = fenceMatch[1].trim();
      const parsed = JSON.parse(rawJson);

      if (typeof parsed?.improvedText !== 'string' || !parsed.improvedText.trim()) {
        throw new Error('Empty grammar output from AI.');
      }

      return res.json({
        configured: true,
        isLiveAi: true,
        provider: result.model,
        result: {
          improvedText: parsed.improvedText,
          changesCount: typeof parsed.changesCount === 'number' ? parsed.changesCount : 1,
          explanations: Array.isArray(parsed.explanations) && parsed.explanations.length > 0
            ? parsed.explanations.map(String)
            : ['Polished grammar, capitalization, and spoken stutters via Gemini AI.'],
        },
      });
    }

    if (task === 'translate') {
      const langLabel =
        typeof targetLangName === 'string' && targetLangName.trim()
          ? targetLangName.trim()
          : String(targetLang || 'es');
      const prompt = `Translate the spoken dialogue in the following SRT or WebVTT subtitle file into ${langLabel}.
Rules:
1. STRICTLY preserve all SRT/VTT headers, cue numbers, timestamps ("-->"), and blank separator lines intact.
2. Translate only the spoken subtitle dialogue text naturally.
3. Return ONLY valid JSON (no markdown fences):
{"translatedText":"...","wordCount":10}

SUBTITLE INPUT:
${clipped}`;

      const result = await callGeminiWithRetry(prompt, {
        systemInstruction:
          'You are a professional subtitle translator. Translate subtitle dialogue accurately while keeping every cue index and timestamp untouched. Output valid JSON only.',
        timeoutMs: 35000,
        maxRetries: 2,
      });

      let rawJson = result.text.trim();
      const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) rawJson = fenceMatch[1].trim();
      const parsed = JSON.parse(rawJson);

      if (typeof parsed?.translatedText !== 'string' || !parsed.translatedText.trim()) {
        throw new Error('Empty translation output from AI.');
      }

      return res.json({
        configured: true,
        isLiveAi: true,
        provider: result.model,
        result: {
          translatedText: parsed.translatedText,
          sourceLang: 'auto',
          targetLang: String(targetLang || 'es'),
          wordCount: typeof parsed.wordCount === 'number' ? parsed.wordCount : clipped.split(/\s+/).length,
        },
      });
    }

    if (task === 'summary') {
      const prompt = `Summarize the dialogue of the following subtitle track.
Return ONLY valid JSON (no markdown fences):
{"summary":"...","bulletPoints":["..."],"topics":["..."],"readingTimeMinutes":1,"wordCount":100}

SUBTITLE INPUT:
${clipped}`;

      const result = await callGeminiWithRetry(prompt, {
        systemInstruction:
          'You are a concise video content analyst. Summarize subtitle transcripts into clear key takeaways and topics. Output valid JSON only.',
        timeoutMs: 35000,
        maxRetries: 2,
      });

      let rawJson = result.text.trim();
      const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) rawJson = fenceMatch[1].trim();
      const parsed = JSON.parse(rawJson);

      return res.json({
        configured: true,
        isLiveAi: true,
        provider: result.model,
        result: {
          summary: String(parsed?.summary || ''),
          bulletPoints: Array.isArray(parsed?.bulletPoints) ? parsed.bulletPoints.map(String) : [],
          topics: Array.isArray(parsed?.topics) ? parsed.topics.map(String) : [],
          readingTimeMinutes: typeof parsed?.readingTimeMinutes === 'number' ? parsed.readingTimeMinutes : 1,
          wordCount: typeof parsed?.wordCount === 'number' ? parsed.wordCount : clipped.split(/\s+/).length,
        },
      });
    }

    if (task === 'diagnose') {
      const prompt = `Audit the following subtitle track for broadcast reading speed (CPS > 20), cue durations (<0.8s or >7s), line breaks, and clarity.
Return ONLY valid JSON (no markdown fences):
{"issueCount":0,"qualityScore":95,"insights":[{"type":"warning","title":"...","description":"...","fixSuggestion":"..."}]}

SUBTITLE INPUT:
${clipped}`;

      const result = await callGeminiWithRetry(prompt, {
        systemInstruction:
          'You are a Netflix/BBC subtitle QC specialist. Audit subtitle timing, CPS, and readability. Output valid JSON only.',
        timeoutMs: 35000,
        maxRetries: 2,
      });

      let rawJson = result.text.trim();
      const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) rawJson = fenceMatch[1].trim();
      const parsed = JSON.parse(rawJson);

      return res.json({
        configured: true,
        isLiveAi: true,
        provider: result.model,
        result: {
          issueCount: typeof parsed?.issueCount === 'number' ? parsed.issueCount : 0,
          qualityScore: typeof parsed?.qualityScore === 'number' ? parsed.qualityScore : 90,
          insights: Array.isArray(parsed?.insights) ? parsed.insights : [],
        },
      });
    }

    // custom task
    const instruction = typeof customPrompt === 'string' && customPrompt.trim()
      ? customPrompt.trim().slice(0, 600)
      : 'Improve grammar and readability while preserving all timestamps.';

    const prompt = `Apply the following creator instruction to the SRT/WebVTT subtitle input below.
STRICTLY preserve all SRT/VTT cue numbers and timestamp lines ("-->") unless explicitly asked to rewrite without timestamps.
Output ONLY the transformed subtitle text without markdown code fences.

CREATOR INSTRUCTION:
${instruction}

SUBTITLE INPUT:
${clipped}`;

    const result = await callGeminiWithRetry(prompt, {
      systemInstruction:
        'You are an expert subtitle transformation assistant. Follow the creator instruction accurately while preserving valid SRT/WebVTT syntax.',
      timeoutMs: 35000,
      maxRetries: 2,
    });

    return res.json({
      configured: true,
      isLiveAi: true,
      provider: result.model,
      result: {
        outputText: result.text.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim(),
      },
    });
  } catch (err: any) {
    const cleanErr = String(err?.message || 'AI assistant request failed.');
    const isTimeout = cleanErr.toLowerCase().includes('timed out') || cleanErr.toLowerCase().includes('deadline');
    return res.status(isTimeout ? 504 : 503).json({
      configured: true,
      isLiveAi: false,
      offline: true,
      error: `AI processing failed (${cleanErr}).`,
    });
  }
});

// Return explicit JSON 404 for unknown API endpoints before SPA fallback
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ============================================================================
// VITE / STATIC SERVING
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const staticOptions = {
    setHeaders: (res: express.Response, filePath: string) => {
      if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
    },
  };

  const publicPath = path.resolve(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, staticOptions));
  }

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, staticOptions));
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
