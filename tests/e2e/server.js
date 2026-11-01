import { createServer } from 'node:http';
import Database from 'better-sqlite3';
import { createApp } from '../../server/app.js';
import { VIBES } from '../../shared/constants.js';

let count = 0;
const provider = { async generateJson() { count += 1; return { replies: VIBES.map((vibe, index) => ({ vibe: vibe.id, reply: `Run ${count} ${vibe.name} response ${index + 1}` })) }; } };
const db = new Database(':memory:');
const app = createApp({ db, provider, config: { nodeEnv: 'production', rateLimitPerMin: 100, aiTimeoutMs: 5000, aiTotalTimeoutMs: 60000, temperature: 1, trustProxy: 0, enforceHttps: false, secureCookies: false, privacyContactEmail: 'privacy@example.test', sessionSecret: 'e2e-only-session-secret-not-for-production' } });
const server = createServer(app).listen(4174, '127.0.0.1');
process.on('SIGTERM', () => { server.close(() => { db.close(); process.exit(0); }); });
