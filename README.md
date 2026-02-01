<<<<<<< HEAD
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
=======
AI-Powered Agentic Honeypot System
📌 Overview

The AI-Powered Agentic Honeypot System is a cybersecurity-focused project designed to detect scam messages, engage scammers autonomously, and extract actionable intelligence such as bank details, UPI IDs, phone numbers, and phishing links.

The system uses an AI-driven conversational agent to mimic human behavior, gather scam data safely, and store it for further analysis.

🎯 Key Objectives

Detect scam and phishing messages

Engage attackers intelligently

Extract scam-related intelligence

Store structured data for analysis

Provide dashboard-level insights

Ensure safe and ethical AI interaction

🛠 Tech Stack
Frontend

Vite

React (TypeScript)

Tailwind CSS

shadcn/ui

Backend

Supabase Edge Functions

PostgreSQL (Supabase DB)

AI-based conversation engine

📁 Project Structure
project-root/
│
├── src/                    # Frontend source code
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── main.tsx
│
├── supabase/
│   └── functions/
│       ├── honeypot-engage/
│       └── honeypot-stats/
│
├── public/
├── .env
├── package.json
└── README.md

⚙️ Backend Functions
🔹 honeypot-engage

Handles:

Scam detection

AI-based conversation

Data extraction

Conversation logging

Sample Input

{
  "message": "You won ₹10,000. Click here!"
}


Sample Output

{
  "isScam": true,
  "reply": "Please share more details.",
  "extracted_data": {
    "upi": "abc@upi",
    "phone": "9876543210"
  }
}

🔹 honeypot-stats

Provides:

Total conversations

Scam vs non-scam count

Extracted intelligence summary

Analytics-ready data

🧠 AI Agent Workflow

Message received

Scam intent detection

Context-aware response generation

Information extraction

Secure data storage

Analytics-ready output

🚀 Getting Started
Step 1: Clone Repository
git clone <YOUR_GIT_URL>
cd <PROJECT_NAME>

Step 2: Install Dependencies
npm install

Step 3: Configure Environment Variables

Create .env file:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
LOVABLE_API_KEY=optional_ai_key

Step 4: Run Frontend
>>>>>>> b3184c113a49514c135bc98eeae27a32395e18a8
npm run dev

<<<<<<< HEAD
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
=======
Step 5: Run Backend (Supabase Functions)
>>>>>>> b3184c113a49514c135bc98eeae27a32395e18a8
supabase functions serve

<<<<<<< HEAD
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
=======
🌐 Deployment
Frontend Hosting

Vercel

Netlify

Render

Backend

Supabase Edge Functions (Recommended)

🔐 Security Features

Environment-based secret management

No client-side API exposure

Sanitized message handling

Secure database access

AI response filtering

📊 Use Cases

Scam detection research

Cybercrime monitoring

AI security testing

Hackathons & academic projects

Law enforcement simulations

🚧 Future Enhancements

Admin analytics dashboard

Scam heatmap visualization

Multilingual scam detection

Voice-based scam analysis

WhatsApp / Telegram integration

✅ Project Status

✔ Fully functional
✔ Modular architecture
✔ Scalable
✔ Deployment-ready
✔ Hackathon suitable

📜 License

This project is for educational and research purposes only.
>>>>>>> b3184c113a49514c135bc98eeae27a32395e18a8
