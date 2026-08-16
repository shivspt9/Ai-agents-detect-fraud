import { useMemo, useState, useCallback, lazy, Suspense } from 'react';
import {
  Shield,
  AlertTriangle,
  Activity,
  Database,
  Percent,
  MessageSquare,
  LayoutDashboard,
  Brain,
  TestTube,
  BarChart3,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

import { Header } from '@/components/dashboard/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ThreatFeed } from '@/components/dashboard/ThreatFeed';
import { ConversationDetail } from '@/components/dashboard/ConversationDetail';
import { IntelligencePanel } from '@/components/dashboard/IntelligencePanel';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { ApiTester } from '@/components/dashboard/ApiTester';
import { humanize } from '@/components/dashboard/chart-theme';

import { useHoneypotData } from '@/hooks/use-honeypot-data';
import { downloadExport } from '@/lib/api';

// Recharts is the single largest dependency. Loading it only when the
// Analytics tab is opened keeps the initial dashboard payload small.
const AnalyticsPanel = lazy(() =>
  import('@/components/dashboard/AnalyticsPanel').then((m) => ({ default: m.AnalyticsPanel }))
);

/** Converts an "hours back" preset into the ISO `from` the API expects. */
function hoursToFrom(hours: number | null): string | undefined {
  if (hours === null) return undefined;
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

const Index = () => {
  const {
    stats,
    statsLoading,
    analytics,
    analyticsLoading,
    conversations,
    detail,
    detailLoading,
    intelligence,
    meta,
    conversationFilters,
    setConversationFilters,
    intelFilters,
    setIntelFilters,
    selectedConversationId,
    setSelectedConversationId,
    connectionState,
    refetchAll,
    isLoading,
  } = useHoneypotData();

  const { toast } = useToast();
  const [tab, setTab] = useState('monitor');
  const [convRange, setConvRange] = useState<number | null>(null);
  const [intelRange, setIntelRange] = useState<number | null>(null);

  const scamTypeOptions = useMemo(
    () =>
      Object.entries(meta?.scam_categories ?? {}).map(([value, label]) => ({
        value,
        label: String(label),
      })),
    [meta]
  );

  const intelTypeOptions = useMemo(
    () => (meta?.intel_types ?? []).map((value) => ({ value, label: humanize(value) })),
    [meta]
  );

  const bandOptions = useMemo(
    () => (meta?.bands ?? []).map((value) => ({ value, label: humanize(value) })),
    [meta]
  );

  const handleExport = useCallback(
    (resource: 'conversations' | 'intelligence') => async (format: 'csv' | 'json') => {
      try {
        await downloadExport(resource, format);
        toast({
          title: 'Export started',
          description: `Downloading ${resource} as ${format.toUpperCase()}.`,
        });
      } catch (error) {
        toast({
          title: 'Export failed',
          description: error instanceof Error ? error.message : 'Could not reach the server.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // Selecting a conversation from the intelligence tab should take you there.
  const jumpToConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      setTab('monitor');
    },
    [setSelectedConversationId]
  );

  return (
    <div className="min-h-screen bg-gradient-dark gradient-mesh data-grid">
      <Header onRefresh={refetchAll} isLoading={isLoading} connectionState={connectionState} />

      <main className="container px-4 py-8 space-y-10">
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-primary">Autonomous Victim Agent</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-foreground">Real-time </span>
              <span className="text-gradient-cyber">scam intelligence</span>
              <span className="text-foreground"> extraction</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Engage scammers naturally, extract bank details, UPI IDs, and phishing links—never break character.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[140px] rounded-2xl opacity-50" />
              ))
            ) : (
              <>
                <StatCard title="Conversations" value={stats?.overview.total_conversations ?? 0} icon={MessageSquare} variant="default" />
                <StatCard title="Scams Detected" value={stats?.overview.scams_detected ?? 0} icon={AlertTriangle} variant="threat" />
                <StatCard title="Active Engagements" value={stats?.overview.active_engagements ?? 0} icon={Activity} variant="success" />
                <StatCard title="Intelligence" value={stats?.overview.total_intelligence ?? 0} icon={Database} variant="intel" />
                <StatCard title="Detection Rate" value={stats?.overview.detection_rate ?? '0%'} icon={Percent} variant="success" />
                <StatCard title="Avg. Turns" value={stats?.overview.avg_turns_per_conversation ?? '0'} subtitle="per conversation" icon={Shield} variant="default" />
              </>
            )}
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="inline-flex h-12 gap-1 rounded-xl border border-white/10 bg-card/60 p-1">
            <TabsTrigger value="monitor" className="gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <LayoutDashboard className="h-4 w-4" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <Brain className="h-4 w-4" />
              Intelligence
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <TestTube className="h-4 w-4" />
              API Tester
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-6">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <FilterBar
                  search={conversationFilters.q ?? ''}
                  onSearchChange={(q) => setConversationFilters((f) => ({ ...f, q }))}
                  searchPlaceholder="Search conversations and message text…"
                  facets={[
                    {
                      key: 'scam_type',
                      label: 'Scam type',
                      options: scamTypeOptions,
                      selected: conversationFilters.scam_type ?? [],
                      onChange: (scam_type) => setConversationFilters((f) => ({ ...f, scam_type })),
                    },
                    {
                      key: 'band',
                      label: 'Threat',
                      options: bandOptions,
                      selected: conversationFilters.band ?? [],
                      onChange: (band) => setConversationFilters((f) => ({ ...f, band })),
                    },
                  ]}
                  minConfidence={conversationFilters.min_confidence ?? 0}
                  onMinConfidenceChange={(min_confidence) =>
                    setConversationFilters((f) => ({ ...f, min_confidence }))
                  }
                  rangeHours={convRange}
                  onRangeChange={(hours) => {
                    setConvRange(hours);
                    setConversationFilters((f) => ({ ...f, from: hoursToFrom(hours) }));
                  }}
                  onExport={handleExport('conversations')}
                  exportLabel="Export"
                  resultCount={conversations.length}
                  totalCount={stats?.overview.total_conversations ?? conversations.length}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
              <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    Active Threats
                  </CardTitle>
                  <CardDescription>Real-time feed · Victim agent engaging scammers</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ThreatFeed
                    threats={conversations}
                    onSelect={setSelectedConversationId}
                    selectedId={selectedConversationId ?? undefined}
                    emptyMessage="No conversations match the current filters."
                  />
                </CardContent>
              </Card>

              <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    Conversation deep-dive
                  </CardTitle>
                  <CardDescription>
                    Transcript with extracted intel highlighted, agent strategy, and detection signals
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[560px] p-0">
                  <ConversationDetail
                    detail={detail}
                    loading={detailLoading}
                    conversationId={selectedConversationId ?? undefined}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Suspense
              fallback={
                <div className="grid gap-6 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[340px] rounded-2xl opacity-50" />
                  ))}
                </div>
              }
            >
              <AnalyticsPanel analytics={analytics} loading={analyticsLoading} />
            </Suspense>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <FilterBar
                  search={intelFilters.q ?? ''}
                  onSearchChange={(q) => setIntelFilters((f) => ({ ...f, q }))}
                  searchPlaceholder="Search values, context, or conversation id…"
                  facets={[
                    {
                      key: 'type',
                      label: 'Intel type',
                      options: intelTypeOptions,
                      selected: intelFilters.type ?? [],
                      onChange: (type) => setIntelFilters((f) => ({ ...f, type })),
                    },
                  ]}
                  minConfidence={intelFilters.min_confidence ?? 0}
                  onMinConfidenceChange={(min_confidence) =>
                    setIntelFilters((f) => ({ ...f, min_confidence }))
                  }
                  rangeHours={intelRange}
                  onRangeChange={(hours) => {
                    setIntelRange(hours);
                    setIntelFilters((f) => ({ ...f, from: hoursToFrom(hours) }));
                  }}
                  onExport={handleExport('intelligence')}
                  exportLabel="Export"
                  resultCount={intelligence.length}
                  totalCount={stats?.overview.total_intelligence ?? intelligence.length}
                />
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                    <Database className="h-5 w-5" />
                  </div>
                  Extracted Intelligence
                </CardTitle>
                <CardDescription>
                  Bank accounts, UPI IDs, IFSC, cards, wallets and phishing URLs from scammers
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <IntelligencePanel
                  intelligence={intelligence}
                  onSelectConversation={jumpToConversation}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card className="glass-card overflow-hidden">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Shield className="h-5 w-5" />
                  </div>
                  API Tester
                </CardTitle>
                <CardDescription>Send sample scam messages and see victim replies</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ApiTester />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle>API Reference</CardTitle>
            <CardDescription>POST messages to the honeypot endpoint</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="endpoint" className="border-white/5">
                <AccordionTrigger className="font-mono text-sm text-muted-foreground hover:text-foreground">
                  # Endpoints
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 font-mono text-sm text-primary">
                    <p>POST /api/honeypot-engage</p>
                    <p>GET&nbsp; /api/honeypot-stats</p>
                    <p>GET&nbsp; /api/analytics</p>
                    <p>GET&nbsp; /api/conversations</p>
                    <p>GET&nbsp; /api/conversations/:id</p>
                    <p>GET&nbsp; /api/intelligence</p>
                    <p>GET&nbsp; /api/export/:resource?format=csv|json</p>
                    <p>WS&nbsp;&nbsp; /ws</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="request" className="border-white/5">
                <AccordionTrigger className="font-mono text-sm text-muted-foreground hover:text-foreground">
                  # Request body
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="overflow-x-auto rounded-xl bg-muted/50 p-4 font-mono text-xs text-foreground">
{`{
  "conversation_id": "unique-id-123",
  "message": "Your account is blocked. Click here.",
  "timestamp": "2026-01-29T10:00:00Z"
}`}
                  </pre>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="response" className="border-white/5">
                <AccordionTrigger className="font-mono text-sm text-muted-foreground hover:text-foreground">
                  # Response
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="overflow-x-auto rounded-xl bg-muted/50 p-4 font-mono text-xs text-foreground">
{`{
  "scam_detected": true,
  "scam_label": "KYC / Verification",
  "scam_confidence": 0.86,
  "threat_score": 86,
  "band": "critical",
  "signals": [{ "id": "kyc_expiry", "weight": 3.5 }],
  "agent_reply": "...",
  "conversation_stage": "extracting",
  "agent_strategy": "bait upi id",
  "extracted_intelligence": {
    "upi_id": ["scammer@paytm"],
    "phishing_url": ["http://..."]
  }
}`}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-16 border-t border-white/5 bg-card/30 py-8">
        <div className="container px-4 text-center">
          <p className="font-semibold text-foreground">Scam Sentinel</p>
          <p className="mt-1 text-sm text-muted-foreground">Engage · Extract · Never break character</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
