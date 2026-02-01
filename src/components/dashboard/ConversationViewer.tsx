import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bot, User, AlertCircle } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Select a conversation to view</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Click on a threat from the feed to see the conversation
        </p>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="animate-pulse rounded-full bg-muted p-6 mb-4">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4">
        <p className="font-mono text-sm text-primary">{conversationId}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {messages.length} messages in this conversation
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'agent' && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "flex-shrink-0 rounded-full p-2",
                message.role === 'scammer' && "bg-destructive/20 text-destructive",
                message.role === 'agent' && "bg-primary/20 text-primary",
                message.role === 'system' && "bg-muted text-muted-foreground"
              )}>
                {message.role === 'scammer' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              
              <div className={cn(
                "flex-1 max-w-[80%]",
                message.role === 'agent' && "flex flex-col items-end"
              )}>
                <div className={cn(
                  "rounded-lg px-4 py-3",
                  message.role === 'scammer' && "bg-destructive/10 border border-destructive/20",
                  message.role === 'agent' && "bg-primary/10 border border-primary/20",
                  message.role === 'system' && "bg-muted"
                )}>
                  <p className="text-sm font-mono whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {message.role === 'scammer' ? 'Scammer' : message.role === 'agent' ? 'Honeypot Agent' : 'System'}
                  {' • '}
                  {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}