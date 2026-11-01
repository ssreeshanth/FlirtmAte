let sessionPromise;

async function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not start a secure session. Please reload the page.');
        return response.json();
      })
      .catch((error) => { sessionPromise = null; throw error; });
  }
  return sessionPromise;
}

async function request(path, options = {}) {
  let response;
  try {
    await ensureSession();
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (response.status === 401 && path !== '/api/session') {
      sessionPromise = null;
      await ensureSession();
      response = await fetch(path, {
        ...options,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
    }
  } catch (cause) {
    const error = new Error('Network error. Check your connection and try again.');
    error.code = 'network'; error.cause = cause; throw error;
  }
  let body = {};
  try { body = await response.json(); } catch { /* empty 204 response */ }
  if (!response.ok) { const error = new Error(body.error || 'Request failed.'); error.code = body.code || 'internal'; throw error; }
  return body;
}

export function generateReplies(message, language, flirtLevel = 'balanced', signal, conversation = []) { return request('/api/generate-replies', { method: 'POST', body: JSON.stringify({ message, language, flirtLevel, conversation }), signal }); }
export async function logout() { await request('/api/logout', { method: 'POST' }); sessionPromise = null; }
export function getHistory(cursor, signal) { return request(`/api/history?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { signal }); }
export function getFavorites(signal) { return request('/api/favorites', { signal }); }
export function setStarred(id, starred) { return request(`/api/replies/${id}/star`, { method: 'POST', body: JSON.stringify({ starred }) }); }
export function removeReply(id) { return request(`/api/replies/${id}`, { method: 'DELETE' }); }
export function clearHistory() { return request('/api/history', { method: 'DELETE' }); }
