import { RETENTION_MS, RETENTION_REPLY_CAP } from './limits.js';

export function cleanupEmptyBatches(db) {
  db.prepare('DELETE FROM batches WHERE NOT EXISTS (SELECT 1 FROM replies WHERE replies.batch_id = batches.id)').run();
}

export function applyReplyCap(db, clientId, batchId) {
  const rows = db.prepare('SELECT id FROM replies WHERE client_id = ? AND starred = 0 AND batch_id <> ? ORDER BY created_at ASC, id ASC').all(clientId, batchId);
  const count = db.prepare('SELECT COUNT(*) AS count FROM replies WHERE client_id = ?').get(clientId).count;
  const remove = Math.max(0, count - RETENTION_REPLY_CAP);
  if (remove) db.prepare(`DELETE FROM replies WHERE id IN (${rows.slice(0, remove).map(() => '?').join(',')})`).run(...rows.slice(0, remove).map((row) => row.id));
  cleanupEmptyBatches(db);
}

export function sweepAge(db, now = Date.now()) {
  const cutoff = now - RETENTION_MS;
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  const result = db.prepare('DELETE FROM replies WHERE starred = 0 AND created_at < ?').run(cutoff);
  cleanupEmptyBatches(db);
  return result.changes;
}
