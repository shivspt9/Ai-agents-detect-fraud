import { AlertTriangle, MessageSquare, Shield, Clock, Zap, Database } from 'lucide-react';
import { cn, safeRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/lib/api';
import { BAND_STATUS } from './chart-theme';

interface ThreatFeedProps {
  threats: Conversation[];
  onSelect?: (conversationId: string) => void;
  selectedId?: string;
  emptyMessage?: string;
}

export function ThreatFeed({ threats, onSelect, selectedId, emptyMessage }: ThreatFeedProps) {
  if (!threats.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
          <Shield className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">No matching threats</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground/80">
          {emptyMessage ??
            'The honeypot is monitoring. New scam conversations will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[420px]">
      <div className="space-y-2 p-4 pr-6">
        {threats.map((threat) => {
          const band = BAND_STATUS[threat.band] ?? BAND_STATUS.none;
          const isActive = threat.status === 'active' && threat.scam_detected;

          return (
            <button
              key={threat.conversation_id}
              onClick={() => onSelect?.(threat.conversation_id)}
              className={cn(
                'group w-full rounded-xl border p-4 text-left transition-all duration-200',
                'hover:border-primary/40 hover:bg-primary/5',
                selectedId === threat.conversation_id
                  ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/5'
                  : 'border-white/5 bg-card/50'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div
                    className={cn(
                      'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
                      isActive
                        ? 'bg-destructive/15 text-destructive pulse-threat'
                        : 'bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-medium text-foreground">
                      {threat.conversation_id}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs" style={{ borderColor: `${band.color}55`, color: band.color }}>
                        {threat.scam_detected ? threat.scam_label : 'Benign'}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {threat.turn_count} turns
                      </span>
                      {threat.intel_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-secondary">
                          <Database className="h-3.5 w-3.5" />
                          {threat.intel_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {/* Score is spelled out, so the band color never carries meaning alone. */}
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: band.color }}>
                    {band.label}
                    <span className="font-mono tabular-nums">{threat.threat_score}</span>
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', isActive && 'bg-success text-success-foreground')}
                  >
                    {isActive && <Zap className="mr-1 h-3 w-3" />}
                    {threat.stage ?? threat.status}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {safeRelativeTime(threat.last_activity_at)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
