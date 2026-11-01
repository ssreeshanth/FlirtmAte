import { VIBES } from '../../shared/constants.js';

export default function ReplyCard({ item, onCopy, onStar, copied, onUse, selected, selectionMade }) {
  const vibe = VIBES.find((entry) => entry.id === item.vibe);
  return <article className="reply-card">
    <div className="card-heading"><span aria-hidden="true" className="vibe-emoji">{vibe?.emoji}</span><div><h3>{vibe?.name || item.vibe}</h3><p>{vibe?.description}</p></div></div>
    <p className="reply-text" data-testid={`reply-text-${item.id}`}>{item.reply}</p>
    <div className="card-actions">
      <button type="button" onClick={() => onCopy(item)}>{copied ? 'Copied' : 'Copy'}</button>
      {onUse && <button type="button" aria-pressed={Boolean(selected)} disabled={selectionMade && !selected} onClick={() => onUse(item)}>{selected ? 'Sent' : 'I sent this'}</button>}
      <button type="button" aria-pressed={Boolean(item.starred)} onClick={() => onStar(item)}>{item.starred ? 'Unstar' : 'Star'}</button>
    </div>
  </article>;
}
