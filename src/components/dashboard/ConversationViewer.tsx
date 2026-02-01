import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bot, User, AlertCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/api";

interface ConversationViewerProps {
  messages: Message[];
  conversationId?: string;
}

export function ConversationViewer({ messages, conversationId }: ConversationViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
          <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">Select a conversation</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground/80">
          Click a threat from the feed to view the victim–scammer exchange
        </p>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-10 w-10 text-primary" />
        </div>
        <p className="font-medium text-muted-foreground">Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/5 px-6 py-4">
        <p className="font-mono text-sm font-medium text-foreground">{conversationId}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {messages.length} messages
        </p>
      </div>

      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4",
                message.role === "agent" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl",
                  message.role === "scammer" && "bg-destructive/15 text-destructive",
                  message.role === "agent" && "bg-primary/15 text-primary",
                  message.role === "system" && "bg-muted text-muted-foreground"
                )}
              >
                {message.role === "scammer" ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Bot className="h-5 w-5" />
                )}
              </div>

              <div
                className={cn(
                  "flex max-w-[85%] flex-col gap-1",
                  message.role === "agent" && "items-end"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3",
                    message.role === "scammer" &&
                      "rounded-bl-md bg-destructive/10 border border-destructive/20",
                    message.role === "agent" &&
                      "rounded-br-md bg-primary/10 border border-primary/20",
                    message.role === "system" && "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {message.role === "scammer"
                    ? "Scammer"
                    : message.role === "agent"
                      ? "Victim (Agent)"
                      : "System"}{" "}
                  · {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
