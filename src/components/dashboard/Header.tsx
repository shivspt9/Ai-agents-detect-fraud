import { Shield, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({ onRefresh, isLoading }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="rounded-lg bg-gradient-cyber p-2">
              <Shield className="h-6 w-6 text-background" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-gradient-cyber">Agentic</span>
              <span className="text-foreground"> Honeypot</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              AI-Powered Scam Detection & Intelligence Extraction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-success animate-pulse" />
            <span className="text-muted-foreground">System Active</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}