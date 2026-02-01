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
npm run dev

Step 5: Run Backend (Supabase Functions)
supabase functions serve

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
