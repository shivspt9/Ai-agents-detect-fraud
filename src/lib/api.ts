const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws';

/* ------------------------------------------------------------------ types */

export type Band = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type Stage = 'engaging' | 'probing' | 'extracting' | 'stalling' | 'closing';

export interface Signal {
  id: string;
  weight: number;
  category: string;
}

export interface Persona {
  id: string;
  name: string;
  occupation: string;
}

export interface Conversation {
  id: string;
  conversation_id: string;
  status: string;
  scam_detected: boolean;
  scam_type: string;
  scam_label: string;
  scam_confidence: number;
  current_confidence?: number;
  threat_score: number;
  band: Band;
  agent_active: boolean;
  stage: Stage;
  goal: string | null;
  strategy: string;
  persona: Persona;
  collected_types: string[];
  intel_count: number;
  turn_count: number;
  signals: Signal[];
  category_scores: Record<string, number>;
  first_contact_at: string;
  last_activity_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'scammer' | 'agent' | 'system';
  content: string;
  timestamp: string;
  intel_found?: { type: string; value: string }[];
  threat_score?: number;
  stage?: Stage;
  strategy?: string;
  goal?: string | null;
}

export interface Intelligence {
  id: string;
  conversation_id: string;
  intel_type: string;
  value: string;
  confidence: number;
  note?: string;
  context: string;
  extracted_at: string;
}

export interface HoneypotRequest {
  conversation_id: string;
  message: string;
  timestamp?: string;
}

export interface HoneypotResponse {
  scam_detected: boolean;
  scam_type: string;
  scam_label: string;
  scam_confidence: number;
  threat_score: number;
  band: Band;
  signals: Signal[];
  agent_active: boolean;
  agent_reply: string | null;
  conversation_stage: Stage;
  agent_strategy: string;
  agent_goal: string | null;
  agent_persona: Persona;
  confidence_score: number;
  engagement_metrics: {
    turns: number;
    conversation_id: string;
    intel_collected: number;
    new_intel: number;
  };
  extracted_intelligence: Record<string, string[]>;
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
  band_breakdown: Record<string, number>;
  recent_activity: {
    conversation_id: string;
    status: string;
    scam_type: string;
    scam_label: string;
    threat_score: number;
    band: Band;
    turns: number;
    last_activity: string;
  }[];
}

export interface AnalyticsResponse {
  window_hours: number;
  conversations_over_time: { t: string; count: number }[];
  intelligence_over_time: { t: string; count: number }[];
  scam_type_breakdown: Record<string, number>;
  intel_type_breakdown: Record<string, number>;
  band_breakdown: Record<string, number>;
  stage_breakdown: Record<string, number>;
  turn_histogram: { range: string; count: number }[];
  confidence_by_type: { type: string; count: number; avg_confidence: number }[];
  top_targets: { value: string; count: number }[];
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
  intelligence: Intelligence[];
  timeline: { stage: Stage; at: string; strategy: string }[];
}

export interface MetaResponse {
  scam_categories: Record<string, string>;
  intel_types: string[];
  stages: Stage[];
  personas: Persona[];
  bands: Band[];
}

export interface ConversationFilters {
  q?: string;
  scam_type?: string[];
  band?: string[];
  status?: string[];
  min_confidence?: number;
  from?: string;
  to?: string;
}

export interface IntelligenceFilters {
  q?: string;
  type?: string[];
  min_confidence?: number;
  conversation_id?: string;
  from?: string;
  to?: string;
}

/* ---------------------------------------------------------------- helpers */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'error' in error) {
    return (error as { error: string }).error;
  }
  return 'Request failed. Please try again.';
}

/** Builds a query string, expanding arrays into repeated keys. */
function qs(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v));
    } else {
      search.set(key, String(value));
    }
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) {
      console.error(`GET ${path} failed:`, response.status);
      return fallback;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`GET ${path} error:`, error);
    return fallback;
  }
}

/* ----------------------------------------------------------------- calls */

export async function engageHoneypot(request: HoneypotRequest): Promise<HoneypotResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/honeypot-engage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return (await response.json()) as HoneypotResponse;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

const EMPTY_STATS: StatsResponse = {
  overview: {
    total_conversations: 0,
    scams_detected: 0,
    active_engagements: 0,
    total_intelligence: 0,
    detection_rate: '0%',
    avg_turns_per_conversation: '0',
  },
  intelligence_breakdown: {},
  scam_type_breakdown: {},
  band_breakdown: {},
  recent_activity: [],
};

export async function fetchStats(): Promise<StatsResponse> {
  return getJson('/api/honeypot-stats', EMPTY_STATS);
}

export async function fetchAnalytics(hours = 24): Promise<AnalyticsResponse> {
  return getJson(`/api/analytics${qs({ hours })}`, {
    window_hours: hours,
    conversations_over_time: [],
    intelligence_over_time: [],
    scam_type_breakdown: {},
    intel_type_breakdown: {},
    band_breakdown: {},
    stage_breakdown: {},
    turn_histogram: [],
    confidence_by_type: [],
    top_targets: [],
  });
}

export async function fetchConversations(
  filters: ConversationFilters = {}
): Promise<Conversation[]> {
  const result = await getJson<{ data: Conversation[] }>(
    `/api/conversations${qs({ ...filters, limit: 200 })}`,
    { data: [] }
  );
  return result.data ?? [];
}

export async function fetchConversationDetail(
  conversationId: string
): Promise<ConversationDetail | null> {
  return getJson<ConversationDetail | null>(
    `/api/conversations/${encodeURIComponent(conversationId)}`,
    null
  );
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  return getJson(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, []);
}

export async function fetchIntelligence(
  filters: IntelligenceFilters = {}
): Promise<Intelligence[]> {
  return getJson(`/api/intelligence${qs(filters)}`, []);
}

export async function fetchMeta(): Promise<MetaResponse> {
  return getJson('/api/meta', {
    scam_categories: {},
    intel_types: [],
    stages: [],
    personas: [],
    bands: [],
  });
}

/** Streams an export straight from the backend to a file download. */
export async function downloadExport(
  resource: 'intelligence' | 'conversations',
  format: 'csv' | 'json'
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/export/${resource}${qs({ format })}`);
  if (!response.ok) throw new Error(`Export failed (${response.status})`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resource}-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
