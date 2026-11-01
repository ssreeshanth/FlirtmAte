# FlirtMate — Phase 3 of 4: Frontend (welcome, generate, history, favorites)

You are a senior full-stack engineer building "FlirtMate", an AI flirty-reply generator,
in four sequential phases. This prompt covers Phase 3 only: the React frontend on top of
the Phase 2 API. Browser-level end-to-end tests belong to Phase 4.

## How to work
- Work autonomously inside this phase. Do not ask questions; where something is
  unspecified, pick the simplest sound option and record it under "Assumptions" in your
  phase report.
- Section numbers (for example 2.f or 3.6) refer to the full FlirtMate specification. The
  specification extracts below are copied verbatim from it. A reference to a section that
  is not reproduced here points to work outside this phase.
- Finish and verify everything in scope before you report. Do not start work that belongs
  to another phase. Deliver complete files: no placeholders and no TODOs.
- Reporting rule: for every acceptance test, report exactly one of PASS, FAIL, NOT RUN
  (with the reason), or MANUAL (with the evidence you inspected). Never claim a PASS for a
  test you did not execute. Tests that need a live API key or a real browser are NOT RUN
  if that resource is unavailable.

## Starting state
Phases 1 and 2 are complete: the shared modules, the database layer, and the API server
with its integration tests. Before writing anything, run `npm test`, and read
server/app.js and the integration tests to confirm the exact request and response shapes
(the extracts below give the contract; trust the code if they differ, and report the
difference). If the Phase 2 report was pasted above this prompt, use its endpoint contract
as a map. Do not change server code except to fix a genuine defect, and list every such
change in your report.

## What to build in Phase 3
1. vite.config.js: keep the Phase 1 test configuration, and add @vitejs/plugin-react and
    the dev proxy from /api to http://localhost:3001 (section 6).
2. index.html, src/main.jsx, src/App.jsx, src/App.css, src/api.js and src/components/
    (WelcomeScreen, ReplyCard, HistoryList, and any others you need), implementing
    sections 1.5 to 1.8 and 6.
3. Component tests under tests/dom.

## Clarifications for this phase
- Import only from shared/ (never from server/ or tests/).
- src/api.js attaches X-Client-Id to every call. Create the client id with
  crypto.randomUUID() when it exists, otherwise build a UUID v4 from
  crypto.getRandomValues (randomUUID is unavailable on insecure origins). Wrap localStorage
  access in try/catch with an in-memory fallback (section 1.6).
- Choose the error message by the `code` field of the JSON error contract; when there is no
  response at all, show the network-error message (section 6).
- A batch in History or Favorites can contain fewer than six replies; render what comes
  back. The language of each item comes from the API, shown as its label from the shared
  constants.
- Do not add a demo, mock, or sample mode so that the UI can be seen working: that would
  violate section 2. Without a provider key you cannot generate real replies in this
  phase. Verify through component tests (fetch and clipboard mocked inside tests/ only)
  and a successful `npm run build`; browser-level verification happens in Phase 4.
- Every dom test file starts with the `// @vitest-environment jsdom` docblock, so that the
  unit and integration tests stay on the node environment.
- Use accessible roles and labels for everything a test or a user touches. Add data-testid
  only where no accessible name exists, and list each one in your report (Phase 4's
  end-to-end tests reuse the same queries).
- Do not read import.meta.env and do not reference server environment variable names
  anywhere under src/ (Phase 4 searches the bundle for them).
- Build for the requirements of section 1.8 now (320 px layout, focus states, aria-live
  regions, reduced motion, skeletons without reply-like text); Phase 4 verifies them in a
  real browser.

## Component tests to write
Besides acceptance tests 4, 13 and 14, cover each behavior of section 6: Generate disabled
states (empty, whitespace, over 500 graphemes, request in flight); AbortController use and
ignoring stale responses; Regenerate and New message aborting the in-flight request;
optimistic star with rollback and an error message; a distinct message for the network
error and for each error code; History "Load more" using the cursor; the "Clear all
history" confirm step naming the starred replies; empty states without sample text; and
skeletons with no reply-like text.

================================================================================
SPECIFICATION EXTRACTS (copied verbatim from the full specification)
================================================================================

Sections 2, 3.4, 3.5 and 4 are reproduced only as excerpts, limited to what the frontend
needs. Section 7 lists the whole project for orientation; this phase creates only the files
named in "What to build in Phase 3".

# 1. PRODUCT
A user pastes a message they received from a crush or partner, picks a language once at
launch, and gets six distinct replies, one per flirting vibe, all in that language. Each
reply can be copied, starred, and revisited later. Replies must never be hard-coded and
must never repeat (within the dedupe window defined in section 2).

## 1.1 Stack
- Frontend: React + Vite (JavaScript, no TypeScript).
- Backend: Node.js 22 LTS or newer. Set "engines" to ">=22.12.0" in package.json (Node 20
  is end-of-life, and current Vite needs 22.12+ on the 22 line). Develop and test on
  Node 24 LTS and state this in the README. Express, ES modules.
- Storage: SQLite via better-sqlite3.
- AI provider: switchable between OpenAI and Gemini via env, behind one adapter file.

## 1.2 Languages (exactly four, allow-listed, stable ids)
Each language has a stable `id` (used in the API, the database, and code), a display
`label`, and a `style` description used in prompts. Styles contain no sample sentences.
- id "english", label "English": natural conversational English.
- id "telugu", label "Telugu": Telugu script.
- id "tenglish", label "Telugu + English (Tenglish)": Telugu written in Latin letters,
  mixed naturally with English words.
- id "hinglish", label "Hinglish": conversational Hindi in Latin letters, mixed with
  English.
Define these once in shared/constants.js, used by both the client and the server. The API
accepts and returns ids only; labels are for display.

## 1.3 Vibes (exactly six, fixed order, stable ids, defined once in shared constants)
Each vibe has `id`, `emoji`, `name`, `description`:
1 cute, 🥰 Cute: sweet, affectionate, adorable
2 playful, 😏 Playful: light teasing and fun
3 smooth, ✨ Smooth: confident, natural, effortless
4 bold, 🔥 Bold: direct and confident but respectful
5 romantic, ❤️ Romantic: warm and affectionate
6 funny, 😂 Funny: witty, humorous, lighthearted
Always generate all six. The user never picks one vibe. The API, schema, and database use
the vibe `id`; the client maps it to emoji, name, and description from shared constants.

## 1.4 Text measurement rules (single source of truth: shared/text.js)
Export and use on BOTH client and server:
- `graphemeLength(str)`: number of grapheme clusters via `Intl.Segmenter` (granularity
  "grapheme"). All length limits (500 for the incoming message, 200 for a reply) use this.
- `countEmoji(str)`: number of grapheme clusters that are emoji. A cluster counts as ONE
  emoji if any of these holds: it contains `\p{Extended_Pictographic}` (covers skin-tone
  modifiers and ZWJ sequences such as family emoji, which are single clusters); it is a
  pair of regional-indicator characters (`\p{Regional_Indicator}`), i.e. a flag; or it is
  a keycap sequence (one of `0-9`, `#`, `*`, followed by optional U+FE0F and then U+20E3).
  A bare digit, `#`, or `*` without U+20E3 is NOT an emoji.
- `normalizeForCompare(str)`: NFKC, lowercase, remove every character that is not
  `\p{L}`, `\p{M}`, `\p{N}` or whitespace (this strips emoji and punctuation, and keeps
  Telugu and Devanagari intact), collapse whitespace, trim. Never use `\w`. If the result is an empty string, the reply
  has no meaningful letter or number content and is invalid (see 2.f).
Do not use the textarea `maxLength` attribute (it counts UTF-16 units). Instead show the
live counter using `graphemeLength`, mark it as over limit above 500, and disable
Generate. The server additionally rejects any message longer than 2000 UTF-16 units
before segmenting, to prevent pathological input.
Sentence count ("1 to 2 sentences") is enforced by the prompt only; the server does NOT
validate sentence count, because sentence punctuation differs across these languages.

## 1.5 Screens
Screen A, Welcome: logo, app name, one-line intro, four language options (none
preselected), "Start FlirtMate" button disabled until a language is chosen.
Screen B, Main (three tabs in one screen: Generate, History, Favorites):
 Generate tab order: header/logo, read-only language badge, textarea for the incoming
 message with a live character counter (max 500), "Generate All Vibes" button, loading
 state, six reply cards, error area. Footer on all tabs: "Keep it natural. Keep it you. 💜"
 and the privacy note: "Replies are saved on the server so you don't get repeats. Your
 pasted messages are not stored by FlirtMate, but they are sent to the AI provider
 (OpenAI or Gemini) to write the replies, and that provider has its own retention policy."
Card contents: vibe emoji + name, one-line vibe description, reply text, Copy button, Star
button. After results appear, show a "Regenerate" button (same message, fresh replies)
and a "New message" button (clears the textarea and results). Regenerate and New message
abort any in-flight request first.
History and Favorites show replies from ALL languages for the client; each item displays
its language label. Deduplication, however, is per client and per language.

## 1.6 Language lock
- `languageChoice` ("") and `language` (null) live ONLY in React state. `language` holds a
  language id.
- Starting the app sets `language` from `languageChoice`. If `language` is null, show
  Screen A; otherwise Screen B.
- No language-change control on Screen B. No cookies, sessionStorage, or localStorage for
  language. A page reload returns to Screen A.
- The one permitted localStorage entry is "flirtmate_client_id" (see section 4). Wrap
  storage access in try/catch; if storage is blocked, keep the id in memory for the
  session.

## 1.7 Copy
navigator.clipboard.writeText in try/catch. Show "Copied" on that card only for ~1.5 s.
On failure show a readable error and fall back to selecting the text.

## 1.8 Visual and accessibility requirements
Dark purple theme, pink/violet accents, rounded cards, mobile-first responsive layout
(works from 320 px up, no horizontal scroll), visible focus states, labelled form
controls, aria-live regions for loading and errors, buttons reachable by keyboard,
sufficient contrast, respects prefers-reduced-motion. Skeleton placeholders during
loading must contain NO text that looks like a reply.

# 5. OTHER ENDPOINTS (all require X-Client-Id; `:id` must be a positive integer, else 400)
- GET /api/history?limit=30&cursor=<opaque>: paginated batches, newest first, ordered by
  (created_at DESC, id DESC). `limit` is an integer from 1 to 100 (default 30). The cursor
  is an opaque base64url string encoding `created_at:batch_id` of the last returned batch;
  the next page returns batches strictly before that pair using the same ordering.
  Invalid cursors return 400. Response: `{ batches: [ { id, language, createdAt,
  replies: [...] } ], nextCursor | null }`, with each batch listing its remaining replies
  (one to six). No message text.
- GET /api/favorites: all starred replies for this client, newest first, each with its
  language id and created_at.
- POST /api/replies/:id/star  body { starred: boolean } (400 if not a boolean).
- DELETE /api/replies/:id.
- DELETE /api/history: removes all of this client's batches and replies, INCLUDING
  starred ones.

# 6. FRONTEND BEHAVIOR
- State: languageChoice, language, message, replies, loading, copied, error, tab,
  history, favorites. Message text is never persisted anywhere.
- Generate disabled when the trimmed message is empty, over 500 graphemes, or a request is
  in flight. Use AbortController; ignore stale responses. Regenerate and New message abort
  the in-flight request first. The server releases its lock when the connection closes, so
  a quick resend should work; if it still gets code "in_flight", show the in_flight
  message below.
- Star: optimistic update with rollback and error message on failure.
- History and Favorites tabs: each reply shows language label, time, Copy, Star/Unstar,
  Delete. "Clear all history" requires a confirm step whose text states that starred
  replies will be deleted too. "Load more" (or infinite scroll) for History using the
  cursor. Empty states are plain sentences, never sample replies.
- Distinct readable messages, chosen by `code` (and for network failure, by the absence
  of a response): network error, bad_request, rate_limited, in_flight, bad_output,
  provider_error, provider_busy, timeout, internal. Never show raw server or provider text
  beyond the server's readable `error` string.
- Vite dev proxy: /api to http://localhost:3001.

# 7. PROJECT STRUCTURE
flirtmate/
 shared/ constants.js, text.js
 src/ App.jsx, App.css, main.jsx, components/ (WelcomeScreen, ReplyCard, HistoryList,
   etc.), api.js
 server/ index.js, app.js, config.js, db.js, retention.js, limits.js, prompt.js,
   validate.js, similarity.js, languageCheck.js, angles.js, providers/ai.js
 tests/ (unit, integration, dom, e2e, live, and fake-provider fixtures; nothing here is
   imported by product code)
 scripts/ check-hardcoded.js, check-bundle.js
 index.html, vite.config.js, package.json, .env.example, .gitignore, README.md
Scripts: "dev" (vite), "server" (node server/index.js), "start:all" (concurrently run
both), "build" (vite build), "start" (cross-env NODE_ENV=production node
server/index.js), "test" (vitest run: unit, integration, dom), "test:e2e" (Playwright,
uses a test-only server entry under tests/ that wires the fake provider), "test:live"
(optional, needs a real key), "check" (runs scripts/check-hardcoded.js and, after a
build, scripts/check-bundle.js).
Dependencies: express, better-sqlite3, dotenv, helmet, express-rate-limit, cors, openai,
@google/genai, react, react-dom, cross-env; dev: vite, @vitejs/plugin-react, concurrently,
vitest, supertest, jsdom, @testing-library/react, @testing-library/user-event,
@playwright/test. "engines": { "node": ">=22.12.0" } (Node 20 is end-of-life; 22.12+ satisfies current
Vite). Use .nvmrc or equivalent pointing at Node 24.

## 2. HARD RULE: NO HARD-CODED OR REPEATED REPLIES (EXCERPT: rules that bind the frontend)
- No reply text anywhere in product code: no mock data, no fallback replies, no sample
  cards, no demo mode. On failure show an error and an empty state, never canned text.
- Test fixtures with fake model output may exist ONLY under tests/ and must never be
  imported by product code.

## 3.4 Error contract (EXCERPT)
Every error response is JSON `{ "error": "<readable message>", "code": "<code>" }`:
| Situation | HTTP | code |
|---|---|---|
| Validation failure (message, language, client id, :id param) | 400 | bad_request |
| Resource missing or belongs to another client | 404 | not_found |
| IP rate limiter tripped (include Retry-After) | 429 | rate_limited |
| Second concurrent generation for the same client id | 429 | in_flight |
| All attempts rejected by validation, language check, or dedupe | 502 | bad_output |
| Provider auth failure or unknown provider error (generic message) | 502 | provider_error |
| Provider rate limit | 503 | provider_busy |
| Per-attempt or total timeout | 504 | timeout |
| Anything else | 500 | internal |

## 3.5 POST /api/generate-replies (EXCERPT: request and validation)
Headers: X-Client-Id (UUID v4, required). Body: { message, language } where language is a
language id.
Validation (400 bad_request, clear message): message is a string, trimmed,
1 to 500 graphemes (and at most 2000 UTF-16 units); language is one of the four ids; client
id is a valid UUID v4.

## 3.5 POST /api/generate-replies (EXCERPT: success response, HTTP 200)
    `{ batchId, language, replies: [ { id, vibe, reply, starred:false } x6 ] }`
    where `language` and `vibe` are ids.

## 4. STORAGE (EXCERPT: anonymous identity)
- Anonymous identity: the client generates a random UUID v4, saves it in localStorage as
  "flirtmate_client_id", and sends it as X-Client-Id on every API call. It is an
  identifier, not authentication: anyone who learns an id can read that client's data. Note
  this limitation in the README.

================================================================================
ACCEPTANCE TESTS FOR THIS PHASE
================================================================================

Method tags: [unit/integration] vitest + supertest with the fake provider; [dom] vitest +
jsdom + Testing Library; [e2e] Playwright; [script] scripts/ checks; [live] needs a real
API key, optional, NOT RUN if no key; [manual] human review of evidence.

 4. [dom] Empty or whitespace message: no request sent. [integration] Server returns 400.
    >> PHASE SCOPE: Verify the [dom] half: no request is sent for an empty or whitespace
       message. The server half was verified in Phase 2.
13. [dom] Copy copies only that card's text.
    >> PHASE SCOPE: Verify fully.
14. [dom] and [e2e] Reload shows the welcome screen; localStorage contains only
    flirtmate_client_id.
    >> PHASE SCOPE: Verify the [dom] half. The [e2e] half is Phase 4.

================================================================================
PHASE REPORT AND STOP
================================================================================

## Phase 3 report (your final message)
1. What was built: the files created or changed, one line each.
2. Selectors: every data-testid you had to add and why, plus the accessible roles and
   labels of the main controls. Phase 4's end-to-end tests rely on this.
3. Test results: the `npm test` and `npm run build` outcomes, then PASS / FAIL / NOT RUN /
   MANUAL for each acceptance test listed above, stating which half was verified.
4. Assumptions and deviations, including every clarification you had to make and any
   difference you found between the extracts and the Phase 2 code.
5. Ready for Phase 4: yes or no, with any blockers.

## Stop
After the report, stop. Do not begin Phase 4 until the user replies with a go-ahead
(for example "proceed to Phase 4"). If the user asks for changes first, make them and
report again.
