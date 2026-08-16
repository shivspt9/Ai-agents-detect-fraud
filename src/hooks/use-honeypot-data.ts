import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchStats,
  fetchAnalytics,
  fetchConversations,
  fetchConversationDetail,
  fetchIntelligence,
  fetchMeta,
  type StatsResponse,
  type AnalyticsResponse,
  type Conversation,
  type ConversationDetail,
  type Message,
  type Intelligence,
  type MetaResponse,
  type ConversationFilters,
  type IntelligenceFilters,
} from '@/lib/api';
import { useRealtime, type RealtimeEvent } from './use-realtime';

export type { Conversation, Message, Intelligence, ConversationDetail };

/**
 * Central dashboard data source.
 *
 * Live updates arrive over the WebSocket; polling is only a slow safety net
 * for the case where the socket is down, so the numbers stay correct without
 * hammering the server every few seconds.
 */
export function useHoneypotData() {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({});
  const [intelFilters, setIntelFilters] = useState<IntelligenceFilters>({});

  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      // `engagement` means the server changed state. `hello` arrives on every
      // (re)connection — resyncing there matters because anything that happened
      // while the socket was down was never pushed, and the server may have
      // restarted with different data entirely.
      if (event.type !== 'engagement' && event.type !== 'hello') return;

      for (const key of [
        'honeypot-stats',
        'analytics',
        'conversations',
        'intelligence',
        'conversation-detail',
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    [queryClient]
  );

  const { state: connectionState, isLive, lastEventAt } = useRealtime({ onEvent: handleEvent });

  // With the socket up, a long interval is just a correctness backstop.
  const backstop = isLive ? 120_000 : 10_000;

  const statsQuery = useQuery<StatsResponse>({
    queryKey: ['honeypot-stats'],
    queryFn: fetchStats,
    refetchInterval: backstop,
  });

  const analyticsQuery = useQuery<AnalyticsResponse>({
    queryKey: ['analytics'],
    queryFn: () => fetchAnalytics(24),
    refetchInterval: backstop,
  });

  const conversationsQuery = useQuery<Conversation[]>({
    queryKey: ['conversations', conversationFilters],
    queryFn: () => fetchConversations(conversationFilters),
    refetchInterval: backstop,
    placeholderData: (previous) => previous,
  });

  const detailQuery = useQuery<ConversationDetail | null>({
    queryKey: ['conversation-detail', selectedConversationId],
    queryFn: () =>
      selectedConversationId ? fetchConversationDetail(selectedConversationId) : Promise.resolve(null),
    enabled: Boolean(selectedConversationId),
  });

  const intelligenceQuery = useQuery<Intelligence[]>({
    queryKey: ['intelligence', intelFilters],
    queryFn: () => fetchIntelligence(intelFilters),
    refetchInterval: backstop,
    placeholderData: (previous) => previous,
  });

  // Filter vocabularies change only on deploy, so they never need refetching.
  const metaQuery = useQuery<MetaResponse>({
    queryKey: ['meta'],
    queryFn: fetchMeta,
    staleTime: Infinity,
  });

  const refetchAll = useCallback(() => {
    statsQuery.refetch();
    analyticsQuery.refetch();
    conversationsQuery.refetch();
    intelligenceQuery.refetch();
    detailQuery.refetch();
  }, [statsQuery, analyticsQuery, conversationsQuery, intelligenceQuery, detailQuery]);

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,

    analytics: analyticsQuery.data,
    analyticsLoading: analyticsQuery.isLoading,

    conversations,
    conversationsLoading: conversationsQuery.isLoading,

    detail: detailQuery.data ?? null,
    detailLoading: detailQuery.isFetching,
    messages: detailQuery.data?.messages ?? [],

    intelligence: intelligenceQuery.data ?? [],
    intelligenceLoading: intelligenceQuery.isLoading,

    meta: metaQuery.data,

    conversationFilters,
    setConversationFilters,
    intelFilters,
    setIntelFilters,

    selectedConversationId,
    setSelectedConversationId,

    connectionState,
    isLive,
    lastEventAt,

    refetchAll,
    isLoading: statsQuery.isLoading || conversationsQuery.isLoading,
  };
}
