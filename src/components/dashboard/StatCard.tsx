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
  variant?: 'default' | 'threat' | 'intel' | 'success';
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default' 
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border hover:border-primary/50',
    threat: 'border-destructive/30 hover:border-destructive glow-threat',
    intel: 'border-secondary/30 hover:border-secondary glow-intel',
    success: 'border-success/30 hover:border-success glow-primary',
  };

  const iconStyles = {
    default: 'text-primary',
    threat: 'text-destructive',
    intel: 'text-secondary',
    success: 'text-success',
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border bg-card p-6 transition-all duration-300 hover-lift",
      variantStyles[variant]
    )}>
      {/* Background glow effect */}
      <div className={cn(
        "absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl",
        variant === 'threat' && "bg-destructive",
        variant === 'intel' && "bg-secondary",
        variant === 'success' && "bg-success",
        variant === 'default' && "bg-primary"
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight font-mono">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        <div className={cn(
          "rounded-lg bg-muted p-3",
          iconStyles[variant]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}