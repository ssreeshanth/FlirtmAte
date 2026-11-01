import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { applyReplyCap, cleanupEmptyBatches, sweepAge } from './retention.js';

export class InvalidCursorError extends Error {
  constructor() { super('Invalid history cursor'); this.name = 'InvalidCursorError'; }
}

export function initializeDatabase(db) {
  try { db.pragma('journal_mode = WAL'); } catch { /* SQLite memory databases cannot use WAL. */ }
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, language TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS batches_client_idx ON batches(client_id, created_at);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, client_id TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, language TEXT NOT NULL,
      vibe TEXT NOT NULL, reply TEXT NOT NULL, normalized TEXT NOT NULL, first3 TEXT NOT NULL,
      angle TEXT NOT NULL, batch_id TEXT NOT NULL REFERENCES batches(id), starred INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS replies_client_language_idx ON replies(client_id, language, created_at);
    CREATE INDEX IF NOT EXISTS replies_client_starred_order_idx ON replies(client_id, starred, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS replies_batch_idx ON replies(batch_id);
  `);
  return db;
}

export function openDatabase(path) {
  return initializeDatabase(new Database(path));
}

export function getRecentReplies(db, clientId, language, limit = 100) {
  return db.prepare('SELECT id, client_id AS clientId, language, vibe, reply, normalized, first3, angle, batch_id AS batchId, starred, created_at AS createdAt FROM replies WHERE client_id = ? AND language = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(clientId, language, limit);
}

export function getRecentAngles(db, clientId, limit = 2) {
  const batches = db.prepare('SELECT id FROM batches WHERE client_id = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(clientId, limit).map((row) => row.id);
  if (!batches.length) return [];
  const placeholders = batches.map(() => '?').join(',');
  return db.prepare(`SELECT DISTINCT vibe, angle FROM replies WHERE client_id = ? AND batch_id IN (${placeholders})`).all(clientId, ...batches);
}

export function insertBatch(db, { clientId, language, replies, batchId = randomUUID(), createdAt = Date.now(), now = createdAt }) {
  const insert = db.transaction(() => {
    db.prepare('INSERT INTO batches (id, client_id, language, created_at) VALUES (?, ?, ?, ?)').run(batchId, clientId, language, createdAt);
    const statement = db.prepare('INSERT INTO replies (client_id, language, vibe, reply, normalized, first3, angle, batch_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const item of replies) statement.run(clientId, language, item.vibe, item.reply, item.normalized, item.first3, item.angle, batchId, createdAt);
    applyReplyCap(db, clientId, batchId);
  });
  insert();
  return batchId;
}

function decodeCursor(cursor) {
  try {
    const value = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = value.indexOf(':');
    if (separator <= 0) throw new Error();
    const createdAt = Number(value.slice(0, separator));
    const id = value.slice(separator + 1);
    if (!Number.isSafeInteger(createdAt) || !id) throw new Error();
    return { createdAt, id };
  } catch { throw new InvalidCursorError(); }
}

function encodeCursor(createdAt, id) { return Buffer.from(`${createdAt}:${id}`).toString('base64url'); }

export function pageHistory(db, clientId, { limit = 30, cursor } = {}) {
  let sql = 'SELECT id, language, created_at AS createdAt FROM batches WHERE client_id = ?';
  const params = [clientId];
  if (cursor) { const decoded = decodeCursor(cursor); sql += ' AND (created_at < ? OR (created_at = ? AND id < ?))'; params.push(decoded.createdAt, decoded.createdAt, decoded.id); }
  sql += ' ORDER BY created_at DESC, id DESC LIMIT ?';
  const rows = db.prepare(sql).all(...params, limit + 1);
  const hasMore = rows.length > limit;
  const selected = rows.slice(0, limit);
  const batchesById = new Map(selected.map((batch) => [batch.id, {
    id: batch.id, language: batch.language, createdAt: batch.createdAt, replies: []
  }]));
  if (selected.length) {
    const placeholders = selected.map(() => '?').join(',');
    const replies = db.prepare(`SELECT batch_id AS batchId, id, vibe, reply, starred, language, created_at AS createdAt FROM replies WHERE client_id = ? AND batch_id IN (${placeholders}) ORDER BY batch_id, id ASC`).all(clientId, ...selected.map((batch) => batch.id));
    for (const reply of replies) batchesById.get(reply.batchId)?.replies.push({ id: reply.id, vibe: reply.vibe, reply: reply.reply, starred: reply.starred, language: reply.language, createdAt: reply.createdAt });
  }
  const batches = selected.map((batch) => batchesById.get(batch.id));
  const last = batches.at(-1);
  return { batches, nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null };
}

export function getFavorites(db, clientId) {
  return db.prepare('SELECT id, vibe, reply, starred, language, created_at AS createdAt FROM replies WHERE client_id = ? AND starred = 1 ORDER BY created_at DESC, id DESC').all(clientId);
}

export function getBatchReplies(db, clientId, batchId) {
  return db.prepare('SELECT id, vibe, reply, starred, language, created_at AS createdAt FROM replies WHERE client_id = ? AND batch_id = ? ORDER BY id ASC').all(clientId, batchId);
}

export function setStarred(db, clientId, replyId, starred) {
  const result = db.prepare('UPDATE replies SET starred = ? WHERE id = ? AND client_id = ?').run(starred ? 1 : 0, replyId, clientId);
  return result.changes > 0;
}

export function deleteReply(db, clientId, replyId) {
  const result = db.prepare('DELETE FROM replies WHERE id = ? AND client_id = ?').run(replyId, clientId);
  cleanupEmptyBatches(db);
  return result.changes > 0;
}

export function deleteClientData(db, clientId) {
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM replies WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM batches WHERE client_id = ?').run(clientId);
  });
  transaction();
}

export { sweepAge };
