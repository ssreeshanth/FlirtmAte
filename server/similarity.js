import { normalizeForCompare } from '../shared/text.js';

function requireNormalized(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Similarity input must be non-empty normalized text');
  return value.trim();
}

export function tokenize(normalized) {
  return requireNormalized(normalized).split(/\s+/u);
}

export function jaccardSimilarity(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  const intersection = [...left].filter((x) => right.has(x)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

export function characterTrigramSimilarity(a, b) {
  const left = requireNormalized(a);
  const right = requireNormalized(b);
  const trigrams = (value) => new Set([...value].map((_, i) => value.slice(i, i + 3)).filter((x) => x.length === 3));
  const aSet = trigrams(left);
  const bSet = trigrams(right);
  if (!aSet.size && !bSet.size) return left === right ? 1 : 0;
  const intersection = [...aSet].filter((x) => bSet.has(x)).length;
  return intersection / new Set([...aSet, ...bSet]).size;
}

export function firstThreeTokens(normalized) {
  return tokenize(normalized).slice(0, 3).join(' ');
}

export function areSimilar(a, b, threshold = 0.6) {
  const leftTokens = tokenize(a);
  const rightTokens = tokenize(b);
  const jaccard = jaccardSimilarity(a, b);
  if (jaccard >= threshold) return true;
  if (leftTokens.length < 5 || rightTokens.length < 5) return characterTrigramSimilarity(a, b) >= threshold;
  return false;
}

export function normalized(value) {
  const result = normalizeForCompare(value);
  if (!result) throw new Error('Cannot compare empty normalized text');
  return result;
}
