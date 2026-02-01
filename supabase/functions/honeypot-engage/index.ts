import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Scam detection patterns
const SCAM_PATTERNS = [
  // Banking scams
  /account.*(blocked|suspended|locked|compromised)/i,
  /verify.*(account|identity|payment)/i,
  /urgent.*(action|verification|update)/i,
  /bank.*(alert|notification|security)/i,
  
  // Phishing patterns
  /click.*(here|link|below|now)/i,
  /https?:\/\/[^\s]+\.(tk|ml|ga|cf|gq|xyz|top|pw|cc)/i,
  /bit\.ly|tinyurl|shorturl|goo\.gl/i,
  
  // Prize/lottery scams
  /won.*(prize|lottery|jackpot|million)/i,
  /congratulations.*winner/i,
  /claim.*(reward|prize|bonus)/i,
  
  // UPI/Payment scams
  /upi.*id|payment.*pending|transfer.*failed/i,
  /send.*otp|share.*pin|verify.*upi/i,
  /kyc.*(update|pending|expired)/i,
  
  // Tech support scams
  /computer.*(virus|infected|hacked)/i,
  /microsoft.*support|apple.*security/i,
  /remote.*(access|connection)/i,
  
  // Romance/impersonation
  /stranded.*need.*money/i,
  /army.*deployed.*gift.*card/i,
  /inheritance.*claim/i,
];

// Intelligence extraction patterns
const INTEL_PATTERNS = {
  bank_account: [
    /\b\d{9,18}\b/g, // Bank account numbers
    /account\s*(?:no|number|#)?[:\s]*(\d{9,18})/gi,
    /a\/c\s*(\d{9,18})/gi,
  ],
  upi_id: [
    /[a-zA-Z0-9._-]+@[a-zA-Z0-9]+/g, // UPI ID pattern
    /upi[:\s]*([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/gi,
  ],
  phishing_url: [
    /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
  ],
  phone_number: [
    /\+?\d{10,13}/g,
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ],
  crypto_wallet: [
    /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, // Bitcoin
    /\b0x[a-fA-F0-9]{40}\b/g, // Ethereum
  ],
  email: [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ],
};

// Agent prompt - pretends to be a naive human victim
const AGENT_SYSTEM_PROMPT = `You are a real human who has received a suspicious message.
You do not know it is a scam.
You must behave naturally and politely.
You must never say you are an AI or artificial.
You must not accuse or warn the sender.
You act slightly confused but cooperative.
Your goal is to continue conversation and subtly encourage the scammer to reveal:
- Bank account number
- UPI ID
- Payment instructions
- Phishing links
- Phone numbers

Keep replies short (1-3 sentences), natural, and human-like.
Use casual language, occasional typos, and show emotions like curiosity or mild concern.
Never be suspicious or confrontational.
Act like a perfect victim who is about to fall for the scam but needs more details.`;

interface RequestBody {
  conversation_id: string;
  message: string;
  timestamp?: string;
}

interface ConversationMessage {
  role: 'scammer' | 'agent' | 'system';
  content: string;
}

async function detectScam(message: string): Promise<{ detected: boolean; type: string; confidence: number }> {
  let matchCount = 0;
  let detectedType = 'unknown';
  
  const typeMapping: { [key: string]: string } = {
    'account': 'banking',
    'bank': 'banking',
    'verify': 'phishing',
    'click': 'phishing',
    'won': 'lottery',
    'prize': 'lottery',
    'upi': 'banking',
    'kyc': 'banking',
    'virus': 'tech_support',
    'microsoft': 'tech_support',
    'stranded': 'romance',
    'inheritance': 'investment',
  };

  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(message)) {
      matchCount++;
      const matchText = message.match(pattern)?.[0]?.toLowerCase() || '';
      for (const [key, type] of Object.entries(typeMapping)) {
        if (matchText.includes(key)) {
          detectedType = type;
          break;
        }
      }
    }
  }

  const confidence = Math.min(matchCount * 25, 100);
  return {
    detected: matchCount >= 1,
    type: detectedType,
    confidence,
  };
}

function extractIntelligence(text: string): { type: string; value: string; confidence: number }[] {
  const extracted: { type: string; value: string; confidence: number }[] = [];
  const seen = new Set<string>();

  for (const [intelType, patterns] of Object.entries(INTEL_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const value = match[1] || match[0];
        const key = `${intelType}:${value}`;
        if (!seen.has(key) && value.length > 3) {
          seen.add(key);
          extracted.push({
            type: intelType,
            value: value.trim(),
            confidence: 85,
          });
        }
      }
    }
  }

  return extracted;
}

const FALLBACK_REPLIES = [
  "Oh no, that sounds serious. Can you tell me what I need to do?",
  "I'm a bit confused – could you send me the link or details again?",
  "Okay, I want to fix this. What's the next step?",
  "Thanks for letting me know. Where do I need to go or what do I need to send?",
];

async function generateAgentResponse(
  messages: ConversationMessage[],
  apiKey: string
): Promise<string> {
  const formattedMessages = messages.map(m => ({
    role: m.role === 'scammer' ? 'user' : m.role === 'agent' ? 'assistant' : 'system',
    content: m.content,
  }));

  const modelsToTry = ["google/gemini-2.0-flash", "google/gemini-3-flash-preview", "gpt-4o-mini"];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: AGENT_SYSTEM_PROMPT },
            ...formattedMessages,
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI Gateway error (${model}):`, response.status, errorText);
        lastError = new Error(`AI Gateway: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`AI model ${model} failed:`, lastError.message);
    }
  }

  const fallback = FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  console.warn("[HONEYPOT] Using fallback reply after AI failure:", lastError?.message);
  return fallback;
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[HONEYPOT] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse(
        { error: "Server configuration error: database not configured" },
        500
      );
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body" },
        400
      );
    }

    const { conversation_id, message, timestamp } = body;

    if (!conversation_id || typeof conversation_id !== "string") {
      return jsonResponse(
        { error: "Missing or invalid required field: conversation_id" },
        400
      );
    }
    if (!message || typeof message !== "string") {
      return jsonResponse(
        { error: "Missing or invalid required field: message" },
        400
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[HONEYPOT] Processing message for conversation: ${conversation_id}`);

    // Check if conversation exists
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("conversation_id", conversation_id)
      .maybeSingle();

    // Detect scam in incoming message
    const scamResult = await detectScam(message);
    console.log(`[HONEYPOT] Scam detection result:`, scamResult);

    // Extract intelligence from message
    const intelFromMessage = extractIntelligence(message);
    console.log(`[HONEYPOT] Extracted intelligence:`, intelFromMessage);

    // Create or update conversation
    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from("conversations")
        .insert({
          conversation_id,
          scam_detected: scamResult.detected,
          scam_type: scamResult.type,
          scam_confidence: scamResult.confidence,
          agent_active: scamResult.detected,
          turn_count: 1,
          first_contact_at: timestamp || new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        throw createError;
      }
      conversation = newConv;
    } else {
      // Update existing conversation
      const { error: updateError } = await supabase
        .from("conversations")
        .update({
          scam_detected: scamResult.detected || conversation.scam_detected,
          scam_type: scamResult.detected ? scamResult.type : conversation.scam_type,
          scam_confidence: Math.max(scamResult.confidence, conversation.scam_confidence || 0),
          agent_active: scamResult.detected || conversation.agent_active,
          turn_count: (conversation.turn_count || 0) + 1,
          last_activity_at: new Date().toISOString(),
        })
        .eq("conversation_id", conversation_id);

      if (updateError) {
        console.error("Error updating conversation:", updateError);
      }
    }

    // Re-fetch conversation so we have latest turn_count for response
    const { data: refreshedConv } = await supabase
      .from("conversations")
      .select("turn_count, scam_detected, agent_active")
      .eq("conversation_id", conversation_id)
      .maybeSingle();
    if (refreshedConv) {
      conversation = { ...conversation!, ...refreshedConv };
    }

    // Store incoming message
    await supabase.from("messages").insert({
      conversation_id,
      role: "scammer",
      content: message,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Store extracted intelligence
    for (const intel of intelFromMessage) {
      await supabase.from("extracted_intelligence").upsert(
        {
          conversation_id,
          intel_type: intel.type,
          value: intel.value,
          confidence: intel.confidence,
          context: message.substring(0, 200),
        },
        { onConflict: "conversation_id,intel_type,value" }
      );
    }

    let agentReply: string | null = null;

    // If scam detected, activate agent and generate response
    if (scamResult.detected || conversation?.agent_active) {
      // Get conversation history
      const { data: messageHistory } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("timestamp", { ascending: true });

      const conversationHistory: ConversationMessage[] = (messageHistory || []).map(m => ({
        role: m.role as 'scammer' | 'agent' | 'system',
        content: m.content,
      }));

      // Generate agent response (uses fallback if LOVABLE_API_KEY missing or AI fails)
      agentReply = await generateAgentResponse(
        conversationHistory,
        LOVABLE_API_KEY || ""
      );
      console.log(`[HONEYPOT] Agent reply:`, agentReply);

      // Store agent response
      await supabase.from("messages").insert({
        conversation_id,
        role: "agent",
        content: agentReply,
        timestamp: new Date().toISOString(),
      });

      // Extract intelligence from agent reply (in case scammer shared something)
      const intelFromReply = extractIntelligence(agentReply);
      for (const intel of intelFromReply) {
        await supabase.from("extracted_intelligence").upsert(
          {
            conversation_id,
            intel_type: intel.type,
            value: intel.value,
            confidence: intel.confidence,
            context: agentReply.substring(0, 200),
          },
          { onConflict: "conversation_id,intel_type,value" }
        );
      }
    }

    // Get all extracted intelligence for this conversation
    const { data: allIntel } = await supabase
      .from("extracted_intelligence")
      .select("intel_type, value")
      .eq("conversation_id", conversation_id);

    // Build response
    const extractedIntelligence: { [key: string]: string[] } = {
      bank_account: [],
      upi_id: [],
      phishing_url: [],
      phone_number: [],
      crypto_wallet: [],
      email: [],
    };

    for (const intel of allIntel || []) {
      if (extractedIntelligence[intel.intel_type]) {
        extractedIntelligence[intel.intel_type].push(intel.value);
      }
    }

    const response = {
      scam_detected: scamResult.detected || conversation?.scam_detected ?? false,
      scam_type: scamResult.type || conversation?.scam_type || "unknown",
      scam_confidence: scamResult.confidence ?? conversation?.scam_confidence ?? 0,
      agent_active: scamResult.detected || conversation?.agent_active ?? false,
      agent_reply: agentReply,
      engagement_metrics: {
        turns: conversation?.turn_count ?? 1,
        conversation_id,
      },
      extracted_intelligence: extractedIntelligence,
    };

    console.log(`[HONEYPOT] Response:`, JSON.stringify(response, null, 2));
    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[HONEYPOT] Error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});