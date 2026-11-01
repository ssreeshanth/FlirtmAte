import { LANGUAGES, VIBES } from '../../shared/constants.js';

export default function HistoryList({ items, favorites = false, onCopy, onStar, onDelete, onLoadMore, canLoadMore }) {
  const replies = favorites ? items : items.flatMap((batch) => batch.replies.map((reply) => ({ ...reply, language: batch.language })));
  if (!replies.length) return <p className="empty-state">Nothing here yet.</p>;
  return <div className="history-list">
    {replies.map((item) => <article className="history-item" key={`${item.id}-${item.language}`}>
      <div className="history-meta"><span>{LANGUAGES.find((language) => language.id === item.language)?.label || item.language}</span><span>{VIBES.find((vibe) => vibe.id === item.vibe)?.name || item.vibe}</span></div>
      <p className="reply-text">{item.reply}</p>
      <div className="card-actions"><button type="button" onClick={() => onCopy(item)}>Copy</button><button type="button" onClick={() => onStar(item)}>{item.starred ? 'Unstar' : 'Star'}</button><button type="button" onClick={() => onDelete(item)}>Delete</button></div>
    </article>)}
    {canLoadMore && !favorites && <button type="button" className="secondary-button" onClick={onLoadMore}>Load more</button>}
  </div>;
}
