import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from './config.js';
import { openDatabase, sweepAge } from './db.js';
import { createProvider } from './providers/ai.js';
import { createApp } from './app.js';

let config;
try { config = loadConfig(process.env); } catch (error) { console.error(error.message); process.exit(1); }
if (config.dbPath !== ':memory:') mkdirSync(dirname(config.dbPath), { recursive: true });
const db = openDatabase(config.dbPath);
sweepAge(db, Date.now());
const timer = setInterval(() => sweepAge(db, Date.now()), 24 * 60 * 60 * 1000);
timer.unref();
const app = createApp({ config, db, provider: createProvider(config) });
app.listen(config.port, () => console.log(JSON.stringify({ event: 'listening', port: config.port })));
