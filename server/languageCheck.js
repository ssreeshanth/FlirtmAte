import { LANGUAGE_IDS } from '../shared/constants.js';

const letter = /\p{L}/u;
const mark = /\p{M}/u;
const telugu = /\p{Script=Telugu}/u;
const latin = /\p{Script=Latin}/u;
const inherited = /\p{Script=Inherited}/u;
const common = /\p{Script=Common}/u;
const tenglishMarkers = new Set('nenu naaku naku naa nuvvu nuv nee neeku neku ninnu ninne em enti enduku ela eppudu ippudu chestunnav chestunnaru chestunna chestunnanu unnav unnava undi untundi ayyindi ayindi kada kadha ledu ledhu avunu sare bagundi baagundi chala chaala ishtam nachindi mari kuda ante kani kaani anduke cheppu cheptunna chusava teesko ra le avtuna avtunna avutunna gurinchi alochistunna thalchukuntunna talchukuntunna'.split(' '));
const hinglishMarkers = new Set('main mai tum aap ho hai hain kya kyun kyu nahi nahin mujhe tumhe tera teri mera meri tumhara tumhari yaar accha acha bahut thoda dil raha rahi rahe hoon hun par bas ab kaise kaisi kaisa bolo batao waise sach pyar pyaar chahiye tumko'.split(' '));

function containsMarker(text, markers) {
  return [...text.normalize('NFC').toLocaleLowerCase().matchAll(/[\p{L}]+/gu)].some(([word]) => markers.has(word));
}

export function checkLanguage(text, language) {
  if (typeof text !== 'string' || !LANGUAGE_IDS.includes(language)) return false;
  const normalized = text.normalize('NFC');
  const letters = [...normalized].filter((ch) => letter.test(ch));
  if (!letters.length) return false;
  if (language === 'telugu') {
    const relevant = [...normalized].filter((ch) => letter.test(ch) || mark.test(ch));
    return relevant.length > 0 && relevant.filter((ch) => telugu.test(ch)).length / relevant.length >= 0.8;
  }
  if (language === 'tenglish' && !containsMarker(normalized, tenglishMarkers)) return false;
  if (language === 'hinglish' && !containsMarker(normalized, hinglishMarkers)) return false;
  for (const ch of normalized) {
    if (letter.test(ch) && !latin.test(ch)) return false;
    if (mark.test(ch) && !(latin.test(ch) || inherited.test(ch) || common.test(ch))) return false;
  }
  return true;
}

export const isLanguageValid = checkLanguage;
