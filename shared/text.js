const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const extendedPictographic = /\p{Extended_Pictographic}/u;
const regionalIndicator = /^\p{Regional_Indicator}{2}$/u;
const keycap = /^[0-9#*]\uFE0F?\u20E3$/u;

export function graphemes(str) {
  if (typeof str !== 'string') throw new TypeError('Expected a string');
  return [...segmenter.segment(str)].map(({ segment }) => segment);
}

export function graphemeLength(str) {
  return graphemes(str).length;
}

export function countEmoji(str) {
  return graphemes(str).filter((cluster) =>
    extendedPictographic.test(cluster) || regionalIndicator.test(cluster) || keycap.test(cluster)
  ).length;
}

export function normalizeForCompare(str) {
  if (typeof str !== 'string') throw new TypeError('Expected a string');
  return str.normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}
