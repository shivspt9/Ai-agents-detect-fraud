import { Shield, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({ onRefresh, isLoading }: HeaderProps) {
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
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 md:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-sm font-medium text-muted-foreground">Live</span>
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
