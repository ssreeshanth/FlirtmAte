export const LANGUAGES = Object.freeze([
  { id: 'english', label: 'English', style: 'natural conversational English' },
  { id: 'telugu', label: 'Telugu', style: 'Telugu script' },
  { id: 'tenglish', label: 'Telugu + English (Tenglish)', style: 'Telugu written in Latin letters, mixed naturally with English words' },
  { id: 'hinglish', label: 'Hinglish', style: 'conversational Hindi in Latin letters, mixed with English' }
]);

export const VIBES = Object.freeze([
  { id: 'cute', emoji: '🥰', name: 'Cute', description: 'sweet, affectionate, adorable' },
  { id: 'playful', emoji: '😏', name: 'Playful', description: 'light teasing and fun' },
  { id: 'smooth', emoji: '✨', name: 'Smooth', description: 'confident, natural, effortless' },
  { id: 'bold', emoji: '🔥', name: 'Bold', description: 'direct and confident but respectful' },
  { id: 'romantic', emoji: '❤️', name: 'Romantic', description: 'warm and affectionate' },
  { id: 'funny', emoji: '😂', name: 'Funny', description: 'witty, humorous, lighthearted' }
]);

export const FLIRT_LEVELS = Object.freeze([
  { id: 'subtle', label: 'Subtle', instruction: 'Keep the reply natural and add a faint flirt when it fits.' },
  { id: 'balanced', label: 'Balanced', instruction: 'Use relaxed warmth and a small, natural flirt in most replies when it fits the message.' },
  { id: 'very-flirty', label: 'Very flirty', instruction: 'Make romantic interest clearer only when the message gives you a natural opening; always answer the message first.' }
]);

export const LANGUAGE_IDS = Object.freeze(LANGUAGES.map(({ id }) => id));
export const VIBE_IDS = Object.freeze(VIBES.map(({ id }) => id));
export const MESSAGE_MAX_GRAPHEMES = 500;
export const CONVERSATION_CONTEXT_LIMIT = 10;
