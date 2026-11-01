<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=32&duration=3000&pause=1000&color=FF6B9D&center=true&vline=true&width=500&lines=💘+FlirtMate;Never+get+left+on+read.;Six+vibes.+One+message." alt="FlirtMate Typing SVG" />

<br/>

### *Paste their text. Get six natural replies — each with its own vibe.*
### English · Telugu · Tenglish · Hinglish

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-≥22.12-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.1-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)

<br/>

[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blueviolet?style=flat-square)](LICENSE)
[![Privacy](https://img.shields.io/badge/Incoming%20messages-never%20stored-FF6B9D?style=flat-square)](#-privacy--data-retention)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/ssreeshanth/FlirtmAte/pulls)

<br/>

[**🚀 Quick Start**](#-quick-start) · [**💬 The Six Vibes**](#-the-six-vibes) · [**🌐 Languages**](#-languages) · [**🔒 Privacy**](#-privacy--data-retention) · [**🏗️ Architecture**](#%EF%B8%8F-architecture) · [**📚 Docs**](#-further-documentation)

</div>

---

## 💘 What is FlirtMate?

> Sometimes you know exactly how you feel — but not how to say it.

**FlirtMate** reads the message you received, understands the moment, and hands you **six distinct reply options**, each with a different flavor. Pick the one that sounds like *you*.

No generic pickup lines. No pressure. Every reply is grounded in what the other person actually said, stays respectful and **PG-13**, and adapts to your chosen vibe, language, and intensity.

---

### ✨ Illustrative Example

> **They sent:** *"Just got back from the hills, so tired but it was so worth it 🏔"*

| Vibe | Sample Reply |
|:---:|:---|
| 🥰 **Cute** | "Go rest, hill explorer. Tell me everything when you wake up?" |
| 😜 **Playful** | "Tired but still smiling about it? Suspicious. What are you hiding up there?" |
| 😂 **Funny** | "Your legs filed a complaint, but your Instagram is about to say otherwise." |
| 😏 **Smooth** | "Hills and a good vibe? You've got good taste in both." |
| 🔥 **Bold** | "Tell me you're free this weekend. I want to hear the full story in person." |
| 💕 **Romantic** | "Tired looks good on you after adventures. Rest well — you've earned it." |

*Output depends on your message, language, intensity, and conversation context.*

---

## 🌟 Highlights

| | Feature | Details |
|:-:|:---|:---|
| 💬 | **Six signature vibes** | Cute · Playful · Smooth · Bold · Romantic · Funny |
| 🌐 | **Native cultural styles** | English · Telugu (తెలుగు) · Tenglish · Hinglish |
| 🎚️ | **Intensity control** | Mild · Balanced · Spicy |
| 🧵 | **Conversation threading** | Remembers up to 5 recent exchanges per tab |
| 🔒 | **Privacy first** | Incoming messages never touch the server database |
| 🔁 | **Smart deduplication** | Sliding window prevents repetitive suggestions |
| 🤖 | **Dual AI providers** | Google Gemini (`@google/genai`) + OpenAI (`openai`) |
| 🛡️ | **Production-grade security** | Signed HttpOnly cookies, CSRF, Helmet, rate limiting |
| 📱 | **Mobile-first UI** | Responsive, tested down to 320 px |

---

## 💬 The Six Vibes

| Vibe | Style | Best When |
|:---:|:---|:---|
| 🥰 **Cute** | Soft, sweet, warm, endearing | You want to be gentle without it feeling intense |
| 😜 **Playful** | Light teasing, witty banter | You want to keep things fun and sparky |
| 😏 **Smooth** | Confident, calm, charming | You want to come across as effortlessly charismatic |
| 🔥 **Bold** | Direct, clear interest | There's an opening and you want to take it |
| 💕 **Romantic** | Heartfelt, sincere, tender | You want to say something real |
| 😂 **Funny** | Clever humor, relatable wit | Laughter is the vibe |

---

## 🌐 Languages

| Language | What makes it special |
|:---|:---|
| 🇬🇧 **English** | Polished, natural, expressive |
| 🇮🇳 **Telugu** | Authentic తెలుగు phrasing that reads like real texting |
| 🔀 **Tenglish** | Telugu + English code-mixed — the way Gen-Z actually texts |
| 🇮🇳 **Hinglish** | Hindi + English blend for that desi casual charm |

---

## 🎚️ Intensity Levels

| Level | Feel |
|:---|:---|
| 🧊 **Mild** | Sweet, friendly, low-pressure |
| ⚖️ **Balanced** | Warm but confident — the default sweet spot |
| 🔥 **Spicy** | Bold and flirtatious — when you're feeling it |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                    React 19 Frontend                   │
│         (Vite · Mobile-first · Pure CSS)               │
└────────────────────┬───────────────────────────────────┘
                     │  HTTP / JSON + Signed Cookie
┌────────────────────▼───────────────────────────────────┐
│                  Express 5 Backend                     │
│    Helmet · CSRF · Rate Limiting · JSON Validation     │
│    Signed Guest Session · Deduplication Filter         │
└──────────┬───────────────────────────┬─────────────────┘
           │                           │
┌──────────▼──────────┐   ┌────────────▼────────────────┐
│    SQLite (local)   │   │       AI Provider Layer      │
│  Sessions · Favs    │   │  Google Gemini  │  OpenAI    │
│  Dedup History      │   │  @google/genai  │  openai    │
└─────────────────────┘   └─────────────────────────────┘
```

| Layer | Technology |
|:---|:---|
| **Frontend** | React 19, Vite, pure CSS, adaptive mobile-first design |
| **Backend** | Express 5 on Node.js ≥22.12, Helmet, `express-rate-limit` |
| **Database** | Local SQLite via `better-sqlite3` with automated retention sweeps |
| **AI engines** | Official `@google/genai` (Gemini) and `openai` (GPT) SDKs |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** `v22.12.0` or higher *(tested on Node 24)*
- **npm** *(bundled with Node.js)*
- An API key from [Google AI Studio](https://aistudio.google.com/) **or** [OpenAI Platform](https://platform.openai.com/)

---

### 1️⃣ Clone & Install

```bash
git clone https://github.com/ssreeshanth/FlirtmAte.git
cd FlirtmAte
npm install
```

---

### 2️⃣ Configure Environment

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` and choose your AI provider:

<details open>
<summary><b>🤖 Option A: Google Gemini (recommended)</b></summary>

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

</details>

<details>
<summary><b>🧠 Option B: OpenAI</b></summary>

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

</details>

> ⚠️ **Never commit your `.env` file.** It's already in `.gitignore`.

---

### 3️⃣ Run It

```bash
npm run start:all
```

Open **[http://localhost:5173](http://localhost:5173)** and paste your first message. 💘

---

## 🛠️ Scripts

| Command | What it does |
|:---|:---|
| `npm run start:all` | 🚀 Runs the full app (Vite dev + API server) |
| `npm run dev` | Starts Vite dev server with API proxy |
| `npm run server` | Starts standalone Express server on port `4173` |
| `npm run build` | Compiles production assets into `dist/` |
| `npm start` | Runs production server serving built assets |
| `npm test` | Unit, integration & DOM tests via Vitest |
| `npm run test:e2e` | End-to-end browser journeys via Playwright |
| `npm run test:live` | Live provider validation *(requires API key)* |
| `npm run check` | Security scan, bundle size & secret leak audit |

---

## 🔒 Privacy & Data Retention

> **FlirtMate is built so that the message you received is never stored on the server.**

| Data | Where it lives | How long |
|:---|:---|:---|
| 📨 **Incoming messages** | Browser `sessionStorage` only | Until tab closes |
| 🗣️ **Conversation context** *(last 5 exchanges)* | Browser `sessionStorage` only | Until tab closes |
| 🔁 **Generated reply candidates** | Local SQLite, for deduplication only | 90 days, max 500 per client |
| ⭐ **Starred favorites** | Local SQLite | Until you remove them |
| 🍪 **Guest session token** | Signed `HttpOnly` · `SameSite=Strict` cookie | No email or phone needed |

### Your Controls

- 🗑️ **Purge everything** (history + favorites) with one click, any time
- 🔄 **Start a new conversation** to clear session context immediately
- 🕶️ **No account needed** — no email, no phone, no persistent identity

---

## 🛡️ Security

- ✅ Signed guest sessions with `HttpOnly` + `SameSite=Strict` cookies
- ✅ CSRF protection via origin validation
- ✅ `Helmet` security headers
- ✅ Rate limiting on all API routes
- ✅ Strict JSON validation on every request
- ✅ Bundle leakage auditing (`npm run check`) — keeps secrets and prompts out of client builds

---

## 🧪 Testing

```bash
npm test              # Unit, integration & DOM tests (Vitest)
npm run test:e2e      # Playwright browser journeys
npm run check         # Security scan, bundle size & secret leak audits
```

| Suite | Tool | Coverage |
|:---|:---|:---|
| Unit & Integration | Vitest | Core logic, API routes, DB layer |
| DOM | Vitest + jsdom + Testing Library | React components |
| End-to-End | Playwright | Full browser journeys |
| Security | Custom scripts | Bundle audit, secret leak prevention |

---

## 📚 Further Documentation

| Document | What's inside |
|:---|:---|
| 📘 [DEPLOYMENT.md](DEPLOYMENT.md) | Production setup, TLS reverse proxy, persistent disk volumes, secrets management |
| 📖 [MANUAL.md](MANUAL.md) | Detailed user manual, feature guide & operational best practices |

---

## 📄 License

Released under the [MIT License](LICENSE).

---

<div align="center">

<br/>

**Made with 💘 for everyone who's ever stared at a "hey 😊" wondering what to say.**

<br/>

⭐ **Star this repo if FlirtMate helped you find the right words!** ⭐

<br/>

[![GitHub stars](https://img.shields.io/github/stars/ssreeshanth/FlirtmAte?style=social)](https://github.com/ssreeshanth/FlirtmAte/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ssreeshanth/FlirtmAte?style=social)](https://github.com/ssreeshanth/FlirtmAte/network/members)

</div>
