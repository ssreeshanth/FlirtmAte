# Deployment

FlirtMate is a single Node.js service. Vite is used to build the frontend; Express serves
the built frontend and API in production. Use Node.js 24 and deploy one application
instance unless the SQLite database and rate-limit/session stores are replaced with shared
services.

## Build and start

```sh
npm ci
npm run check
npm test
npm run test:e2e
npm run build
npm start
```

The production server refuses plain HTTP. Terminate TLS at the ingress or reverse proxy,
preserve the original Host header, forward `X-Forwarded-Proto: https`, and set `TRUST_PROXY`
to the exact number of trusted proxy hops. Do not expose the Node service directly to the
public network when the ingress is available.

## Required production configuration

- Set `NODE_ENV=production`.
- Set `AI_PROVIDER`, its matching real API key, and its model (`OPENAI_*` or `GEMINI_*`).
- Set `SESSION_SECRET` to at least 32 random bytes. Generate one with:
  `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- Set `PRIVACY_CONTACT_EMAIL` to an operator-controlled address.
- Set `DB_PATH` to an absolute path on a persistent mounted volume, for example
  `/var/lib/flirtmate/flirtmate.db`.
- Set `TRUST_PROXY` for the deployment topology. Keep the configured daily generation limit
  conservative and also set provider-side spending limits and alerts.

Production startup rejects missing session secrets, placeholder provider values, example
contact addresses, and relative or in-memory database paths. Store secrets in the host's
secret manager and provide them as environment variables; do not place production values in
`.env` or a container image.

## Operations before launch

- Use a separate database, session secret, and provider key for staging.
- Restrict the persistent database volume to the service account and enable the hosting
  provider's encryption at rest. SQLite is a file database and is not encrypted by this app.
- Configure scheduled backups of the persistent volume, keep backups outside the web root,
  and perform a restore test before launch and periodically afterward.
- Configure uptime monitoring against `/api/health`, centralized log retention, and error
  monitoring. Request bodies and generated content are intentionally omitted from logs.
- Keep one app instance: session revocation and request limits use local SQLite/in-memory
  state and are not coordinated across replicas.
- Keep the last known-good build available for rollback. Back up the database before
  deploying schema changes.
- Publish the Privacy Policy and have the operator review it for the regions served and the
  selected AI provider's current retention terms.
