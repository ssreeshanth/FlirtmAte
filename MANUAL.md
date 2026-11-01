# FlirtMate User Manual

## 1. What FlirtMate is

FlirtMate is a context-aware romantic reply assistant. You paste a message someone sent, choose a language style, and it generates six short reply options with different tones:

- Cute
- Playful
- Smooth
- Bold
- Romantic
- Funny

The replies are designed to be flirty, confident, and romantic while staying connected to the message the other person actually sent. FlirtMate avoids unrelated topics, forced pickup lines, pressure, manipulation, and explicit sexual content.

## 2. Main features

- Generates six reply options from one incoming message.
- Supports English, Telugu, Tenglish, and Hinglish styles.
- Keeps replies short and suitable for texting.
- Lets you copy a reply with one click.
- Lets you star favorite replies.
- Saves generated replies in History so recent wording is not repeated.
- Provides a Favorites tab for starred replies.
- Allows individual reply deletion or clearing all history.
- Stores reply history in a local SQLite database.

## 3. Requirements

- Windows, macOS, or Linux
- Node.js 22.12 or newer
- An API key from either OpenAI or Google Gemini
- Internet access when generating replies

Check your Node.js version:

```powershell
node --version
```

## 4. First-time setup on Windows

Open PowerShell in the project folder:

```powershell
cd "C:\Users\srees\OneDrive\Desktop\projects\fm_codex"
```

Install the project dependencies:

```powershell
npm install
```

Create the environment file:

```powershell
Copy-Item .env.example .env
```

The `.env` file is where the server reads the AI provider and API key. Do not paste the key into React files, `src/`, or the browser.

## 5. Configure the AI provider

Open the file below in a text editor:

```text
C:\Users\srees\OneDrive\Desktop\projects\fm_codex\.env
```

### Google Gemini

Use this configuration for Gemini:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=paste-your-gemini-key-here
GEMINI_MODEL=gemini-3.5-flash-lite
```

### OpenAI

Use this configuration for OpenAI:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=paste-your-openai-key-here
OPENAI_MODEL=your-openai-model-name
```

Only the provider selected by `AI_PROVIDER` is used. Keep the unused provider settings blank if desired.

Important:

- Never share the `.env` file.
- Never commit `.env` to GitHub.
- If the key is exposed, revoke it and create a new one.
- Restart the server after changing `.env`.

## 6. Run the app in development mode

From the project folder, run:

```powershell
npm run start:all
```

When both services are ready, open:

[http://localhost:5173/](http://localhost:5173/)

The development command starts:

- Vite frontend and Node/Express API together at port `5173`

Keep the PowerShell window open while using the app. Press `Ctrl+C` to stop it.

## 7. How to use FlirtMate

1. Open `http://localhost:5173/`.
2. Choose English, Telugu, Tenglish, or Hinglish.
3. Paste the exact message they sent into **What did they say?**.
4. Choose **Subtle**, **Balanced**, or **Very flirty** under **Flirting level**.
5. Click **Generate All Vibes**.
6. Read the six short options.
7. Copy the line that sounds most like you.
8. Star replies you want to keep.
9. Use **Regenerate** for another set or **New message** to start over.

For the best context-aware results, paste the complete incoming message rather than only a single word. Do not include private information that you do not want sent to the selected AI provider.

## 8. History and Favorites

### History

The History tab shows saved generated replies. You can copy, star, or delete individual replies. Use **Clear all history** to remove all saved replies for this browser client.

### Favorites

The Favorites tab shows only replies you have starred. Unstarring a reply removes it from Favorites but does not necessarily delete it from History.

The server automatically removes old unstarred replies after the retention period and limits stored replies per client. Starred replies are preserved.

## 9. Useful commands

Run the frontend only:

```powershell
npm run dev
```

Run the API server only:

```powershell
npm run server
```

Create a production frontend build:

```powershell
npm run build
```

Run the production server after building:

```powershell
npm start
```

Run automated tests:

```powershell
npm test
npm run test:e2e
```

Run project checks:

```powershell
npm run check
```

## 10. Troubleshooting

### “The reply service is unavailable right now.”

Check that:

1. `.env` exists in the project root.
2. `AI_PROVIDER` is set to `gemini` or `openai`.
3. The matching API key is present and valid.
4. The model name is valid for that provider.
5. The server was restarted after editing `.env`.
6. Your provider account has available quota and internet access.

### “No usable replies came back.”

Try a more complete incoming message and click **Regenerate**. The app rejects replies that are too long, unrelated, repeated, or in the wrong language style.

### The page does not open

Check the terminal for startup errors. Make sure port `5173` is not already being used, then run:

```powershell
npm run start:all
```

### The API is not responding

Open this health-check URL:

[http://localhost:5173/api/health](http://localhost:5173/api/health)

A working server returns a small JSON response indicating that it is healthy.

## 11. Important privacy notes

FlirtMate does not store the original incoming message in its own database. Generated replies and reply metadata are stored to provide history and avoid repetition. The message is sent to the selected AI provider to generate replies, so the provider's own privacy and retention policy applies.

Generated replies, language, vibe, timestamps, and favorites are stored locally in:

```text
C:\Users\srees\OneDrive\Desktop\projects\fm_codex\data\flirtmate.db
```

Each browser receives a server-signed guest session in an HttpOnly cookie that expires after 30 days. **End session** clears that cookie. Clearing cookies starts a new history and does not delete the prior history. Earlier history created by the localStorage client ID is not automatically migrated.

Open **Privacy Policy** in the app to review provider sharing, retention, deletion, and the configured privacy contact.

## 12. Project structure

```text
src/       React frontend
server/    Express API, AI providers, prompts, validation, and SQLite access
shared/    Shared constants and text utilities
tests/     Unit, integration, DOM, E2E, and optional live-provider tests
data/      Local SQLite database
.env       Local secrets and runtime configuration
```

