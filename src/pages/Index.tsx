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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { ThreatFeed } from "@/components/dashboard/ThreatFeed";
import { ConversationViewer } from "@/components/dashboard/ConversationViewer";
import { IntelligencePanel } from "@/components/dashboard/IntelligencePanel";
import { ApiTester } from "@/components/dashboard/ApiTester";
import { useHoneypotData } from "@/hooks/use-honeypot-data";

const Index = () => {
  const {
    stats,
    statsLoading,
    conversations,
    messages,
    intelligence,
    selectedConversationId,
    setSelectedConversationId,
    refetchAll,
    isLoading,
  } = useHoneypotData();

  const threatFeedData =
    stats?.recent_activity ||
    conversations.slice(0, 10).map((c) => ({
      conversation_id: c.conversation_id,
      status: c.status,
      scam_type: c.scam_type,
      turns: c.turn_count,
      last_activity: c.last_activity_at,
    }));

  return (
    <div className="min-h-screen bg-gradient-dark gradient-mesh data-grid">
      <Header onRefresh={refetchAll} isLoading={isLoading} />

      <main className="container px-4 py-8 space-y-10">
        {/* Hero + Stats */}
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
                <StatCard
                  title="Conversations"
                  value={stats?.overview.total_conversations ?? 0}
                  icon={MessageSquare}
                  variant="default"
                />
                <StatCard
                  title="Scams Detected"
                  value={stats?.overview.scams_detected ?? 0}
                  icon={AlertTriangle}
                  variant="threat"
                />
                <StatCard
                  title="Active Engagements"
                  value={stats?.overview.active_engagements ?? 0}
                  icon={Activity}
                  variant="success"
                />
                <StatCard
                  title="Intelligence"
                  value={stats?.overview.total_intelligence ?? 0}
                  icon={Database}
                  variant="intel"
                />
                <StatCard
                  title="Detection Rate"
                  value={stats?.overview.detection_rate ?? "0%"}
                  icon={Percent}
                  variant="success"
                />
                <StatCard
                  title="Avg. Turns"
                  value={stats?.overview.avg_turns_per_conversation ?? "0"}
                  subtitle="per conversation"
                  icon={Shield}
                  variant="default"
                />
              </>
            )}
          </div>
        </section>

        {/* Tabs */}
        <Tabs defaultValue="monitor" className="space-y-6">
          <TabsList className="inline-flex h-12 gap-1 rounded-xl border border-white/10 bg-card/60 p-1">
            <TabsTrigger
              value="monitor"
              className="gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <LayoutDashboard className="h-4 w-4" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger
              value="intelligence"
              className="gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <Brain className="h-4 w-4" />
              Intelligence
            </TabsTrigger>
            <TabsTrigger
              value="test"
              className="gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <TestTube className="h-4 w-4" />
              API Tester
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    Active Threats
                  </CardTitle>
                  <CardDescription>
                    Real-time feed · Victim agent engaging scammers
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ThreatFeed
                    threats={threatFeedData ?? []}
                    onSelect={setSelectedConversationId}
                    selectedId={selectedConversationId ?? undefined}
                  />
                </CardContent>
              </Card>

              <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    Conversation
                  </CardTitle>
                  <CardDescription>
                    Victim vs scammer · Natural engagement
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[420px] p-0">
                  <ConversationViewer
                    messages={messages}
                    conversationId={selectedConversationId ?? undefined}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="intelligence">
            <Card className="glass-card overflow-hidden">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                    <Database className="h-5 w-5" />
                  </div>
                  Extracted Intelligence
                </CardTitle>
                <CardDescription>
                  Bank accounts, UPI IDs, IFSC, phishing URLs from scammers
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <IntelligencePanel intelligence={intelligence} />
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
                <CardDescription>
                  Send sample scam messages and see victim replies
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ApiTester />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* API Docs - Accordion */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle>API Reference</CardTitle>
            <CardDescription>
              POST messages to the honeypot endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="endpoint" className="border-white/5">
                <AccordionTrigger className="font-mono text-sm text-muted-foreground hover:text-foreground">
                  # Endpoint
                </AccordionTrigger>
                <AccordionContent>
                  <p className="break-all font-mono text-sm text-primary">
                    POST{" "}
                    {import.meta.env.VITE_SUPABASE_URL
                      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/honeypot-engage`
                      : `${window.location.origin}/functions/v1/honeypot-engage`}
                  </p>
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
  "agent_reply": "...",
  "conversation_stage": "engaging",
  "confidence_score": 0.85,
  "extracted_intelligence": { "bank_account": [], "ifsc": [], "upi_id": [], "phishing_url": [] }
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
          <p className="mt-1 text-sm text-muted-foreground">
            Engage · Extract · Never break character
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
