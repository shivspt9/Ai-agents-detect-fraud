import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "threat" | "intel" | "success";
}

const variantConfig = {
  default: {
    card: "border-white/10 hover:border-primary/40",
    iconBg: "bg-primary/15 text-primary",
    glow: "bg-primary",
  },
  threat: {
    card: "border-white/10 hover:border-destructive/50",
    iconBg: "bg-destructive/15 text-destructive",
    glow: "bg-destructive",
  },
  intel: {
    card: "border-white/10 hover:border-secondary/50",
    iconBg: "bg-secondary/15 text-secondary",
    glow: "bg-secondary",
  },
  success: {
    card: "border-white/10 hover:border-success/50",
    iconBg: "bg-success/15 text-success",
    glow: "bg-success",
  },
} as const;

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card/60 p-6 transition-all duration-300 hover-lift",
        config.card
      )}
    >
      <div
        className={cn(
          "absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.07] blur-3xl transition-opacity group-hover:opacity-[0.12]",
          config.glow
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
            config.iconBg
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
