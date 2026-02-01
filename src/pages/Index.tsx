import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Database,
  Percent,
  MessageSquare
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Format recent activity for ThreatFeed
  const threatFeedData = stats?.recent_activity || conversations.slice(0, 10).map(c => ({
    conversation_id: c.conversation_id,
    status: c.status,
    scam_type: c.scam_type,
    turns: c.turn_count,
    last_activity: c.last_activity_at,
  }));

  return (
    <div className="min-h-screen bg-gradient-dark data-grid">
      <Header onRefresh={refetchAll} isLoading={isLoading} />

      <main className="container px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-lg" />
            ))
          ) : (
            <>
              <StatCard
                title="Total Conversations"
                value={stats?.overview.total_conversations || 0}
                icon={MessageSquare}
                variant="default"
              />
              <StatCard
                title="Scams Detected"
                value={stats?.overview.scams_detected || 0}
                icon={AlertTriangle}
                variant="threat"
              />
              <StatCard
                title="Active Engagements"
                value={stats?.overview.active_engagements || 0}
                icon={Activity}
                variant="success"
              />
              <StatCard
                title="Intelligence Extracted"
                value={stats?.overview.total_intelligence || 0}
                icon={Database}
                variant="intel"
              />
              <StatCard
                title="Detection Rate"
                value={stats?.overview.detection_rate || "0%"}
                icon={Percent}
                variant="success"
              />
              <StatCard
                title="Avg. Turns"
                value={stats?.overview.avg_turns_per_conversation || "0"}
                subtitle="per conversation"
                icon={Shield}
                variant="default"
              />
            </>
          )}
        </section>

        {/* Main Content */}
        <Tabs defaultValue="monitor" className="space-y-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="monitor" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Intelligence
            </TabsTrigger>
            <TabsTrigger value="test" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              API Tester
            </TabsTrigger>
          </TabsList>

          {/* Live Monitor Tab */}
          <TabsContent value="monitor" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Threat Feed */}
              <Card className="border-border bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Active Threats
                  </CardTitle>
                  <CardDescription>
                    Real-time feed of detected scam conversations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ThreatFeed
                    threats={threatFeedData || []}
                    onSelect={setSelectedConversationId}
                    selectedId={selectedConversationId || undefined}
                  />
                </CardContent>
              </Card>

              {/* Conversation Viewer */}
              <Card className="border-border bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Conversation Viewer
                  </CardTitle>
                  <CardDescription>
                    View agent-scammer conversation in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[450px]">
                  <ConversationViewer
                    messages={messages}
                    conversationId={selectedConversationId || undefined}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Intelligence Tab */}
          <TabsContent value="intelligence">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-secondary" />
                  Extracted Intelligence
                </CardTitle>
                <CardDescription>
                  Bank accounts, UPI IDs, phishing URLs, and other data extracted from scammers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntelligencePanel intelligence={intelligence} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Tester Tab */}
          <TabsContent value="test">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  API Tester
                </CardTitle>
                <CardDescription>
                  Test the honeypot API with sample scam messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiTester />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* API Documentation */}
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>
              Send scam messages to the honeypot endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 font-mono text-sm">
              <p className="text-muted-foreground mb-2"># Endpoint</p>
              <p className="text-primary break-all">
                POST {window.location.origin.replace('preview--', '').replace('.lovable.app', '.supabase.co')}/functions/v1/honeypot-engage
              </p>
            </div>
            
            <div className="rounded-lg bg-muted p-4 font-mono text-sm">
              <p className="text-muted-foreground mb-2"># Request Body</p>
              <pre className="text-foreground overflow-x-auto">
{`{
  "conversation_id": "unique-id-123",
  "message": "Your account is blocked. Click here.",
  "timestamp": "2026-01-29T10:00:00Z"
}`}
              </pre>
            </div>

            <div className="rounded-lg bg-muted p-4 font-mono text-sm">
              <p className="text-muted-foreground mb-2"># Response</p>
              <pre className="text-foreground overflow-x-auto">
{`{
  "scam_detected": true,
  "scam_type": "phishing",
  "agent_active": true,
  "agent_reply": "Oh, what happened?",
  "engagement_metrics": { "turns": 1 },
  "extracted_intelligence": {
    "bank_account": [],
    "upi_id": [],
    "phishing_url": ["..."]
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-6 mt-12">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>Agentic Honeypot System • AI-Powered Scam Detection</p>
          <p className="mt-1 text-xs">
            Autonomous agent engagement • Real-time intelligence extraction
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;