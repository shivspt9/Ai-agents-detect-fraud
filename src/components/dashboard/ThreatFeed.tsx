import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, MessageSquare, Shield, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ThreatItem {
  conversation_id: string;
  status: string;
  scam_type: string;
  turns: number;
  last_activity: string;
}

interface ThreatFeedProps {
  threats: ThreatItem[];
  onSelect?: (conversationId: string) => void;
  selectedId?: string;
}

const scamTypeColors: Record<string, string> = {
  banking: "bg-destructive/15 text-destructive border-destructive/30",
  phishing: "bg-warning/15 text-warning border-warning/30",
  lottery: "bg-secondary/15 text-secondary border-secondary/30",
  tech_support: "bg-accent/15 text-accent border-accent/30",
  romance: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  investment: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  unknown: "bg-muted/50 text-muted-foreground border-white/10",
};

export function ThreatFeed({ threats, onSelect, selectedId }: ThreatFeedProps) {
  if (!threats.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
          <Shield className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">No active threats</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground/80">
          The honeypot is monitoring. New scam conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-4 pr-6">
        {threats.map((threat, index) => (
          <button
            key={threat.conversation_id}
            onClick={() => onSelect?.(threat.conversation_id)}
            className={cn(
              "group w-full rounded-xl border p-4 text-left transition-all duration-200",
              "hover:border-primary/40 hover:bg-primary/5",
              selectedId === threat.conversation_id
                ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/5"
                : "border-white/5 bg-card/50"
            )}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div
                  className={cn(
                    "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
                    threat.status === "active"
                      ? "bg-destructive/15 text-destructive pulse-threat"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-foreground">
                    {threat.conversation_id}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        scamTypeColors[threat.scam_type] || scamTypeColors.unknown
                      )}
                    >
                      {threat.scam_type || "analyzing"}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {threat.turns} turns
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge
                  variant={threat.status === "active" ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    threat.status === "active" && "bg-success text-success-foreground"
                  )}
                >
                  {threat.status === "active" && (
                    <Zap className="mr-1 h-3 w-3" />
                  )}
                  {threat.status}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(threat.last_activity), { addSuffix: true })}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
