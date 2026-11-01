import { VIBE_IDS } from '../shared/constants.js';
import { countEmoji, graphemeLength, normalizeForCompare } from '../shared/text.js';
import { REPLY_MAX_EMOJI, REPLY_MAX_GRAPHEMES, REPLY_MAX_WORDS, DEDUPE_WINDOW } from './limits.js';
import { areSimilar, firstThreeTokens } from './similarity.js';
import { checkLanguage } from './languageCheck.js';

export const outputSchema = {
  type: 'object', additionalProperties: false, required: ['replies'],
  properties: { replies: { type: 'array', minItems: 6, maxItems: 6, items: {
    type: 'object', additionalProperties: false, required: ['vibe', 'reply'],
    properties: { vibe: { type: 'string', enum: VIBE_IDS }, reply: { type: 'string' } }
  } } }
};

const invalid = (reason, replies = []) => ({ accepted: false, reason, rejectedReplies: replies.filter((x) => typeof x === 'string') });

export function asksWhatDoing(message, language) {
  const text = String(message || '').normalize('NFC').toLocaleLowerCase();
  if (language === 'tenglish') return /\b(em|emi)\b.*\b(chestunnav|chestunav|chesthunnav|chestunnavu)\b/u.test(text);
  if (language === 'english') return /\bwhat\s+(?:(?:are|r)\s+)?(?:you|u)\s+(?:doing|up\s+to)\b|\bwhat'?s\s+up\b/u.test(text);
  return false;
}

function answersWhatDoing(reply, language) {
  const text = reply.normalize('NFC').toLocaleLowerCase();
  if (/thinking\s+(?:of|about)\s+(?:you|u)|\bmiss(?:ing)?\s+(?:you|u)\b|gurtosth|gurtoc|talchuk|alochis/u.test(text)) return false;
  if (language === 'tenglish') return /\b(em\s+ledu|just|chill|relax|work|study|chestunn|chustunn|tintunn|tagutunn|vintunn|padukuntunn|avtunn|avutunn|busy|free|time\s+pass)\w*/u.test(text);
  return /\b(not\s+much|nothing\s+much|just|tak\w*|grab\w*|relax\w*|chill\w*|work\w*|study\w*|eat\w*|watch\w*|read\w*|listen\w*|cook\w*|mak\w*|smil\w*|sleep\w*|rest\w*|busy|free)\b/u.test(text);
}

const WHAT_DOING_FALLBACKS = {
  english: [
    ['Just relaxing, glad you texted', 'Taking it easy for now'],
    ['Working, your text is a nice break', 'Just procrastinating a bit, you?'],
    ['Taking it easy, want to keep me company?', 'Just chilling right now, you?'],
    ['Free right now, are you distracting me?', 'Nothing much, what about you?'],
    ['Just smiling at your message', 'Taking a little breather'],
    ['Grabbing coffee, want one too?', 'Just dodging my to-do list']
  ],
  tenglish: [
    ['Em ledu, just chill avtunna. Nuvvu?', 'Nenu koncham relax avtunna'],
    ['Work chestunna, nee msg chusi break teeskunna.', 'Time pass chestunna, nuvvu?'],
    ['Nenu ippudu relax avtunna, nuvvu?', 'Chill avtunna, nuvvu?'],
    ['Free ga unna, nuvvu call chesthava?', 'Just free ga unna, nuvvu?'],
    ['Nenu coffee tagutunna, neeku kuda kavala?', 'Nenu music vintunna ippudu'],
    ['Time pass chestunna, nee msg tho better.', 'Nenu snack tintunna ippudu']
  ]
};

export function findWhatDoingFallback(language, storedReplies = []) {
  const options = WHAT_DOING_FALLBACKS[language];
  if (!options) return null;
  for (const history of [storedReplies, []]) {
    for (let mask = 0; mask < 2 ** options.length; mask++) {
      const replies = VIBE_IDS.map((vibe, index) => ({ vibe, reply: options[index][(mask >> index) & 1] }));
      const result = validateProviderOutput({ replies }, { language, message: language === 'tenglish' ? 'Em chestunnav?' : 'What are you doing?', storedReplies: history });
      if (result.accepted) return result.replies;
    }
  }
  return null;
}

export function validateProviderOutput(output, { language, storedReplies = [], message } = {}) {
  if (!output || typeof output !== 'object' || !Array.isArray(output.replies)) return invalid('output must be an object with replies');
  if (output.replies.length !== VIBE_IDS.length) return invalid('wrong reply count', output.replies.map((x) => x?.reply));
  if (output.replies.some((item, index) => !item || item.vibe !== VIBE_IDS[index] || typeof item.reply !== 'string')) {
    return invalid('wrong vibe order or reply shape', output.replies.map((x) => x?.reply));
  }
  if (asksWhatDoing(message, language) && output.replies.some((item) => !answersWhatDoing(item.reply, language))) {
    return invalid('reply does not answer the what-are-you-doing question', output.replies.map((item) => item.reply));
  }
  const prepared = [];
  for (const item of output.replies) {
    const reply = item.reply;
    const normalized = normalizeForCompare(reply);
    if (!reply.trim() || reply.trim().split(/\s+/u).length > REPLY_MAX_WORDS || graphemeLength(reply) > REPLY_MAX_GRAPHEMES || countEmoji(reply) > REPLY_MAX_EMOJI || !normalized || !/\p{L}/u.test(reply)) {
      return invalid('reply content rejected', output.replies.map((x) => x.reply));
    }
    if (!checkLanguage(reply, language)) return invalid('reply language rejected', output.replies.map((x) => x.reply));
    prepared.push({ ...item, normalized, first3: firstThreeTokens(normalized) });
  }
  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      if (areSimilar(prepared[i].normalized, prepared[j].normalized) || prepared[i].first3 === prepared[j].first3) {
        return invalid('duplicate or similar replies', output.replies.map((x) => x.reply));
      }
    }
  }
  const recent = storedReplies.slice(0, DEDUPE_WINDOW);
  for (const item of prepared) {
    const similarStored = recent.find((old) => old.normalized && areSimilar(item.normalized, old.normalized));
    if (similarStored) return invalid('similar to stored reply', [...output.replies.map((x) => x.reply), similarStored.reply]);
  }
  return { accepted: true, replies: prepared };
}
