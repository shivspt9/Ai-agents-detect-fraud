import { supabase } from "@/integrations/supabase/client";

export interface HoneypotRequest {
  conversation_id: string;
  message: string;
  timestamp?: string;
}

export interface HoneypotResponse {
  scam_detected: boolean;
  scam_type: string;
  scam_confidence: number;
  agent_active: boolean;
  agent_reply: string | null;
  engagement_metrics: {
    turns: number;
    conversation_id: string;
  };
  extracted_intelligence: {
    bank_account: string[];
    upi_id: string[];
    phishing_url: string[];
    phone_number: string[];
    crypto_wallet: string[];
    email: string[];
  };
}

export interface StatsResponse {
  overview: {
    total_conversations: number;
    scams_detected: number;
    active_engagements: number;
    total_intelligence: number;
    detection_rate: string;
    avg_turns_per_conversation: string;
  };
  intelligence_breakdown: Record<string, number>;
  scam_type_breakdown: Record<string, number>;
  recent_activity: {
    conversation_id: string;
    status: string;
    scam_type: string;
    turns: number;
    last_activity: string;
  }[];
}

function getErrorMessage(
  error: { message?: string } | null,
  data: unknown
): string {
  if (error?.message) return error.message;
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return "Request failed. Please try again.";
}

export async function engageHoneypot(request: HoneypotRequest): Promise<HoneypotResponse> {
  const { data, error } = await supabase.functions.invoke("honeypot-engage", {
    body: request,
  });

  if (error) {
    throw new Error(getErrorMessage(error, data));
  }

  if (data && typeof data === "object" && "error" in data) {
    throw new Error(getErrorMessage(null, data));
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid response from honeypot API");
  }

  return data as HoneypotResponse;
}

export async function fetchStats(): Promise<StatsResponse> {
  const { data, error } = await supabase.functions.invoke("honeypot-stats");

  if (error) {
    throw new Error(getErrorMessage(error, data));
  }

  if (data && typeof data === "object" && "error" in data) {
    throw new Error(getErrorMessage(null, data));
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid response from stats API");
  }

  return data as StatsResponse;
}

export interface Conversation {
  id: string;
  conversation_id: string;
  status: string;
  scam_detected: boolean;
  scam_type: string;
  scam_confidence: number;
  agent_active: boolean;
  turn_count: number;
  first_contact_at: string;
  last_activity_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'scammer' | 'agent' | 'system';
  content: string;
  timestamp: string;
}

export interface Intelligence {
  id: string;
  conversation_id: string;
  intel_type: string;
  value: string;
  confidence: number;
  context: string;
  extracted_at: string;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_activity_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return (data || []).map(m => ({
    ...m,
    role: m.role as 'scammer' | 'agent' | 'system',
  }));
}

export async function fetchIntelligence(): Promise<Intelligence[]> {
  const { data, error } = await supabase
    .from('extracted_intelligence')
    .select('*')
    .order('extracted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}