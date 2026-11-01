# 💜 FlirtMate

> **Context-aware romantic reply assistant powered by modern AI.**  
> Transform any incoming text message into six tailored, natural reply options across distinct flirting vibes — with zero prompt leakage, zero storage of incoming messages, and full support for English, Telugu, Tenglish, and Hinglish.

---

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D22.12.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 🌟 Key Highlights

- **6 Signature Flirting Vibes** — Generate six distinct angles for every message: Cute, Playful, Smooth, Bold, Romantic, and Funny.
- **Natural Cultural Styles** — Native support for **English**, **Telugu (తెలుగు)**, **Tenglish** (Telugu written in Latin script), and **Hinglish** (Hindi written in Latin script).
- **Flirting Intensity Control** — Tailor the tone with three selectable levels: **Mild**, **Balanced**, and **Spicy**.
- **Conversation Threading** — Multi-turn context memory (up to 5 recent exchanges) stored strictly in tab session memory for seamless follow-up replies.
- **Privacy First by Design** — **Incoming messages are never saved to disk or database.** Only generated reply candidates are cached locally for deduplication.
- **Smart Deduplication Engine** — Sliding window tracking prevents stale, repeated suggestions across generations.
- **Dual AI Provider Integration** — Works out of the box with both **Google Gemini** (`@google/genai`) and **OpenAI** (`openai`).
- **Production-Grade Security** — Signed `HttpOnly` guest session cookies, SameSite=Strict, CSRF protection, Helmet security headers, rate limiting, and bundle leakage auditing.

---

## 🎭 The 6 Flirting Vibes

| Vibe | Tone & Style | Purpose |
| :--- | :--- | :--- |
| **Cute** 🌸 | Soft, sweet, warm, endearing | Warm, gentle, and affectionate without feeling intense |
| **Playful** 🎯 | Light teasing, bantering, witty | Keeping the conversation fun and sparky |
| **Smooth** ✨ | Confident, calm, charming, relaxed | Effortlessly charismatic and engaging |
| **Bold** 🔥 | Direct, clear interest, flirtatious | Straightforward romantic spark when an opening presents itself |
| **Romantic** 🌹 | Sincere, heartfelt, tender | Meaningful connection grounded in the actual moment |
| **Funny** 😂 | Quick humor, clever situational jokes | Lighthearted laughs tied directly to their point |

*All responses adhere to safe, respectful boundaries: no cheesy pickup lines, no pressure, and strictly PG-13.*

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Vite, Single-Tab Session Storage, Responsive UI)    │
└──────────────────────────┬─────────────────────────────┘
                           │  HTTP / JSON + Signed Cookie
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js / Express 5 API                │
│  - Helmet & Security Headers    - Rate Limiters        │
│  - CSRF Origin Validation       - Deduplication Filter │
│  - Strict JSON Validation       - Session Management   │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
┌──────────────▼──────────┐    ┌──────────▼──────────────┐
│  AI Provider Interface  │    │      Better-SQLite3     │
│  - Google Gemini API    │    │  - Client Guest Session │
│  - OpenAI API           │    │  - Starred Favorites    │
│  - Fallback Engine      │    │  - History Deduplication│
└─────────────────────────┘    └─────────────────────────┘
```

- **Frontend**: React 19, Vite, Pure CSS with adaptive mobile-first design (tested down to 320px).
- **Backend**: Express 5, Node.js 22.12+/24, Helmet, `express-rate-limit`.
- **Database**: Local SQLite database via `better-sqlite3` with automated retention and cleanup sweeps.
- **AI Engines**: Official `@google/genai` (Gemini) and `openai` (GPT models) SDKs.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v22.12.0` or higher (tested on Node 24)
- **Package Manager**: `npm` (included with Node.js)
- **API Key**: A valid key from [Google AI Studio](https://aistudio.google.com/) or [OpenAI Platform](https://platform.openai.com/)

### 1. Clone & Install

```bash
git clone https://github.com/ssreeshanth/fm_codex.git
cd fm_codex
npm install
```

### 2. Configure Environment

Copy the example configuration:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and set your preferred provider:

#### Option A: Google Gemini (Recommended)
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

#### Option B: OpenAI
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### 3. Run Development Server

```bash
npm run start:all
```

The application will be live at `http://localhost:5173`.

---

## ⚙️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server with dev API proxy mounted |
| `npm run server` | Starts standalone Node.js Express server on port `4173` |
| `npm run start:all` | Default shortcut to run the full application |
| `npm run build` | Compiles production assets into `dist/` |
| `npm start` | Runs the production-mode server serving built static assets |
| `npm test` | Runs unit, integration, and DOM tests via Vitest |
| `npm run test:e2e` | Runs Playwright end-to-end browser journeys |
| `npm run test:live` | Runs live provider validation tests (requires API key) |
| `npm run check` | Runs security scan, bundle size check, and secret leak prevention |

---

## 🔒 Privacy & Data Retention Policy

1. **Zero Text Retention**: Incoming partner messages and sent replies are held exclusively in the browser tab's `sessionStorage` (cleared immediately when tab is closed or a new conversation is started). They are never written to the server database.
2. **Guest Sessions**: Authentication relies on cryptographically signed, random guest session tokens stored in `HttpOnly`, `SameSite=Strict` cookies. No email, phone number, or persistent identity is required.
3. **Automated Data Pruning**:
   - Unstarred replies automatically expire after 90 days.
   - Per-client unstarred history is capped at 500 items.
   - Starred favorite replies are retained until explicitly removed by the user.
   - Users can purge all their saved history and favorites at any time with one click.

---

## 🧪 Testing & Verification

FlirtMate is thoroughly covered by automated test suites:

```bash
# Run unit & integration test suites
npm test

# Run end-to-end browser tests
npm run test:e2e

# Run bundle security and hardcoded content audits
npm run check
```

---

## 📖 Further Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Production setup, TLS reverse proxy, persistent disk volumes, and secrets management.
- [MANUAL.md](MANUAL.md) — Detailed user manual, feature guide, and operational best practices.

---

## 📄 License

This project is released under the [MIT License](LICENSE).
