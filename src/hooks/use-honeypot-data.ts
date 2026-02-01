import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchStats, 
  fetchConversations, 
  fetchMessages, 
  fetchIntelligence,
  type StatsResponse,
  type Conversation,
  type Message,
  type Intelligence
} from "@/lib/api";

export function useHoneypotData() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Fetch stats
  const statsQuery = useQuery<StatsResponse>({
    queryKey: ['honeypot-stats'],
    queryFn: fetchStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch conversations
  const conversationsQuery = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch messages for selected conversation
  const messagesQuery = useQuery<Message[]>({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => selectedConversationId ? fetchMessages(selectedConversationId) : Promise.resolve([]),
    enabled: !!selectedConversationId,
  });

  // Fetch all intelligence
  const intelligenceQuery = useQuery<Intelligence[]>({
    queryKey: ['intelligence'],
    queryFn: fetchIntelligence,
    refetchInterval: 15000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          conversationsQuery.refetch();
          statsQuery.refetch();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (selectedConversationId && 
              (payload.new as Message)?.conversation_id === selectedConversationId) {
            messagesQuery.refetch();
          }
        }
      )
      .subscribe();

    const intelChannel = supabase
      .channel('intelligence-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extracted_intelligence' },
        () => {
          intelligenceQuery.refetch();
          statsQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(intelChannel);
    };
  }, [selectedConversationId]);

  const refetchAll = useCallback(() => {
    statsQuery.refetch();
    conversationsQuery.refetch();
    messagesQuery.refetch();
    intelligenceQuery.refetch();
  }, [statsQuery, conversationsQuery, messagesQuery, intelligenceQuery]);

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    messages: messagesQuery.data || [],
    messagesLoading: messagesQuery.isLoading,
    intelligence: intelligenceQuery.data || [],
    intelligenceLoading: intelligenceQuery.isLoading,
    selectedConversationId,
    setSelectedConversationId,
    refetchAll,
    isLoading: statsQuery.isLoading || conversationsQuery.isLoading,
  };
}