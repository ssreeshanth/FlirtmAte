import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { FLIRT_LEVELS, LANGUAGES, VIBE_IDS, MESSAGE_MAX_GRAPHEMES, CONVERSATION_CONTEXT_LIMIT } from '../shared/constants.js';
import { graphemeLength } from '../shared/text.js';
import { asksWhatDoing, findWhatDoingFallback, outputSchema, validateProviderOutput } from './validate.js';
import { buildPrompts } from './prompt.js';
import { pickAngles } from './angles.js';
import { DEDUPE_WINDOW, PROMPT_HISTORY_SIZE } from './limits.js';
import { getBatchReplies, getFavorites, getRecentAngles, getRecentReplies, initializeDatabase, insertBatch, pageHistory, setStarred, deleteReply, deleteClientData, InvalidCursorError } from './db.js';
import { ProviderError } from './providers/ai.js';
import { clearSessionCookie, hashSessionToken, newSession, readCookie, sessionCookie } from './sessions.js';
import { privacyPolicy } from './privacy.js';

class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const positiveInteger = /^\d+$/;

function errorForProvider(error) {
  if (!(error instanceof ProviderError)) return error;
  if (error.code === 'timeout') return new AppError(504, 'timeout', 'The generation timed out. Please try again.');
  if (error.code === 'rate_limit') return new AppError(503, 'provider_busy', 'The AI provider is busy. Please try again shortly.');
  if (error.code === 'auth' || error.code === 'unknown') return new AppError(502, 'provider_error', 'The AI provider could not complete the request.');
  return new AppError(502, 'bad_output', 'The AI provider returned unusable replies.');
}

function sendWhatDoingFallback({ db, res, clientId, language, stored, angles, now }) {
  const replies = findWhatDoingFallback(language, stored);
  if (!replies) return false;
  const createdAt = now();
  const batchId = insertBatch(db, { clientId, language, replies: replies.map((item) => ({ ...item, angle: angles[item.vibe].id })), createdAt, now: createdAt });
  res.json({ batchId, language, replies: getBatchReplies(db, clientId, batchId).map(({ id, vibe, reply, starred }) => ({ id, vibe, reply, starred: Boolean(starred) })) });
  return true;
}

function validateGeneration(req) {
  const clientId = req.clientId;
  if (!clientId) throw new AppError(401, 'unauthorized', 'A valid session is required.');
  const { message, language, flirtLevel = 'balanced' } = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 2000 || graphemeLength(message.trim()) > MESSAGE_MAX_GRAPHEMES) {
    throw new AppError(400, 'bad_request', 'Message must contain 1 to 500 graphemes and be at most 2000 UTF-16 units.');
  }
  if (!LANGUAGES.some((item) => item.id === language)) throw new AppError(400, 'bad_request', 'Language is not supported.');
  if (!FLIRT_LEVELS.some((item) => item.id === flirtLevel)) throw new AppError(400, 'bad_request', 'Flirting level is not supported.');
  const conversation = req.body?.conversation ?? [];
  if (!Array.isArray(conversation) || conversation.length > CONVERSATION_CONTEXT_LIMIT || conversation.length % 2 !== 0) {
    throw new AppError(400, 'bad_request', `Conversation context must contain up to ${CONVERSATION_CONTEXT_LIMIT / 2} complete exchanges.`);
  }
  const cleanConversation = conversation.map((turn, index) => {
    const expectedRole = index % 2 === 0 ? 'user' : 'assistant';
    const maxLength = expectedRole === 'user' ? 1000 : 200;
    if (!turn || turn.role !== expectedRole || typeof turn.content !== 'string' || !turn.content.trim() || turn.content.length > maxLength) {
      throw new AppError(400, 'bad_request', 'Conversation context must alternate between a received message and a selected reply.');
    }
    return { role: expectedRole, content: turn.content.trim() };
  });
  return { clientId, message: message.trim(), language, flirtLevel, conversation: cleanConversation };
}

export function createApp({ config, db, provider, now = Date.now, random = Math.random } = {}) {
  const production = config?.nodeEnv === 'production';
  if (production && (typeof config.sessionSecret !== 'string' || Buffer.byteLength(config.sessionSecret) < 32)) throw new Error('A production session secret of at least 32 bytes is required');
  if (production && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.privacyContactEmail || '')) throw new Error('A production privacy contact email is required');
  initializeDatabase(db);
  const app = express();
  const inFlight = new Map();
  const sessionSecret = config?.sessionSecret || 'test-only-session-secret-change-before-production';
  const secureCookies = config?.secureCookies ?? config?.nodeEnv === 'production';
  app.set('trust proxy', config?.trustProxy ?? 0);
  app.use(helmet());
  const generationLimiter = rateLimit({ windowMs: 60_000, limit: config?.rateLimitPerMin ?? 20, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => res.status(429).json({ error: 'Too many requests. Please try again shortly.', code: 'rate_limited' }) });
  const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => res.status(429).json({ error: 'Too many requests. Please try again shortly.', code: 'rate_limited' }) });
  const sessionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => res.status(429).json({ error: 'Too many sessions requested. Please try again later.', code: 'rate_limited' }) });
  const dailyGenerationLimiter = rateLimit({ windowMs: 24 * 60 * 60 * 1000, limit: config?.aiDailyRequestLimit ?? 100, standardHeaders: true, legacyHeaders: false, handler: (_req, res) => res.status(429).json({ error: 'The daily generation limit has been reached. Please try again tomorrow.', code: 'rate_limited' }) });
  app.use((req, res, next) => {
    const started = now();
    res.on('finish', () => console.log(JSON.stringify({ method: req.method, route: req.path, status: res.statusCode, duration: now() - started })));
    next();
  });
  app.use((req, res, next) => {
    if (config?.enforceHttps && !req.secure) return res.status(426).json({ error: 'HTTPS is required.', code: 'https_required' });
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (req, res, next) => {
    if (req.path === '/session') return sessionLimiter(req, res, next);
    if (req.path === '/generate-replies') return generationLimiter(req, res, (error) => error ? next(error) : dailyGenerationLimiter(req, res, next));
    return apiLimiter(req, res, next);
  });
  app.use('/api', (req, _res, next) => {
    const session = readCookie(req, sessionSecret, db, now());
    if (session) { req.clientId = session.clientId; req.sessionTokenHash = session.tokenHash; }
    if (req.path === '/health' || req.path === '/session') return next();
    if (!session) return next(new AppError(401, 'unauthorized', 'A valid session is required.'));
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      const fetchSite = req.get('sec-fetch-site');
      const expectedOrigin = `${req.protocol}://${req.get('host')}`;
      if ((origin && origin !== expectedOrigin) || fetchSite === 'cross-site') return next(new AppError(403, 'csrf', 'Cross-site request rejected.'));
    }
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/session', (req, res) => {
    const session = readCookie(req, sessionSecret, db, now()) || newSession(sessionSecret, now());
    if (!req.clientId) {
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
      db.prepare('INSERT INTO sessions (token_hash, client_id, expires_at) VALUES (?, ?, ?)').run(hashSessionToken(session.token), session.clientId, session.expiresAt);
      res.setHeader('Set-Cookie', sessionCookie(session.token, { secure: secureCookies }));
    }
    res.json({ expiresAt: session.expiresAt });
  });
  app.post('/api/logout', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionTokenHash);
    res.setHeader('Set-Cookie', clearSessionCookie({ secure: secureCookies }));
    res.status(204).end();
  });
  app.get('/privacy', (_req, res) => {
    res.type('html').send(privacyPolicy(config?.privacyContactEmail));
  });

  app.post('/api/generate-replies', async (req, res, next) => {
    let input;
    try { input = validateGeneration(req); } catch (error) { return next(error); }
    const { clientId, language, message, flirtLevel, conversation } = input;
    if (inFlight.has(clientId)) return next(new AppError(429, 'in_flight', 'A generation is already in progress for this client.'));
    const disconnect = new AbortController();
    res.on('close', () => { if (!res.writableEnded) disconnect.abort(); });
    inFlight.set(clientId, disconnect);
    try {
      const stored = getRecentReplies(db, clientId, language, DEDUPE_WINDOW);
      const recentAngles = getRecentAngles(db, clientId);
      const avoid = Object.fromEntries(VIBE_IDS.map((vibe) => [vibe, recentAngles.filter((row) => row.vibe === vibe).map((row) => row.angle)]));
      const angles = pickAngles(avoid, random);
      const rejected = [];
      const deadline = now() + (config?.aiTotalTimeoutMs ?? 60000);
      let lastReason = 'bad_output';
      for (let attempt = 0; attempt < 3; attempt++) {
        const remaining = deadline - now();
        if (remaining <= 0 || (attempt > 0 && remaining < 5000)) throw new AppError(504, 'timeout', 'The generation timed out. Please try again.');
        const attemptAngles = attempt === 0 ? angles : pickAngles(avoid, random);
        const prompt = buildPrompts({ language, flirtLevel, angles: attemptAngles, message, conversation, doNotReuse: stored.slice(0, PROMPT_HISTORY_SIZE).map((row) => row.reply), rejected });
        let output;
        try {
          const signal = AbortSignal.any([disconnect.signal, AbortSignal.timeout(Math.min(config?.aiTimeoutMs ?? 25000, remaining))]);
          output = await provider.generateJson({ system: prompt.system, user: prompt.user, schema: outputSchema, temperature: config?.temperature, signal });
          if (signal.aborted) throw new ProviderError('timeout');
        } catch (error) {
          const mapped = errorForProvider(error);
          if (!disconnect.signal.aborted && mapped.code !== 'auth' && asksWhatDoing(message, language) && sendWhatDoingFallback({ db, res, clientId, language, stored, angles, now })) return;
          if (mapped.code === 'timeout' && attempt < 2 && deadline - now() >= 5000) continue;
          if (mapped.code === 'bad_output' && attempt < 2 && deadline - now() >= 5000) continue;
          if (!disconnect.signal.aborted && mapped.code !== 'auth' && asksWhatDoing(message, language)) {
            const fallback = findWhatDoingFallback(language, stored);
            if (fallback) {
              const batchId = insertBatch(db, { clientId, language, replies: fallback.map((item) => ({ ...item, angle: angles[item.vibe].id })), createdAt: now(), now: now() });
              return res.json({ batchId, language, replies: getBatchReplies(db, clientId, batchId).map(({ id, vibe, reply, starred }) => ({ id, vibe, reply, starred: Boolean(starred) })) });
            }
          }
          throw mapped;
        }
        const result = validateProviderOutput(output, { language, storedReplies: stored, message });
        if (result.accepted) {
          if (disconnect.signal.aborted) return;
          const batchId = insertBatch(db, { clientId, language, replies: result.replies.map((item) => ({ ...item, angle: attemptAngles[item.vibe].id })), createdAt: now(), now: now() });
          return res.json({ batchId, language, replies: getBatchReplies(db, clientId, batchId).map(({ id, vibe, reply, starred }) => ({ id, vibe, reply, starred: Boolean(starred) })) });
        }
        if (!disconnect.signal.aborted && asksWhatDoing(message, language) && sendWhatDoingFallback({ db, res, clientId, language, stored, angles, now })) return;
        lastReason = result.reason;
        rejected.push(...result.rejectedReplies);
      }
      if (asksWhatDoing(message, language) && sendWhatDoingFallback({ db, res, clientId, language, stored, angles, now })) return;
      throw new AppError(502, 'bad_output', `The AI provider returned unusable replies (${lastReason}).`);
    } catch (error) {
      if (disconnect.signal.aborted) return;
      next(error instanceof AppError ? error : error instanceof ProviderError ? errorForProvider(error) : new AppError(502, 'provider_error', 'The AI provider could not complete the request.'));
    } finally { inFlight.delete(clientId); }
  });

  app.get('/api/history', (req, res, next) => {
    try {
      const clientId = req.clientId;
      const limit = req.query.limit === undefined ? 30 : Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new AppError(400, 'bad_request', 'Limit must be an integer from 1 to 100.');
      res.json(pageHistory(db, clientId, { limit, cursor: req.query.cursor }));
    } catch (error) { next(error); }
  });
  app.get('/api/favorites', (req, res, next) => { try { res.json({ favorites: getFavorites(db, req.clientId) }); } catch (error) { next(error); } });
  app.post('/api/replies/:id/star', (req, res, next) => {
    try {
      const clientId = req.clientId;
      if (!positiveInteger.test(req.params.id) || typeof req.body?.starred !== 'boolean') throw new AppError(400, 'bad_request', 'A positive reply id and boolean starred value are required.');
      if (!setStarred(db, clientId, Number(req.params.id), req.body.starred)) throw new AppError(404, 'not_found', 'Reply not found.');
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  app.delete('/api/replies/:id', (req, res, next) => { try { if (!positiveInteger.test(req.params.id)) throw new AppError(400, 'bad_request', 'Reply id must be a positive integer.'); if (!deleteReply(db, req.clientId, Number(req.params.id))) throw new AppError(404, 'not_found', 'Reply not found.'); res.status(204).end(); } catch (error) { next(error); } });
  app.delete('/api/history', (req, res, next) => { try { deleteClientData(db, req.clientId); res.status(204).end(); } catch (error) { next(error); } });

  app.use('/api', (_req, _res, next) => next(new AppError(404, 'not_found', 'API route not found.')));
  if (config?.nodeEnv === 'production') {
    const dist = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url))));
  }
  app.use((error, _req, res, _next) => {
    const appError = error instanceof AppError ? error : error instanceof InvalidCursorError ? new AppError(400, 'bad_request', error.message) : error?.type === 'entity.parse.failed' ? new AppError(400, 'bad_request', 'Request body must be valid JSON.') : error?.type === 'entity.too.large' ? new AppError(413, 'payload_too_large', 'Request body is too large.') : new AppError(500, 'internal', 'Something went wrong.');
    if (!res.headersSent) res.status(appError.status).json({ error: appError.message, code: appError.code });
  });
  return app;
}
