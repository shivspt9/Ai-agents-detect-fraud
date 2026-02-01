# Scam Sentinel

Agentic honeypot for scam detection and intelligence extraction. Receives scam messages, detects scams, engages with an AI agent that behaves like a real person, and extracts bank accounts, UPI IDs, phishing URLs, and other intelligence.

## Tech stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase client
- **Backend:** Supabase Edge Functions (Deno), Supabase Postgres
- **AI:** Optional LLM for agent replies (fallback replies if not configured)

## Getting started

```sh
git clone <YOUR_REPO_URL>
cd scam-sentinel-main
npm install
cp .env.example .env   # add VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

## Environment variables

**Frontend (`.env`):**

- `VITE_SUPABASE_URL` – Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` – Supabase anon/public key

**Backend (Supabase Edge Function secrets):**

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` – Set automatically when deployed on Supabase
- `AI_API_KEY` (or `LOVABLE_API_KEY`) – Optional. Enables AI-generated agent replies. If unset, the agent uses fallback replies.

## Backend (Supabase Edge Functions)

- **honeypot-engage** – Accepts messages, runs scam detection, runs the AI agent when a scam is detected, stores conversations and extracted intelligence, returns JSON.
- **honeypot-stats** – Returns dashboard stats (conversations, scams, intelligence breakdown).

**Run functions locally:**

```sh
supabase functions serve
```

Use `.env` or `supabase/.env.local` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `AI_API_KEY`.

## API

**POST** `/functions/v1/honeypot-engage`

```json
{
  "conversation_id": "unique-id-123",
  "message": "Your account is blocked. Click here.",
  "timestamp": "2026-01-29T10:00:00Z"
}
```

Response includes `scam_detected`, `agent_reply`, `engagement_metrics`, and `extracted_intelligence`.

## Scripts

- `npm run dev` – Start dev server
- `npm run build` – Production build
- `npm run preview` – Preview production build
- `npm run test` – Run tests
- `npm run lint` – Run ESLint

## Deploy

- **Frontend:** Build with `npm run build` and deploy the `dist` folder to any static host (Vercel, Netlify, etc.), or use your preferred CI/CD.
- **Backend:** Deploy Edge Functions with Supabase CLI: `supabase functions deploy honeypot-engage honeypot-stats`. Set secrets in Supabase Dashboard → Project Settings → Edge Functions.
