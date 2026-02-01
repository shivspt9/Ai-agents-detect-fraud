import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[STATS] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse(
        { error: "Server configuration error: database not configured" },
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("*");

    if (convError) {
      console.error("[STATS] Conversations fetch error:", convError);
      return jsonResponse(
        { error: "Failed to load conversations" },
        500
      );
    }

    const { data: intelligence, error: intelError } = await supabase
      .from("extracted_intelligence")
      .select("*");

    if (intelError) {
      console.error("[STATS] Intelligence fetch error:", intelError);
      return jsonResponse(
        { error: "Failed to load intelligence" },
        500
      );
    }

    const { data: recentActivity } = await supabase
      .from("conversations")
      .select("conversation_id, status, scam_type, turn_count, last_activity_at")
      .order("last_activity_at", { ascending: false })
      .limit(10);

    const convList = conversations ?? [];
    const intelList = intelligence ?? [];
    const totalConversations = convList.length;
    const scamsDetected = convList.filter((c) => c.scam_detected === true).length;
    const activeEngagements = convList.filter(
      (c) => c.agent_active === true && (c.status === "active" || !c.status)
    ).length;
    const totalTurns = convList.reduce((acc, c) => acc + (Number(c.turn_count) || 0), 0);
    const avgTurns =
      totalConversations > 0 ? (totalTurns / totalConversations).toFixed(1) : "0";

    const intelByType: Record<string, number> = {};
    for (const intel of intelList) {
      const t = intel?.intel_type ?? "unknown";
      intelByType[t] = (intelByType[t] || 0) + 1;
    }

    const scamTypes: Record<string, number> = {};
    for (const conv of convList) {
      if (conv.scam_detected && conv.scam_type) {
        const t = String(conv.scam_type);
        scamTypes[t] = (scamTypes[t] || 0) + 1;
      }
    }

    const detectionRate =
      totalConversations > 0
        ? ((scamsDetected / totalConversations) * 100).toFixed(1)
        : "0";

    const response = {
      overview: {
        total_conversations: totalConversations,
        scams_detected: scamsDetected,
        active_engagements: activeEngagements,
        total_intelligence: intelList.length,
        detection_rate: `${detectionRate}%`,
        avg_turns_per_conversation: avgTurns,
      },
      intelligence_breakdown: intelByType,
      scam_type_breakdown: scamTypes,
      recent_activity: (recentActivity ?? []).map((c) => ({
        conversation_id: c.conversation_id ?? "",
        status: c.status ?? "active",
        scam_type: c.scam_type ?? "unknown",
        turns: c.turn_count ?? 0,
        last_activity: c.last_activity_at ?? new Date().toISOString(),
      })),
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[STATS] Error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});