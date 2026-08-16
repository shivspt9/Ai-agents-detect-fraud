import { Shield, RefreshCw, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/hooks/use-realtime";

interface HeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
  connectionState?: ConnectionState;
}

const CONNECTION_COPY: Record<ConnectionState, { label: string; className: string }> = {
  open: { label: "Live", className: "text-success" },
  connecting: { label: "Connecting", className: "text-warning" },
  closed: { label: "Offline", className: "text-destructive" },
};

export function Header({ onRefresh, isLoading, connectionState = "connecting" }: HeaderProps) {
  const connection = CONNECTION_COPY[connectionState];
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-background/80 backdrop-blur-2xl">
      <div className="container flex h-16 items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-cyber shadow-lg ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
              <Shield className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-80" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-success" />
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-gradient-cyber">Scam</span>
              <span className="text-foreground"> Sentinel</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Autonomous victim agent · Intelligence extraction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Icon + word, so connection state never rides on color alone. */}
          <div
            className={cn(
              "hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 md:flex",
              connection.className
            )}
            title={`WebSocket ${connectionState}`}
          >
            {connectionState === "open" && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            )}
            {connectionState === "connecting" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {connectionState === "closed" && <WifiOff className="h-3.5 w-3.5" />}
            <span className="text-sm font-medium">{connection.label}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}
