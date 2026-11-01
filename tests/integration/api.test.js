import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../server/app.js';
import { ProviderError } from '../../server/providers/ai.js';
import { VIBES } from '../../shared/constants.js';

const config = { nodeEnv: 'test', rateLimitPerMin: 50, aiTimeoutMs: 100, aiTotalTimeoutMs: 20000, temperature: 1, trustProxy: 0, privacyContactEmail: 'privacy@flirtmate.test' };
function makeProvider({ delay = 0, mode = 'valid' } = {}) {
  let generation = 0;
  return {
    calls: [],
    async generateJson(requestData) {
      this.calls.push(requestData);
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (mode === 'bad') return { replies: VIBES.map((vibe) => ({ vibe: vibe.id, reply: '😊' })) };
      generation += 1;
      return { replies: VIBES.map((vibe, index) => ({ vibe: vibe.id, reply: `Generation ${generation} ${vibe.name} wording ${index + 1}` })) };
    }
  };
}

function setup(options) {
  const db = new Database(':memory:');
  const provider = makeProvider(options);
  const app = createApp({ config, db, provider });
  return { db, provider, app, agent: request.agent(app) };
}

describe('Phase 2 API', () => {
  let current;
  afterEach(() => current?.db.close());

  it('serves health and generates one validated batch', async () => {
    current = setup();
    await current.agent.post('/api/session');
    expect((await request(current.app).get('/api/health')).body).toEqual({ ok: true });
    expect((await request(current.app).get('/privacy')).text).toContain('privacy@flirtmate.test');
    const response = await current.agent.post('/api/generate-replies').send({ message: 'That was fun', language: 'english' });
    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(6);
    expect(response.body.replies[0]).toMatchObject({ vibe: 'cute', starred: false });
    expect(current.provider.calls[0].user).toContain('MESSAGE_');
  });

  it('rejects invalid input and isolates client data', async () => {
    current = setup();
    expect((await request(current.app).post('/api/generate-replies').send({ message: 'x', language: 'english' })).status).toBe(401);
    await current.agent.post('/api/session');
    expect((await current.agent.post('/api/generate-replies').send({ message: 'x', language: 'nope' })).status).toBe(400);
    await current.agent.post('/api/generate-replies').send({ message: 'x', language: 'english' });
    const other = request.agent(current.app);
    await other.post('/api/session');
    const otherHistory = await other.get('/api/history');
    expect(otherHistory.body.batches).toHaveLength(0);
  });

  it('validates and forwards prior conversation context to the provider', async () => {
    current = setup();
    await current.agent.post('/api/session');
    const context = [{ role: 'user', content: 'Want to get coffee?' }, { role: 'assistant', content: 'Coffee sounds nice, when are you free?' }];
    const response = await current.agent.post('/api/generate-replies').send({ message: 'What about tomorrow?', language: 'english', conversation: context });
    expect(response.status).toBe(200);
    expect(current.provider.calls[0].user).toContain('Want to get coffee?');
    expect(current.provider.calls[0].user).toContain('Coffee sounds nice');
    const invalid = await current.agent.post('/api/generate-replies').send({ message: 'Hi', language: 'english', conversation: [{ role: 'assistant', content: 'hello' }, { role: 'user', content: 'hey' }] });
    expect(invalid.status).toBe(400);
  });

  it('supports history paging, favorites, star and delete', async () => {
    current = setup();
    await current.agent.post('/api/session');
    const generated = await current.agent.post('/api/generate-replies').send({ message: 'hello', language: 'english' });
    const id = generated.body.replies[0].id;
    const other = request.agent(current.app);
    await other.post('/api/session');
    expect((await other.get('/api/history')).body.batches).toHaveLength(0);
    expect((await other.post(`/api/replies/${id}/star`).send({ starred: true })).status).toBe(404);
    expect((await other.delete(`/api/replies/${id}`)).status).toBe(404);
    expect((await current.agent.post(`/api/replies/${id}/star`).send({ starred: true })).status).toBe(200);
    expect((await current.agent.get('/api/favorites')).body.favorites).toHaveLength(1);
    const history = await current.agent.get('/api/history?limit=1');
    expect(history.body.batches).toHaveLength(1);
    expect((await current.agent.delete(`/api/replies/${id}`)).status).toBe(204);
    expect((await current.agent.delete('/api/history')).status).toBe(204);
  });

  it('retries invalid provider output and returns bad_output without storing', async () => {
    current = setup({ mode: 'bad' });
    await current.agent.post('/api/session');
    const response = await current.agent.post('/api/generate-replies').send({ message: 'hello', language: 'english' });
    expect(response.status).toBe(502);
    expect(response.body.code).toBe('bad_output');
    expect(current.provider.calls).toHaveLength(3);
    expect((await current.agent.get('/api/history')).body.batches).toHaveLength(0);
  });

  it('returns relevant fallback replies for a direct Tenglish activity question if provider output stays off-topic', async () => {
    current = setup();
    await current.agent.post('/api/session');
    const response = await current.agent.post('/api/generate-replies').send({ message: 'Em chestunnav?', language: 'tenglish' });
    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(6);
    expect(response.body.replies.some((reply) => reply.reply.includes('gurtosthe'))).toBe(false);
    expect(current.provider.calls).toHaveLength(1);
  });

  it('keeps direct Tenglish activity replies available while the provider is rate limited', async () => {
    current = setup();
    current.provider.generateJson = async () => { throw new ProviderError('rate_limit'); };
    await current.agent.post('/api/session');
    const response = await current.agent.post('/api/generate-replies').send({ message: 'Em chestunnav?', language: 'tenglish' });
    expect(response.status).toBe(200);
    expect(response.body.replies).toHaveLength(6);
  });

  it('returns in_flight for a concurrent generation', async () => {
    current = setup({ delay: 50 });
    await current.agent.post('/api/session');
    const first = current.agent.post('/api/generate-replies').send({ message: 'hello', language: 'english' }).then((response) => response);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await current.agent.post('/api/generate-replies').send({ message: 'hello', language: 'english' });
    expect(second.status).toBe(429);
    expect(second.body.code).toBe('in_flight');
    await first;
  });

  it('issues an HttpOnly signed session cookie and rejects forged client headers', async () => {
    current = setup();
    const issued = await request(current.app).post('/api/session');
    expect(issued.status).toBe(200);
    expect(issued.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(issued.headers['set-cookie'][0]).toMatch(/SameSite=Strict/);
    expect((await request(current.app).get('/api/history').set('X-Client-Id', randomUUID())).status).toBe(401);
    const cookiePair = issued.headers['set-cookie'][0].split(';')[0];
    const tampered = cookiePair.slice(0, -1) + (cookiePair.endsWith('a') ? 'b' : 'a');
    expect((await request(current.app).get('/api/history').set('Cookie', tampered)).status).toBe(401);
    const agent = request.agent(current.app);
    await agent.post('/api/session');
    expect((await agent.post('/api/logout').set('Origin', 'https://attacker.example')).status).toBe(403);
    expect((await agent.post('/api/logout')).status).toBe(204);
    expect((await agent.get('/api/history')).status).toBe(401);
  });

  it('blocks production requests unless TLS is visible through the trusted proxy', async () => {
    const db = new Database(':memory:');
    const app = createApp({ db, provider: {}, config: { ...config, nodeEnv: 'production', enforceHttps: true, trustProxy: 1, sessionSecret: 'unit-test-production-secret-32bytes-minimum', privacyContactEmail: 'privacy@example.test' } });
    expect((await request(app).get('/api/health')).status).toBe(426);
    expect((await request(app).get('/api/health').set('X-Forwarded-Proto', 'https')).status).toBe(200);
    db.close();
  });
});
