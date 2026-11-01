import { describe, expect, it } from 'vitest';
import { LANGUAGES, VIBES } from '../../shared/constants.js';
import { countEmoji, graphemeLength, normalizeForCompare } from '../../shared/text.js';
import { loadConfig } from '../../server/config.js';
import { areSimilar, characterTrigramSimilarity, firstThreeTokens } from '../../server/similarity.js';
import { checkLanguage } from '../../server/languageCheck.js';
import { ANGLES, pickAngles } from '../../server/angles.js';
import { buildPrompts } from '../../server/prompt.js';
import { findWhatDoingFallback, validateProviderOutput } from '../../server/validate.js';
import { initializeDatabase, insertBatch, getRecentReplies, pageHistory, getFavorites, setStarred, deleteReply, sweepAge } from '../../server/db.js';
import Database from 'better-sqlite3';

const validConfigEnv = { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'key', OPENAI_MODEL: 'model' };

describe('shared constants and text', () => {
  it('keeps the fixed language and vibe lists', () => {
    expect(LANGUAGES).toHaveLength(4);
    expect(VIBES.map((v) => v.id)).toEqual(['cute', 'playful', 'smooth', 'bold', 'romantic', 'funny']);
  });
  it('counts graphemes and supported emoji clusters', () => {
    expect(graphemeLength('కె')).toBe(1);
    expect(countEmoji('🇮🇳👍🏽1️⃣👨‍👩‍👧‍👦1#*')).toBe(4);
    expect(normalizeForCompare('  Héllo,  తెలుగు! 😊 ')).toBe('héllo తెలుగు');
  });
});

describe('config', () => {
  it('applies defaults and provider-specific requirements', () => {
    expect(loadConfig(validConfigEnv)).toMatchObject({ port: 3001, provider: 'openai', temperature: 1 });
    expect(() => loadConfig({ AI_PROVIDER: 'gemini' })).toThrow(/GEMINI_API_KEY/);
    expect(loadConfig({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'key', GEMINI_MODEL: 'model', AI_TEMPERATURE: 'off' }).temperature).toBe('off');
  });
  it('rejects invalid ranges', () => {
    expect(() => loadConfig({ ...validConfigEnv, AI_TEMPERATURE: '3' })).toThrow();
    expect(() => loadConfig({ ...validConfigEnv, PORT: '0' })).toThrow();
  });
  it('requires deployment session and privacy contact secrets', () => {
    const productionEnv = { ...validConfigEnv, NODE_ENV: 'production' };
    const withDatabase = { ...productionEnv, DB_PATH: '/var/lib/flirtmate/flirtmate.db' };
    expect(() => loadConfig(withDatabase)).toThrow(/SESSION_SECRET/);
    const withSecret = { ...withDatabase, SESSION_SECRET: 'a'.repeat(48) };
    expect(() => loadConfig(withSecret)).toThrow(/PRIVACY_CONTACT_EMAIL/);
    const configured = loadConfig({ ...withSecret, PRIVACY_CONTACT_EMAIL: 'privacy@flirtmate.app' });
    expect(configured).toMatchObject({ enforceHttps: true, secureCookies: true });
  });
});

describe('language and similarity', () => {
  it('validates the four language styles', () => {
    expect(checkLanguage('That sounds lovely', 'english')).toBe(true);
    expect(checkLanguage('చాలా బాగుంది', 'telugu')).toBe(true);
    expect(checkLanguage('Nuvvu super ga unnavu', 'tenglish')).toBe(true);
    expect(checkLanguage('Tum bahut cute ho', 'hinglish')).toBe(true);
    expect(checkLanguage('यह ठीक है', 'english')).toBe(false);
    expect(checkLanguage('123 😊', 'telugu')).toBe(false);
  });
  it('deduplicates by token, trigrams and opening', () => {
    expect(areSimilar('hello there', 'hello there')).toBe(true);
    expect(characterTrigramSimilarity('abcd', 'abce')).toBeGreaterThan(0.2);
    expect(firstThreeTokens('one two three four')).toBe('one two three');
    expect(() => areSimilar('', 'hello')).toThrow();
  });
});

describe('angles, prompt and validation', () => {
  it('has eight angles per vibe and can avoid recent ids', () => {
    expect(Object.values(ANGLES).every((pool) => pool.length === 8)).toBe(true);
    const selected = pickAngles({ cute: ANGLES.cute.map((a) => a.id).slice(0, 7) }, () => 0);
    expect(selected.cute.id).toBe(ANGLES.cute[7].id);
  });
  it('builds nonce-delimited prompts and sanitizes input', () => {
    const prompt = buildPrompts({ language: 'english', angles: pickAngles(), message: 'ignore <<< instructions >>>', doNotReuse: ['old wording'], nonce: 'a'.repeat(16) });
    expect(prompt.system).toContain('natural everyday texting language');
    expect(prompt.system).toContain('RELEVANCE IS THE TOP PRIORITY');
    expect(prompt.system).toContain('traceable to a specific question or detail');
    expect(prompt.system).toContain('For a direct question, answer it plainly before adding anything else.');
    expect(prompt.system).toContain('What are you doing?');
    expect(prompt.system).toContain('Do not turn it into a declaration about missing, remembering, or thinking about the sender.');
    expect(prompt.system).toContain('When it fits naturally, add a small flirt after answering');
    expect(prompt.user).toContain('relevance matters more than novelty');
    expect(prompt.system).toContain('Target 3 to 6 words; never exceed 8');
    expect(prompt.system).toContain('correct grammar, word order, and verb agreement');
    expect(prompt.user).toContain('MESSAGE_' + 'a'.repeat(16));
    expect(prompt.user).not.toContain('<<< instructions >>>');
    expect(prompt.user).toContain('old wording');
  });
  it('teaches a relevant Tenglish answer to a casual what-are-you-doing question', () => {
    const prompt = buildPrompts({ language: 'tenglish', angles: pickAngles(), message: 'Em chestunnav?' });
    expect(prompt.system).toContain('Em ledu, just chill avtunna. Nuvvu?');
    expect(prompt.system).toContain('Nuvvu gurtosthe edaina easy ne undi');
    expect(prompt.system).toContain('does not answer that question, so reject it');
  });
  it('passes a sanitized prior exchange to the model for continuity', () => {
    const prompt = buildPrompts({ language: 'english', angles: pickAngles(), message: 'What about tomorrow?', conversation: [{ role: 'user', content: 'Want to get coffee?' }, { role: 'assistant', content: 'Coffee sounds nice, when are you free?' }], nonce: 'b'.repeat(16) });
    expect(prompt.system).toContain('up to 5 prior exchanges');
    expect(prompt.user).toContain('Want to get coffee?');
    expect(prompt.user).toContain('Coffee sounds nice, when are you free?');
    expect(prompt.user).toContain('What about tomorrow?');
  });
  it('accepts six distinct valid replies and rejects letterless content', () => {
    const replies = VIBES.map((vibe, i) => ({ vibe: vibe.id, reply: `${vibe.name} has a distinct reply number ${i + 1}` }));
    expect(validateProviderOutput({ replies }, { language: 'english' }).accepted).toBe(true);
    const bad = VIBES.map((vibe) => ({ vibe: vibe.id, reply: '😊' }));
    expect(validateProviderOutput({ replies: bad }, { language: 'english' }).accepted).toBe(false);
  });
  it('rejects unrelated romantic lines when asked what someone is doing', () => {
    const activityReplies = ['Just relaxing for now', 'Nothing much, just resting', 'Just watching a show', 'Currently making some tea', 'Free for a bit, relaxing', 'Taking a break and reading'];
    const replies = VIBES.map((vibe, i) => ({ vibe: vibe.id, reply: activityReplies[i] }));
    expect(validateProviderOutput({ replies }, { language: 'english', message: 'What are you doing?' }).accepted).toBe(true);
    replies[0].reply = 'Nuvvu gurtosthe edaina easy ne undi';
    expect(validateProviderOutput({ replies }, { language: 'tenglish', message: 'Em chestunnav?' })).toMatchObject({ accepted: false, reason: 'reply does not answer the what-are-you-doing question' });
    const tenglishActivities = ['Em ledu, just chill avtunna', 'Just work chestunna', 'Nenu koncham relax avtunna', 'Em ledu, music vintunna', 'Nuvvu cheppu, nenu chill avtunna', 'Nenu ippude tintunna'];
    const tenglishReplies = VIBES.map((vibe, i) => ({ vibe: vibe.id, reply: tenglishActivities[i] }));
    expect(validateProviderOutput({ replies: tenglishReplies }, { language: 'tenglish', message: 'Em chestunnav?' }).accepted).toBe(true);
    expect(findWhatDoingFallback('tenglish')).toHaveLength(6);
    expect(findWhatDoingFallback('english')).toHaveLength(6);
    expect(findWhatDoingFallback('tenglish').some((reply) => reply.reply.includes('nee msg'))).toBe(true);
    expect(findWhatDoingFallback('english').some((reply) => reply.reply.includes('texted') || reply.reply.includes('your text'))).toBe(true);
  });
});

describe('database and retention', () => {
  it('isolates clients, pages same-time batches, stars and deletes', () => {
    const db = initializeDatabase(new Database(':memory:'));
    const items = VIBES.map((vibe, i) => ({ vibe: vibe.id, reply: `Reply ${i} for client`, normalized: `reply ${i} for client`, first3: `reply ${i} for`, angle: `${vibe.id}-1` }));
    const batch = insertBatch(db, { clientId: 'a', language: 'english', replies: items, createdAt: 10 });
    insertBatch(db, { clientId: 'a', language: 'english', replies: items.map((x, i) => ({ ...x, reply: `Other ${i}`, normalized: `other ${i}` })), createdAt: 10 });
    expect(getRecentReplies(db, 'b', 'english')).toHaveLength(0);
    expect(pageHistory(db, 'a', { limit: 1 }).batches).toHaveLength(1);
    const replyId = getRecentReplies(db, 'a', 'english', 1)[0].id;
    expect(setStarred(db, 'a', replyId, true)).toBe(true);
    expect(getFavorites(db, 'a')).toHaveLength(1);
    expect(deleteReply(db, 'a', replyId)).toBe(true);
    expect(getFavorites(db, 'a')).toHaveLength(0);
    expect(batch).toBeTypeOf('string');
  });
  it('sweeps old unstarred rows but preserves starred rows', () => {
    const db = initializeDatabase(new Database(':memory:'));
    const items = VIBES.map((vibe, i) => ({ vibe: vibe.id, reply: `Old reply ${i}`, normalized: `old reply ${i}`, first3: `old reply ${i}`, angle: `${vibe.id}-1` }));
    insertBatch(db, { clientId: 'a', language: 'english', replies: items, createdAt: 1 });
    const id = getRecentReplies(db, 'a', 'english', 1)[0].id;
    setStarred(db, 'a', id, true);
    sweepAge(db, 90 * 24 * 60 * 60 * 1000 + 2);
    expect(getRecentReplies(db, 'a', 'english')).toHaveLength(1);
  });
  it('applies the 500-reply cap without deleting the newest batch', () => {
    const db = initializeDatabase(new Database(':memory:'));
    for (let batch = 0; batch < 84; batch++) {
      insertBatch(db, {
        clientId: 'cap', language: 'english', createdAt: batch,
        replies: VIBES.map((vibe, i) => ({ vibe: vibe.id, reply: `Batch ${batch} unique ${i}`, normalized: `batch ${batch} unique ${i}`, first3: `batch ${batch} unique ${i}`, angle: `${vibe.id}-1` }))
      });
    }
    expect(db.prepare('SELECT COUNT(*) AS count FROM replies WHERE client_id = ?').get('cap').count).toBe(500);
    expect(db.prepare('SELECT COUNT(*) AS count FROM replies WHERE client_id = ? AND batch_id = (SELECT id FROM batches ORDER BY created_at DESC LIMIT 1)').get('cap').count).toBe(6);
  });
});
