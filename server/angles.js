const vibeGuidance = {
  cute: ['respond to their exact point with gentle sweetness', 'add a small affectionate reaction to their detail', 'sound warm and endearing without baby talk', 'keep the reply soft, simple, and on topic', 'show fondness for what they actually said', 'use a sweet playful reaction to their message', 'sound caring without inventing intimacy', 'make the warmth feel natural and specific'],
  playful: ['use light teasing about their words', 'make a small joke about the situation they described', 'keep the banter easygoing', 'play along with their tone', 'use a quick witty reaction to their detail', 'tease gently without making assumptions', 'keep the joke tied to their message', 'make it fun and conversational'],
  smooth: ['answer naturally with calm confidence', 'keep the wording relaxed and charming', 'sound effortless and direct', 'use a composed, casual tone', 'make the response feel easy to send', 'keep the flirt understated', 'be warm without overexplaining', 'sound confident and genuine'],
  bold: ['be direct and confidently complimentary when their message supports it', 'show clear interest without exaggerating', 'keep the flirt confident but grounded', 'be concise and self-assured', 'say something complimentary only if it fits their message', 'use confident warmth without pressure', 'be straightforward about the playful spark', 'keep the boldness respectful'],
  romantic: ['add a tender note that fits their message', 'sound sincere and affectionate without overclaiming', 'make the warmth specific to what they said', 'show gentle fondness for their detail', 'use a soft romantic tone', 'keep affection grounded in this moment', 'make it heartfelt but still casual', 'add tenderness without making big claims'],
  funny: ['make a brief joke about the detail they mentioned', 'use light situational humor', 'keep it witty without changing the topic', 'make a quick playful observation', 'use a short joke that answers their point', 'keep the humor gentle', 'playfully exaggerate only the situation, not your relationship', 'make it amusing and easygoing']
};

export const ANGLES = Object.freeze(Object.fromEntries(Object.entries(vibeGuidance).map(([vibe, instructions]) => [
  vibe,
  Object.freeze(instructions.map((instruction, index) => ({ id: `${vibe}-${index + 1}`, instruction })))
])));

export function pickAngles(avoidByVibe = {}, random = Math.random) {
  return Object.fromEntries(Object.entries(ANGLES).map(([vibe, pool]) => {
    const avoid = new Set(avoidByVibe[vibe] || []);
    const available = pool.filter((angle) => !avoid.has(angle.id));
    const choices = available.length ? available : pool;
    return [vibe, choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]];
  }));
}
