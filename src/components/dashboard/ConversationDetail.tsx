import { useEffect, useRef, useMemo } from 'react';
import {
  Bot,
  User,
  MessageCircle,
  Target,
  Sparkles,
  ShieldAlert,
  Fingerprint,
  ArrowRight,
} from 'lucide-react';
import { cn, safeRelativeTime, safeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ConversationDetail as Detail, Message } from '@/lib/api';
import { BAND_STATUS, humanize } from './chart-theme';

interface ConversationDetailProps {
  detail: Detail | null;
  loading?: boolean;
  conversationId?: string;
}

const STAGE_COPY: Record<string, string> = {
  engaging: 'Building rapport, playing confused',
  probing: 'Asking questions to draw out the pitch',
  extracting: 'Baiting payment details out of the scammer',
  stalling: 'Wasting their time, keeping the line open',
  closing: 'Disengaging without breaking character',
};

/**
 * Highlights the exact substrings that produced intelligence, so a reader can
 * see *why* a value was captured rather than trusting the sidebar list.
 */
function HighlightedContent({ message }: { message: Message }) {
  const segments = useMemo(() => {
    const found = message.intel_found ?? [];
    if (!found.length) return [{ text: message.content, intel: null as string | null }];

    // Longest first, so a phone number inside a longer match is not split out.
    const needles = [...found].sort((a, b) => b.value.length - a.value.length);

    let parts: { text: string; intel: string | null }[] = [
      { text: message.content, intel: null },
    ];

    for (const needle of needles) {
      const next: typeof parts = [];
      for (const part of parts) {
        if (part.intel) {
          next.push(part);
          continue;
        }
        const idx = part.text.toLowerCase().indexOf(needle.value.toLowerCase());
        if (idx === -1) {
          next.push(part);
          continue;
        }
        if (idx > 0) next.push({ text: part.text.slice(0, idx), intel: null });
        next.push({
          text: part.text.slice(idx, idx + needle.value.length),
          intel: needle.type,
        });
        const rest = part.text.slice(idx + needle.value.length);
        if (rest) next.push({ text: rest, intel: null });
      }
      parts = next;
    }

    return parts;
  }, [message]);

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((segment, i) =>
        segment.intel ? (
          <mark
            key={i}
            title={humanize(segment.intel)}
            className="rounded bg-warning/25 px-1 py-0.5 font-mono text-warning ring-1 ring-warning/40"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </p>
  );
}

export function ConversationDetail({ detail, loading, conversationId }: ConversationDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [detail?.messages.length]);

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
          <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">Select a conversation</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground/80">
          Click a threat from the feed to inspect the full exchange
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-10 w-10 text-primary" />
        </div>
        <p className="font-medium text-muted-foreground">
          {loading ? 'Loading conversation…' : 'Conversation not found'}
        </p>
      </div>
    );
  }

  const { conversation, messages, intelligence, timeline } = detail;
  const band = BAND_STATUS[conversation.band] ?? BAND_STATUS.none;

  return (
    <div className="grid h-full grid-rows-[auto_1fr] lg:grid-cols-[1fr_300px] lg:grid-rows-1">
      <div className="flex min-h-0 flex-col border-b border-white/5 lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-white/5 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-sm font-medium text-foreground">
              {conversation.conversation_id}
            </p>
            <Badge
              variant="outline"
              className="gap-1.5 text-xs"
              style={{ borderColor: `${band.color}55`, color: band.color }}
            >
              <ShieldAlert className="h-3 w-3" />
              {band.label} · {conversation.threat_score}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="rounded-lg text-[11px]">
              {conversation.scam_label}
            </Badge>
            <span>{conversation.turn_count} turns</span>
            <span>·</span>
            <span>{intelligence.length} intel items</span>
            <span>·</span>
            <span>
              opened {safeRelativeTime(conversation.first_contact_at)}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
            <div className="min-w-0 text-xs">
              <p className="font-medium text-foreground">
                Playing {conversation.persona?.name ?? 'victim'}
                {conversation.persona?.occupation ? `, ${conversation.persona.occupation}` : ''}
              </p>
              <p className="truncate text-muted-foreground">
                {STAGE_COPY[conversation.stage] ?? conversation.stage}
              </p>
            </div>
          </div>
        </div>

        {timeline.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 px-6 py-3 text-[11px]">
            {timeline.map((step, i) => (
              <span key={`${step.stage}-${step.at}`} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-lg capitalize',
                    i === timeline.length - 1
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-white/10 text-muted-foreground'
                  )}
                >
                  {step.stage}
                </Badge>
              </span>
            ))}
          </div>
        )}

        <ScrollArea className="min-h-0 flex-1 px-6 py-4" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-4', message.role === 'agent' && 'flex-row-reverse')}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                    message.role === 'scammer' && 'bg-destructive/15 text-destructive',
                    message.role === 'agent' && 'bg-primary/15 text-primary',
                    message.role === 'system' && 'bg-muted text-muted-foreground'
                  )}
                >
                  {message.role === 'scammer' ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>

                <div
                  className={cn(
                    'flex max-w-[85%] flex-col gap-1',
                    message.role === 'agent' && 'items-end'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3',
                      message.role === 'scammer' &&
                        'rounded-bl-md border border-destructive/20 bg-destructive/10',
                      message.role === 'agent' &&
                        'rounded-br-md border border-primary/20 bg-primary/10',
                      message.role === 'system' && 'bg-muted'
                    )}
                  >
                    <HighlightedContent message={message} />
                  </div>

                  {message.role === 'agent' && message.strategy && (
                    <p className="flex items-center gap-1 text-[11px] text-primary/80">
                      <Target className="h-3 w-3" />
                      {message.strategy}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {message.role === 'scammer'
                      ? 'Scammer'
                      : message.role === 'agent'
                        ? `Victim agent${conversation.persona?.name ? ` (${conversation.persona.name})` : ''}`
                        : 'System'}{' '}
                    · {safeTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <aside className="min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-5 p-5">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <Fingerprint className="h-4 w-4 text-secondary" />
                Extracted ({intelligence.length})
              </h4>
              <div className="mt-3 space-y-2">
                {intelligence.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nothing extracted yet.</p>
                )}
                {intelligence.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {humanize(item.intel_type)}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-foreground">{item.value}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={item.confidence * 100} className="h-1" />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground">{item.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-white/5" />

            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Detection signals
              </h4>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(conversation.signals ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No signals fired.</p>
                )}
                {(conversation.signals ?? []).map((signal) => (
                  <Badge
                    key={signal.id}
                    variant="outline"
                    className="rounded-lg border-white/10 text-[10px] font-normal"
                    title={`${signal.category} · weight ${signal.weight}`}
                  >
                    {signal.id.replace(/_/g, ' ')}
                    <span className="ml-1 font-mono text-muted-foreground">+{signal.weight}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {conversation.goal && (
              <>
                <Separator className="bg-white/5" />
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4 text-primary" />
                    Current objective
                  </h4>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Trying to obtain{' '}
                    <span className="font-medium text-foreground">
                      {humanize(conversation.goal)}
                    </span>
                    .
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
