import { useEffect, useMemo, useRef, useState } from 'react';
import { FLIRT_LEVELS, LANGUAGES, MESSAGE_MAX_GRAPHEMES, CONVERSATION_CONTEXT_LIMIT } from '../shared/constants.js';
import { graphemeLength } from '../shared/text.js';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ReplyCard from './components/ReplyCard.jsx';
import HistoryList from './components/HistoryList.jsx';
import * as api from './api.js';

const errorMessages = {
  bad_request: 'Please check your message and try again.', rate_limited: 'You are sending requests too quickly. Please wait a moment.',
  in_flight: 'A generation is already in progress. Please wait for it to finish.', bad_output: 'No usable replies came back. Please try again.',
  provider_error: 'The reply service is unavailable right now.', provider_busy: 'The reply service is busy. Please try again shortly.',
  timeout: 'The request took too long. Please try again.', unauthorized: 'Your session expired. Reload the page to continue.',
  csrf: 'This request was blocked. Reload the page and try again.', internal: 'Something went wrong. Please try again.'
};
const CONVERSATION_STORAGE_KEY = 'flirtmate-conversation';
function readConversation() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CONVERSATION_STORAGE_KEY) || '[]');
    const valid = Array.isArray(saved) && saved.length <= CONVERSATION_CONTEXT_LIMIT && saved.length % 2 === 0 && saved.every((turn, index) => turn?.role === (index % 2 === 0 ? 'user' : 'assistant') && typeof turn.content === 'string');
    return valid ? saved : [];
  } catch { return []; }
}

function readableError(error) { return error?.code === 'network' ? error.message : errorMessages[error?.code] || error?.message || errorMessages.internal; }

export default function App() {
  const [languageChoice, setLanguageChoice] = useState('');
  const [language, setLanguage] = useState(null);
  const [flirtLevel, setFlirtLevel] = useState('balanced');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState(readConversation);
  const [generatedForMessage, setGeneratedForMessage] = useState('');
  const [selectedReplyId, setSelectedReplyId] = useState(null);
  const [replies, setReplies] = useState([]);
  const [tab, setTab] = useState('generate');
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const abortRef = useRef(null);
  const currentLanguage = useMemo(() => LANGUAGES.find((entry) => entry.id === language), [language]);
  const count = graphemeLength(message);

  useEffect(() => () => abortRef.current?.abort(), []);
  function start() { setLanguage(languageChoice); setError(''); }
  function stopRequest() { abortRef.current?.abort(); abortRef.current = null; }
  async function generate() {
    if (!message.trim() || count > MESSAGE_MAX_GRAPHEMES || loading) return;
    stopRequest(); const controller = new AbortController(); abortRef.current = controller; setLoading(true); setError(''); setGeneratedForMessage(''); setSelectedReplyId(null);
    const incomingMessage = message.trim();
    try { const result = await api.generateReplies(incomingMessage, language, flirtLevel, controller.signal, conversation); if (!controller.signal.aborted) { setReplies(result.replies); setGeneratedForMessage(incomingMessage); setSelectedReplyId(null); } }
    catch (cause) { if (!controller.signal.aborted) setError(readableError(cause)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function newMessage() { stopRequest(); setMessage(''); setReplies([]); setGeneratedForMessage(''); setSelectedReplyId(null); setLoading(false); setError(''); }
  function startNewConversation() {
    newMessage(); setConversation([]);
    try { sessionStorage.removeItem(CONVERSATION_STORAGE_KEY); } catch { /* storage may be unavailable */ }
  }
  function useReply(item) {
    if (!generatedForMessage || selectedReplyId !== null) return;
    const next = [...conversation, { role: 'user', content: generatedForMessage }, { role: 'assistant', content: item.reply }].slice(-CONVERSATION_CONTEXT_LIMIT);
    setConversation(next); setSelectedReplyId(item.id); setMessage(''); setError('');
    try { sessionStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(next)); } catch { /* conversation remains available until reload */ }
  }
  async function copy(item) {
    try { await navigator.clipboard.writeText(item.reply); setCopied(item.id); window.setTimeout(() => setCopied(null), 1500); }
    catch { setError('Copy failed. Select the reply text and copy it manually.'); }
  }
  async function star(item) {
    const next = !item.starred;
    const update = (list) => list.map((entry) => entry.id === item.id ? { ...entry, starred: next } : entry);
    setReplies(update); setFavorites(update); setHistory((batches) => batches.map((batch) => ({ ...batch, replies: update(batch.replies) })));
    try { await api.setStarred(item.id, next); } catch (cause) { setReplies((list) => list.map((entry) => entry.id === item.id ? { ...entry, starred: !next } : entry)); setFavorites((list) => list.map((entry) => entry.id === item.id ? { ...entry, starred: !next } : entry)); setError(readableError(cause)); }
  }
  async function remove(item) { try { await api.removeReply(item.id); setFavorites((list) => list.filter((entry) => entry.id !== item.id)); setHistory((batches) => batches.map((batch) => ({ ...batch, replies: batch.replies.filter((entry) => entry.id !== item.id) }))); } catch (cause) { setError(readableError(cause)); } }
  async function loadHistory(reset = false) { try { const result = await api.getHistory(reset ? null : cursor); setHistory(reset ? result.batches : [...history, ...result.batches]); setCursor(result.nextCursor); } catch (cause) { setError(readableError(cause)); } }
  async function loadFavorites() { try { setFavorites((await api.getFavorites()).favorites); } catch (cause) { setError(readableError(cause)); } }
  function selectTab(next) { setTab(next); setError(''); if (next === 'history' && !history.length) loadHistory(true); if (next === 'favorites') loadFavorites(); }
  async function endSession() {
    try {
      await api.logout();
      startNewConversation(); setLanguage(null); setLanguageChoice(''); setHistory([]); setFavorites([]); setCursor(null); setError('');
    } catch (cause) { setError(readableError(cause)); }
  }
  if (!language) return <WelcomeScreen choice={languageChoice} onChoice={setLanguageChoice} onStart={start} />;
  return <div className="app-shell">
    <header className="app-header"><div className="header-brand"><span aria-hidden="true">💜</span><span>FlirtMate</span></div><span className="language-badge">{currentLanguage?.label}</span><button type="button" onClick={endSession}>End session</button></header>
    <nav className="tabs" aria-label="Main navigation">{[['generate', 'Generate'], ['history', 'History'], ['favorites', 'Favorites']].map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => selectTab(id)}>{label}</button>)}</nav>
    <main className="content" aria-live="polite">
      {tab === 'generate' && <section aria-labelledby="generate-heading"><div className="conversation-heading"><h1 id="generate-heading">Find your next line</h1>{conversation.length > 0 && <button type="button" className="secondary-button" onClick={startNewConversation}>New conversation</button>}</div>
        {conversation.length > 0 && <div className="conversation-thread" aria-label="Conversation so far">{conversation.map((turn, index) => <p className={`conversation-message ${turn.role}`} key={`${index}-${turn.role}`}><strong>{turn.role === 'user' ? 'Them' : 'You'}:</strong> {turn.content}</p>)}</div>}
        <label htmlFor="message">{conversation.length ? 'What did they say next?' : 'What did they say?'}</label><textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={conversation.length ? 'Paste their next message here' : 'Paste their message here'} aria-describedby="message-count" />
        <div className="flirt-control"><label htmlFor="flirt-level">Flirting level</label><select id="flirt-level" value={flirtLevel} onChange={(event) => setFlirtLevel(event.target.value)}>{FLIRT_LEVELS.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></div>
        <div id="message-count" className={count > MESSAGE_MAX_GRAPHEMES ? 'counter over' : 'counter'}>{count}/{MESSAGE_MAX_GRAPHEMES} characters</div>
        <button className="primary-button" type="button" disabled={!message.trim() || count > MESSAGE_MAX_GRAPHEMES || loading} onClick={generate}>{loading ? 'Generating…' : conversation.length ? 'Generate follow-up replies' : 'Generate All Vibes'}</button>
        {loading && <div className="skeletons" aria-label="Loading replies">{[1, 2, 3].map((item) => <div className="skeleton" key={item} />)}</div>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="reply-grid">{replies.map((item) => <ReplyCard item={item} key={item.id} onCopy={copy} onStar={star} copied={copied === item.id} onUse={generatedForMessage ? useReply : null} selected={selectedReplyId === item.id} selectionMade={selectedReplyId !== null} />)}</div>
        {replies.length > 0 && <div className="button-row"><button type="button" className="secondary-button" onClick={generate}>Regenerate</button><button type="button" className="secondary-button" onClick={conversation.length ? startNewConversation : newMessage}>{conversation.length ? 'New conversation' : 'New message'}</button></div>}
      </section>}
      {tab === 'history' && <section><h1>History</h1><HistoryList items={history} onCopy={copy} onStar={star} onDelete={remove} onLoadMore={() => loadHistory(false)} canLoadMore={Boolean(cursor)} />{history.length > 0 && <button className="danger-button" type="button" onClick={async () => { if (window.confirm('This will delete starred replies too. Continue?')) { await api.clearHistory(); setHistory([]); setFavorites([]); } }}>Clear all history</button>}</section>}
      {tab === 'favorites' && <section><h1>Favorites</h1><HistoryList items={favorites} favorites onCopy={copy} onStar={star} onDelete={remove} canLoadMore={false} /></section>}
    </main>
    <footer>Keep it natural. Keep it you. 💜<small>Replies are saved on the server so you don't get repeats. Conversation messages and the reply you mark as sent stay in this tab's session storage and are sent to the AI provider with follow-up messages. The provider has its own retention policy.</small><a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a></footer>
  </div>;
}
