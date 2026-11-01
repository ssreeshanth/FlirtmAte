# FlirtMate

FlirtMate turns a pasted message into six distinct replies across six flirting vibes.
The frontend is React + Vite and the backend is Node.js/Express with SQLite storage.
The project is developed and tested on Node 24; Node 22.12 or newer is required.

## Setup

```sh
npm install
cp .env.example .env
npm run start:all
```

Useful scripts:

- `npm run dev` starts the Vite development server with the API mounted in the same process.
- `npm run server` starts the standalone API server.
- `npm run build` creates the production frontend.
- `npm start` serves the built frontend and API from one process.
- `npm test` runs unit, integration, and DOM tests.
- `npm run test:e2e` runs Playwright tests with a fake provider.
- `npm run test:live` is reserved for explicitly enabled real-provider checks.
- `npm run check` scans product code and the built bundle.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production build, TLS, secrets, persistent storage,
backups, and operations requirements.

## Provider configuration

Set `AI_PROVIDER` to `openai` or `gemini`, then provide that provider's key and model:
`OPENAI_API_KEY`/`OPENAI_MODEL` or `GEMINI_API_KEY`/`GEMINI_MODEL`. `AI_TEMPERATURE`
defaults to `1`; set it to `off` for models that reject a custom temperature.
In production, provide `SESSION_SECRET` (at least 32 random bytes), the selected provider
key, model, real `PRIVACY_CONTACT_EMAIL`, and an absolute `DB_PATH` on a persistent mounted
volume as environment variables or through your host's secret manager. Placeholder example
keys/contact emails and relative or in-memory production databases are rejected. Generate a
secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
Production mode requires HTTPS and uses secure, HttpOnly, SameSite=Strict session cookies.
Terminate TLS at a trusted reverse proxy and set `TRUST_PROXY` to its exact hop count.
Use a separate database, session secret, and provider key for staging. Configure backups and
test restoring them before launch. The in-memory limits and SQLite setup require a single
application instance; set spending limits and alerts in the provider account.

The OpenAI adapter uses the SDK's Chat Completions `json_schema` response format
with strict mode. The Gemini adapter uses the SDK's `generateContent` JSON MIME
type and response schema. Dependencies are locked in `package-lock.json`; update them
through reviewed lockfile changes.

## Privacy and retention

The server stores generated replies, their language/vibe metadata, stars, and timestamps,
plus normalized reply text used for duplicate prevention. Incoming messages and replies you
mark as sent are kept in this tab's session storage (up to five exchanges) and sent as context
to the selected AI provider with each follow-up. They are not stored in FlirtMate's database.
Starting a new conversation or closing the tab clears the local context. FlirtMate does not
control the provider's retention policy.

Each browser receives a server-signed guest session in an HttpOnly cookie. Sessions expire
after 30 days; **End session** clears the cookie. Clearing browser cookies or using another
browser starts a new history. Histories created by earlier versions using a localStorage ID
are not automatically migrated to the new session identity. Unstarred replies are removed after 90 days and the
per-client cap removes the oldest unstarred replies above 500. Starred replies are exempt.
The cap never deletes the batch just inserted, so a client with many starred replies can
remain above 500. Deletions can leave batches with fewer than six replies. The no-repeat
guarantee covers only replies still stored inside the dedupe windows.

SQLite files on ephemeral filesystems are wiped when the host is recycled; use a persistent
volume or a hosted database for deployment. The in-flight lock and per-process rate limit
are in memory and do not coordinate multiple instances. Configure provider-side usage limits
and alerts; the app does not enforce a monthly spend cap.

Language validation checks script, not whether words are genuinely Tenglish or Hinglish.
The no-stock-pickup-lines, PG-13, and one-to-two-sentence rules are prompt constraints and
are not machine-verified.

## Assumptions and deviations

The implementation uses Express 5 route matching, a memory-safe fallback UUID generator
for insecure origins, and the installed SDK versions listed above. The fake provider is
used only by tests. Live-provider checks remain disabled unless `FLIRTMATE_LIVE` is set.
