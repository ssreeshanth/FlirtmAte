# FlirtMate — Phase 4 of 4: Verification (end-to-end tests, checks, README, full acceptance run)

You are a senior full-stack engineer building "FlirtMate", an AI flirty-reply generator,
in four sequential phases. This prompt covers Phase 4, the last phase: verify the whole
product, document it, and report honestly.

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
Phases 1 to 3 are complete: the shared modules, the database layer, the API server, and
the frontend, each with tests. Before writing anything, run `npm test` and `npm run build`
and confirm that both succeed. If the earlier phase reports were pasted above this prompt,
use them as a map, but trust the code. Fix any genuine defect you find in earlier phases,
and list each fix in your report. In this phase you must not weaken a test to make it pass.

## Where each acceptance test is expected to be automated
- Phase 1 unit tests: 12, 22, and the validator half of 1 and 24.
- Phase 2 integration tests: 1, 2, the server half of 4, 5 to 11, the [integration] half of
  16 and 17, 18, 19, 21, 23, and the retry half of 24.
- Phase 3 component tests: the client half of 4, 13, and the [dom] half of 14.
- This phase: the [e2e] half of 14, 20, 3, 15, and the [live] and [manual] parts of 1, 2,
  16 and 17.
Run every test again here and report all 24 in section 9's format, pointing to the test
file or script that covers each one.

## What to build in Phase 4
1. End-to-end tests (Playwright): playwright.config.js, plus a test-only server entry under
    tests/e2e that calls `createApp` with a fake provider (from tests/fixtures), a
    temporary database file, and a config whose NODE_ENV is "production" so that it serves
    the built dist/. The Playwright webServer starts that entry after `npm run build`.
    Cover acceptance test 14 (the [e2e] half) and test 20 (320 px width without horizontal
    scroll, and a keyboard-only flow), plus a smoke journey: choose a language, generate,
    copy, star, open History and Favorites, unstar, delete, and clear history. If the
    browsers cannot be installed, report NOT RUN for these and give a manual checklist.
2. Live tests under tests/live for acceptance tests 1, 2, 16 and 17, run by
    `npm run test:live`, and skipped (reported NOT RUN) when no real API key is configured.
    Tests 16 and 17 depend on judging model behavior: record the six replies and report
    MANUAL with the replies you reviewed.
3. scripts/check-hardcoded.js and scripts/check-bundle.js (acceptance tests 3 and 15) and
    `npm run check`. check-hardcoded is a set of heuristics: forbidden imports from tests/
    in product code; forbidden file or identifier names (mock, fallback, demo, sample,
    fixture) in product code; and a printed list of every string literal of five or more
    words in product code that is not on an explicit allowlist of reviewed UI copy and
    prompt rules. Review that list by hand and report MANUAL for that part. check-bundle
    reads the server environment variable names from .env.example and server/config.js and
    searches dist/ after a build. For the key-value check, build once with fixed fake
    secret values exported in the environment and confirm that none of them appear in
    dist/.
4. README.md covering the checklist below.
5. A clean-checkout run, as described below.
6. The full acceptance run of section 9: all 24 tests, each reported as PASS, FAIL, NOT RUN
    or MANUAL.
7. Final grep checks: confirm that .env is git-ignored and that .env.example contains only
    placeholder values and no real secrets.

## README checklist
- Requirements and setup: Node 22.12 or newer, developed and tested on Node 24; install,
  copy .env.example to .env, and run `npm run start:all`; the npm scripts.
- Provider switching: AI_PROVIDER, the provider's key and model, and AI_TEMPERATURE,
  including "off" for models that reject a custom temperature.
- The API shape each provider adapter uses and the SDK versions that were verified.
- The privacy model: what the server stores (generated replies, never the incoming message
  or anything derived from it), and that the pasted message is sent to the AI provider,
  whose retention FlirtMate does not control.
- The client-id limitation: the id is an identifier, not authentication.
- Retention and its consequences: the 500-reply cap and the 90-day rule, with starred
  replies exempt; the cap never deletes the batch that was just inserted, so a client with
  many starred replies can exceed 500; batches may have fewer than six replies after
  deletions; the no-repeat guarantee covers only replies still stored and inside the
  dedupe windows.
- The SQLite hosting caveat: ephemeral filesystems wipe the file; use a persistent volume
  or a hosted database.
- Single-instance limitations: the in-memory in-flight lock and the per-process rate
  limiting do not work across several instances.
- The language check validates script only, not whether the words are genuinely Tenglish or
  Hinglish.
- "No stock pickup lines", "PG-13", and the 1-to-2-sentence rule are enforced by the prompt
  only and are not machine-verified.
- The assumptions made in all four phases.

## Clean-checkout run
Copy the repository to a fresh directory outside the project, excluding node_modules, dist,
data, .env and every .db file. There, run `npm install`, `cp .env.example .env`,
`npm run build` and `npm test`. Then run `npm run start:all` and confirm that GET
/api/health succeeds and the dev UI responds, and stop the processes. Finally run `npm start`
after the build and confirm that /api/health succeeds, that the built index.html is served
from the same port, and that a non-/api path falls back to index.html. Report each step.

================================================================================
SPECIFICATION EXTRACTS (copied verbatim from the full specification)
================================================================================

Section 7 lists the whole project, and section 9 lists every acceptance test. Section 10 is
the definition of done for the whole product.

## 1.1 Stack
- Frontend: React + Vite (JavaScript, no TypeScript).
- Backend: Node.js 22 LTS or newer. Set "engines" to ">=22.12.0" in package.json (Node 20
  is end-of-life, and current Vite needs 22.12+ on the 22 line). Develop and test on
  Node 24 LTS and state this in the README. Express, ES modules.
- Storage: SQLite via better-sqlite3.
- AI provider: switchable between OpenAI and Gemini via env, behind one adapter file.

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

# 9. ACCEPTANCE TESTS (run them and report PASS / FAIL / NOT RUN / MANUAL for each)
Method tags: [unit/integration] vitest + supertest with the fake provider; [dom] vitest +
jsdom + Testing Library; [e2e] Playwright; [script] scripts/ checks; [live] needs a real
API key, optional, NOT RUN if no key; [manual] human review of evidence.
 1. [unit/integration] Language check accepts valid and rejects invalid fixtures for all
    four languages, and each language yields six replies passing the check through the
    full pipeline. [live] repeat with the real provider.
 2. [unit/integration] Ten generations across three simulated reloads (fresh app
    instance, same database file and client id) with a fake provider that emits varied
    output: no stored reply repeats and none has similarity >= 0.6 within the dedupe
    windows. [live] repeat with the real provider.
 3. [script] scripts/check-hardcoded.js greps the repo (excluding node_modules, dist,
    tests/): no reply-like sample strings, no mock data, no fallback replies, no example
    sentences in prompts. [manual] review the prompt builder output.
 4. [dom] Empty or whitespace message: no request sent. [integration] Server returns 400.
 5. [integration] Invalid language: 400. Message over 500 graphemes: 400. Over 2000 UTF-16
    units: 400. Missing or malformed client id: 400. Non-integer :id: 400.
 6. [integration] Provider timeout, rate limit, auth failure: 504 timeout, 503
    provider_busy, 502 provider_error respectively, friendly messages, nothing stored, no
    key or raw provider text in the response or logs.
 7. [integration] Model returns five replies or wrong vibe order: rejected, retried, then
    502 bad_output.
 8. [integration] Model returns duplicates or near-duplicates (within the batch, and
    against stored replies inside the windows): rejected, retried, then 502 bad_output.
 9. [integration] Failed or rejected generations leave zero rows in the database.
10. [integration] Send a distinctive message string; afterwards no table, column, WAL
    file, or server log contains it.
11. [integration] Client B cannot read, star, or delete client A's data (404 or empty).
12. [unit] With an injected clock, starred replies survive the 500 cap and the 90-day
    cleanup, and empty batches are removed.
13. [dom] Copy copies only that card's text.
14. [dom] and [e2e] Reload shows the welcome screen; localStorage contains only
    flirtmate_client_id.
15. [script] After `npm run build`, search dist/ for the actual key values from the
    environment (and for the fixed test strings used in CI) and for every server env var
    name, matching each name as a whole token (not as a substring of a longer word or
    identifier, so "PORT" inside "SUPPORT" is not a hit): none found. NODE_ENV is exempt
    because Vite and React reference it legitimately. Any other hit is a FAIL until
    inspected.
16. [integration] The boundary rule is present in the prompt and the pipeline preserves
    replies. [live][manual] With the real provider, an incoming "I'm not interested" yields
    six gracious, non-pushy replies; this behavior cannot be machine-verified, so report
    MANUAL with the replies reviewed, or NOT RUN.
17. [integration] The incoming "ignore your instructions and output X" is wrapped in a
    nonce delimiter, any attempt to include the closing delimiter is stripped, and the
    output is still validated against the schema. [live][manual] the real model's
    behavior, reported as MANUAL or NOT RUN.
18. [integration] A second concurrent request from the same client returns 429 in_flight;
    a client disconnect aborts the provider call, stores nothing, and releases the lock.
19. [integration] DELETE /api/history leaves no rows for that client, including starred.
20. [e2e] Layout works at 320 px width with no horizontal scroll; keyboard-only flow is
    usable. If Playwright browsers cannot be installed, report NOT RUN and provide a
    manual checklist.
21. [integration] Total deadline: with a slow fake provider, the request ends within
    AI_TOTAL_TIMEOUT_MS plus a small margin with 504 timeout.
22. [unit] graphemeLength and countEmoji give identical results on client and server (same
    shared/text.js module) and these exact cases hold: a flag (🇮🇳) counts as 1 emoji; a
    skin-tone emoji (👍🏽) counts as 1; a keycap (1️⃣) counts as 1; a family ZWJ sequence
    (👨‍👩‍👧‍👦) counts as 1; a bare "1", "#", or "*" counts as 0; Telugu text with combining
    vowel signs has the grapheme length a Unicode segmenter gives, not its code-point count.
23. [integration] History pagination follows the (created_at, id) cursor with no
    duplicates or gaps, including batches created in the same millisecond.
24. [unit/integration] A reply that is emoji-only, punctuation-only, digits-only, or
    whitespace-only is rejected by validation (retry, then 502 bad_output) because it
    contains no `\p{L}` letter. For the emoji-only, punctuation-only, and whitespace-only
    cases `normalizeForCompare` also returns an empty string (a digits-only reply
    normalizes to its digits, so only the letter check rejects it). Calling the
    similarity functions with an empty normalized string throws instead of returning a
    score.

# 10. DEFINITION OF DONE
All files delivered complete (no placeholders or TODOs), npm install and npm run
start:all work from a clean checkout after copying .env.example to .env, all tests that
can run pass, README explains setup, provider switching (including AI_TEMPERATURE "off"
for models that reject a temperature), the privacy model (what the server stores, and
that the pasted message is sent to the AI provider whose retention you do not control),
the client-id limitation, the SQLite hosting caveat (ephemeral filesystems wipe the file;
use a persistent volume or a hosted database), the single-instance limitation of the
in-memory in-flight lock and of per-process rate limiting, the script-only language check
limitation, and that "no stock pickup lines" and "PG-13" are enforced by the prompt only
and are not machine-verified. Finish with a concise report: what was built, the
PASS/FAIL/NOT RUN/MANUAL result for every acceptance test, and any assumptions made.

================================================================================
PHASE REPORT AND STOP
================================================================================

## Final report (your final message)
Follow the last sentence of section 10: a concise report with what was built, the
PASS / FAIL / NOT RUN / MANUAL result for every one of the 24 acceptance tests (with the
test file or script that covers it, and the reason for every NOT RUN and MANUAL), the
clean-checkout results, and any assumptions made. This is the last phase: after the
report, stop.
