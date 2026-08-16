# Scam Sentinel

AI-Powered Agentic Honeypot System.

Agentic honeypot for scam detection and intelligence extraction. Receives scam messages, detects scams, engages with an AI agent that behaves like a real person, and extracts bank accounts, UPI IDs, phishing URLs, phone numbers, and other intelligence for analysis.

## Objectives

- Detect scam and phishing messages
- Engage attackers intelligently
- Extract scam-related intelligence
- Store structured data for analysis
- Provide dashboard-level insights
- Ensure safe and ethical AI interaction

## Tech stack

**Frontend:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, WebSocket

**Backend:** Node + Express (`server/`) with a WebSocket channel, a heuristic detection engine, and pluggable storage. This is what the frontend talks to (`http://localhost:3001`).

**Storage:** MongoDB when reachable, otherwise an automatic fallback to a persistent local JSON file store — so the app runs with no external services and still survives a restart.

**Detection:** Weighted-signal scoring across 10 scam categories. No API key, no external calls.

**Also included:** Supabase Edge Functions (`supabase/functions/`) remain in the repo as an alternative hosted backend.

## Project structure

```
project-root/
│
├── src/                          # Frontend source
│   ├── components/dashboard/     # Feed, deep-dive, analytics, filters
│   │   └── chart-theme.ts        # Validated chart palette
│   ├── hooks/
│   │   ├── use-honeypot-data.ts  # Queries + realtime invalidation
│   │   └── use-realtime.ts       # WebSocket with backoff reconnect
│   ├── lib/api.ts
│   └── pages/
│
├── server/
│   ├── server.js                 # Express + WebSocket, routes
│   ├── db/
│   │   ├── index.js              # Picks a driver at boot
│   │   ├── mongo.js              # MongoDB adapter
│   │   └── filestore.js          # JSON-file fallback
│   ├── engine/
│   │   ├── detection.js          # Weighted signal scoring
│   │   ├── extraction.js         # Validated, masked extraction
│   │   ├── agent.js              # Persona + stage state machine
│   │   └── engine.test.js
│   └── lib/analytics.js
│
├── supabase/functions/           # Alternative hosted backend
├── docker-compose.yml            # MongoDB
└── README.md
```

## How it works

**Detection** scores each message against weighted signals grouped into 10 scam
categories (banking, KYC, lottery, tech support, investment, job, courier,
romance, loan, phishing), plus generic pressure tactics and structural evidence
from what was extracted. Only the strongest category counts toward the score, so
a message hitting two categories weakly does not outrank one hitting a single
category decisively. A saturating curve maps evidence to a 0–1 confidence.
Evidence carries forward across turns, so a scammer who already gave themselves
away stays flagged when their next message is a bland "ok".

**Extraction** pulls entities in precedence order and blanks the characters each
one consumed from a working copy of the text. A phone number inside a URL, or
the digits of an already-claimed account, can therefore never be double-reported.
Every candidate is validated before it is accepted — Luhn for cards, structural
checks for IFSC, dotted-TLD to separate emails from UPI handles.

**The agent** holds a stable persona per conversation and advances through
engaging → probing → extracting → stalling → closing. At each turn it targets
the highest-value intelligence it does not yet have, and never emits anything
that could look like real payment data.

## Getting started

**1. Install dependencies**

```sh
npm install
cd server && npm install && cd ..
```

**2. Configure environment variables**

```sh
cp .env.example .env
cp server/.env.example server/.env
```

**3. Start MongoDB**

```sh
docker compose up -d mongodb
```

**4. Start the backend** (terminal 1)

```sh
npm start --prefix server
```

**5. Start the frontend** (terminal 2)

```sh
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

## Environment variables

**Frontend (`.env`):**

- `VITE_API_BASE_URL` – Express backend URL. Defaults to `http://localhost:3001`.
- `VITE_SUPABASE_URL` – Supabase project URL (only for the Supabase backend)
- `VITE_SUPABASE_PUBLISHABLE_KEY` – Supabase anon/public key (only for the Supabase backend)

**Express server (`server/.env`):**

- `PORT` – Defaults to `3001`.
- `MONGODB_URI` – MongoDB connection string. If unreachable, the server falls back to the file store.
- `MONGODB_DB` – Database name. Defaults to `scam-sentinel`.
- `STORAGE` – `auto` (default), `file` to skip Mongo entirely, or `mongo` to make an unreachable Mongo a hard boot failure instead of falling back.

**Run MongoDB**

Set a password first — compose reads `MONGO_USERNAME` / `MONGO_PASSWORD` from
the root `.env` and **refuses to start without them**, so there is no weak
default to forget about:

```sh
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Put it in `.env` as `MONGO_PASSWORD`, then:

```bash
docker compose up -d mongodb
```

The database enables authentication, so `MONGODB_URI` in `server/.env` must
carry the same credentials plus `?authSource=admin` — the root user lives in
the `admin` database, and without that parameter authentication fails even
with the correct password:

```
mongodb://admin:<your-password>@localhost:27017/scam-sentinel?authSource=admin
```

> **Rotating the password later:** `MONGO_INITDB_ROOT_PASSWORD` is only applied
> when the data directory is empty, so editing `.env` does nothing to an
> existing volume. Change it inside the running database instead, then update
> both files:
>
> ```sh
> docker exec -it scam-sentinel-mongo mongosh -u admin -p <old> \
>   --authenticationDatabase admin \
>   --eval "db.getSiblingDB('admin').changeUserPassword('admin','<new>')"
> ```

On boot the server logs which driver it selected:

```
💾 Storage: MongoDB (scam-sentinel)
```

If MongoDB is not running you get a warning and `💾 Storage: file store
(data/store.json)` instead. Set `STORAGE=mongo` to turn that fallback into a
hard boot failure, which is what you want in production so a misconfigured
database never silently degrades to a single-process file store.

Indexes (unique `conversation_id`, plus lookup indexes on activity time and
intel type) are created automatically at startup.

**Supabase Edge Function secrets:**

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` – Set automatically when deployed on Supabase
- `AI_API_KEY` (or `LOVABLE_API_KEY`) – Optional. Enables AI-generated agent replies. If unset, the agent uses fallback replies.

## API

The Express server and the Edge Functions expose the same shape.

### POST `/api/honeypot-engage`

Runs scam detection, generates an agent reply, extracts intelligence, and logs the conversation.

Request:

```json
{
  "conversation_id": "unique-id-123",
  "message": "Your account is blocked. Click here.",
  "timestamp": "2026-01-29T10:00:00Z"
}
```

Response:

```json
{
  "scam_detected": true,
  "scam_type": "general_scam",
  "agent_reply": "...",
  "conversation_stage": "engaging",
  "confidence_score": 0.85,
  "engagement_metrics": { "turns": 1, "conversation_id": "unique-id-123" },
  "extracted_intelligence": {
    "bank_account": [],
    "ifsc": [],
    "upi_id": [],
    "phishing_url": []
  }
}
```

### Other endpoints

- `GET /api/honeypot-stats` – Dashboard stats: conversations, scams, intelligence and band breakdowns
- `GET /api/analytics?hours=24` – Time series, histograms, confidence by type, repeated identifiers
- `GET /api/conversations` – Filterable: `q`, `scam_type`, `band`, `status`, `min_confidence`, `from`, `to`, `limit`, `offset`. `q` searches message bodies too.
- `GET /api/conversations/:id` – Conversation, transcript, intelligence and stage timeline in one call
- `GET /api/conversations/:id/messages` – Messages in a conversation
- `GET /api/intelligence` – Filterable: `q`, `type`, `min_confidence`, `conversation_id`, `from`, `to`
- `GET /api/export/:resource?format=csv|json` – `resource` is `intelligence` or `conversations`
- `GET /api/meta` – Filter vocabularies (categories, intel types, stages, bands)
- `GET /api/health` – Health check, reports which storage driver is active
- `WS /ws` – Pushes an `engagement` event on every new message

## Dashboard

- **Live Monitor** – Filterable threat feed and a conversation deep-dive showing the transcript with extracted intel highlighted in place, per-turn agent strategy, stage timeline, and the detection signals that fired.
- **Analytics** – Activity over time, scam categories, intelligence by type, engagement depth, and repeated identifiers across conversations.
- **Intelligence** – Every extracted value, grouped by type, with confidence, extraction note, and a link back to its conversation.
- **API Tester** – Send sample scam messages and watch the agent respond.

Updates arrive over the WebSocket, so the dashboard reflects new activity
without polling. Charts use a palette validated for colorblind separation and
contrast against the app's dark surface; threat bands always carry their label
as text, so color never carries meaning alone.

## AI agent workflow

1. Message received
2. Scam intent detection
3. Context-aware response generation
4. Information extraction
5. Secure data storage
6. Analytics-ready output

## Scripts

- `npm run dev` – Start dev server
- `npm run build` – Production build
- `npm run preview` – Preview production build
- `npm run test` – Run tests
- `npm run lint` – Run ESLint

## Deploy

**Frontend:** Build with `npm run build` and deploy the `dist` folder to any static host (Vercel, Netlify, Render).

**Backend:**

- Express: deploy `server/` to any Node host. Note the in-memory store resets on restart — swap it for a real database for production.
- Supabase: `supabase functions deploy honeypot-engage honeypot-stats`, then set secrets in Supabase Dashboard → Project Settings → Edge Functions.

## Security notes

- Environment-based secret management
- No client-side exposure of service keys
- Sanitized message handling
- AI response filtering

## Project status

Functional, modular, and deployment-ready.

## License

This project is for educational and research purposes only.
