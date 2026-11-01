import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadConfig } from './server/config.js';
import { openDatabase, sweepAge } from './server/db.js';
import { createProvider } from './server/providers/ai.js';
import { createApp } from './server/app.js';

function devApiPlugin() {
  return {
    name: 'flirtmate-dev-api',
    configureServer(viteServer) {
      // Vitest starts Vite in serve mode too; its tests use in-memory mock APIs,
      // so do not load real provider credentials or open the development DB.
      if (process.env.VITEST || process.env.NODE_ENV === 'test') return;
      const config = loadConfig(process.env);
      if (config.dbPath !== ':memory:') mkdirSync(dirname(config.dbPath), { recursive: true });
      const db = openDatabase(config.dbPath);
      sweepAge(db, Date.now());
      const timer = setInterval(() => sweepAge(db, Date.now()), 24 * 60 * 60 * 1000);
      timer.unref();
      const app = createApp({ config, db, provider: createProvider(config) });
      viteServer.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] || '';
        if (pathname === '/api' || pathname.startsWith('/api/')) return app(req, res, next);
        next();
      });
      viteServer.httpServer?.once('close', () => {
        clearInterval(timer);
        db.close();
      });
    }
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === 'serve' ? [devApiPlugin()] : [])],
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js', 'tests/dom/**/*.test.jsx', 'tests/live/**/*.test.js'],
    environment: 'node'
  }
}));
