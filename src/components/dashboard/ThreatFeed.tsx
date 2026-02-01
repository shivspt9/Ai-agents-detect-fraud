import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, MessageSquare, Shield, Clock } from "lucide-react";
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
  banking: "bg-destructive/20 text-destructive border-destructive/30",
  phishing: "bg-warning/20 text-warning border-warning/30",
  lottery: "bg-secondary/20 text-secondary border-secondary/30",
  tech_support: "bg-accent/20 text-accent border-accent/30",
  romance: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  investment: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  unknown: "bg-muted text-muted-foreground border-muted",
};

export function ThreatFeed({ threats, onSelect, selectedId }: ThreatFeedProps) {
  if (!threats.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No active threats detected</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          The honeypot is monitoring for incoming scam attempts
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {threats.map((threat) => (
          <button
            key={threat.conversation_id}
            onClick={() => onSelect?.(threat.conversation_id)}
            className={cn(
              "w-full rounded-lg border bg-card/50 p-4 text-left transition-all duration-200",
              "hover:bg-muted/50 hover:border-primary/50",
              selectedId === threat.conversation_id && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-full p-2",
                  threat.status === 'active' 
                    ? "bg-destructive/20 text-destructive pulse-threat" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-mono text-sm text-foreground/90 truncate max-w-[180px]">
                    {threat.conversation_id}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs capitalize",
                        scamTypeColors[threat.scam_type] || scamTypeColors.unknown
                      )}
                    >
                      {threat.scam_type || 'analyzing'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {threat.turns}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant={threat.status === 'active' ? 'default' : 'secondary'}
                  className={cn(
                    "text-xs",
                    threat.status === 'active' && "bg-success text-success-foreground"
                  )}
                >
                  {threat.status}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
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