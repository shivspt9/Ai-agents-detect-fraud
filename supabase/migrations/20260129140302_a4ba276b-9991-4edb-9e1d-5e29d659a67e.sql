-- Create enum for scam types
CREATE TYPE public.scam_type AS ENUM ('phishing', 'banking', 'lottery', 'tech_support', 'romance', 'investment', 'unknown');

-- Create enum for conversation status
CREATE TYPE public.conversation_status AS ENUM ('active', 'completed', 'abandoned', 'flagged');

-- Conversations table - stores honeypot conversation sessions
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL UNIQUE,
  status public.conversation_status NOT NULL DEFAULT 'active',
  scam_detected BOOLEAN NOT NULL DEFAULT false,
  scam_type public.scam_type DEFAULT 'unknown',
  scam_confidence DECIMAL(5,2) DEFAULT 0,
  agent_active BOOLEAN NOT NULL DEFAULT false,
  turn_count INTEGER NOT NULL DEFAULT 0,
  first_contact_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table - stores individual messages in conversations
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('scammer', 'agent', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extracted intelligence table - stores extracted scam data
CREATE TABLE public.extracted_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE,
  intel_type TEXT NOT NULL CHECK (intel_type IN ('bank_account', 'upi_id', 'phishing_url', 'phone_number', 'crypto_wallet', 'email')),
  value TEXT NOT NULL,
  confidence DECIMAL(5,2) DEFAULT 0,
  context TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, intel_type, value)
);

-- System stats table for dashboard metrics
CREATE TABLE public.honeypot_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_conversations INTEGER NOT NULL DEFAULT 0,
  scams_detected INTEGER NOT NULL DEFAULT 0,
  intelligence_extracted INTEGER NOT NULL DEFAULT 0,
  active_engagements INTEGER NOT NULL DEFAULT 0,
  avg_turns_per_conversation DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_scam_detected ON public.conversations(scam_detected);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_intelligence_conversation_id ON public.extracted_intelligence(conversation_id);
CREATE INDEX idx_intelligence_type ON public.extracted_intelligence(intel_type);

-- Enable RLS on all tables (public access for honeypot API)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honeypot_stats ENABLE ROW LEVEL SECURITY;

-- Public read access policies (honeypot needs to be accessible)
CREATE POLICY "Allow public read on conversations"
  ON public.conversations FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on conversations"
  ON public.conversations FOR UPDATE
  USING (true);

CREATE POLICY "Allow public read on messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read on intelligence"
  ON public.extracted_intelligence FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on intelligence"
  ON public.extracted_intelligence FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read on stats"
  ON public.honeypot_stats FOR SELECT
  USING (true);

CREATE POLICY "Allow public upsert on stats"
  ON public.honeypot_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on stats"
  ON public.honeypot_stats FOR UPDATE
  USING (true);

-- Function to update conversation stats
CREATE OR REPLACE FUNCTION public.update_honeypot_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.honeypot_stats (date, total_conversations, scams_detected, active_engagements)
  VALUES (CURRENT_DATE, 1, CASE WHEN NEW.scam_detected THEN 1 ELSE 0 END, CASE WHEN NEW.agent_active THEN 1 ELSE 0 END)
  ON CONFLICT (date) DO UPDATE SET
    total_conversations = public.honeypot_stats.total_conversations + 1,
    scams_detected = public.honeypot_stats.scams_detected + CASE WHEN NEW.scam_detected THEN 1 ELSE 0 END,
    active_engagements = public.honeypot_stats.active_engagements + CASE WHEN NEW.agent_active THEN 1 ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update stats on new conversations
CREATE TRIGGER trigger_update_honeypot_stats
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_honeypot_stats();

-- Function to update intelligence count
CREATE OR REPLACE FUNCTION public.update_intel_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.honeypot_stats
  SET intelligence_extracted = intelligence_extracted + 1,
      updated_at = now()
  WHERE date = CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for intelligence extraction stats
CREATE TRIGGER trigger_update_intel_stats
  AFTER INSERT ON public.extracted_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_intel_stats();

-- Enable realtime for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.extracted_intelligence;