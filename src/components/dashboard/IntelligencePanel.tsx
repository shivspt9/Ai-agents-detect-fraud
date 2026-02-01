import { formatDistanceToNow } from "date-fns";
import { 
  CreditCard, 
  Link2, 
  Phone, 
  Mail, 
  Wallet,
  QrCode,
  Copy,
  Check,
  Database,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import type { Intelligence } from "@/lib/api";

interface IntelligencePanelProps {
  intelligence: Intelligence[];
}

const typeIcons: Record<string, typeof CreditCard> = {
  bank_account: CreditCard,
  ifsc: CreditCard,
  upi_id: QrCode,
  phishing_url: Link2,
  phone_number: Phone,
  email: Mail,
  crypto_wallet: Wallet,
};

const typeLabels: Record<string, string> = {
  bank_account: "Bank Account",
  ifsc: "IFSC Code",
  upi_id: "UPI ID",
  phishing_url: "Phishing URL",
  phone_number: "Phone Number",
  email: "Email Address",
  crypto_wallet: "Crypto Wallet",
};

const typeStyles: Record<string, string> = {
  bank_account: "border-destructive/30 bg-destructive/5 text-destructive",
  ifsc: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  upi_id: "border-warning/30 bg-warning/5 text-warning",
  phishing_url: "border-secondary/30 bg-secondary/5 text-secondary",
  phone_number: "border-accent/30 bg-accent/5 text-accent",
  email: "border-primary/30 bg-primary/5 text-primary",
  crypto_wallet: "border-purple-500/30 bg-purple-500/5 text-purple-400",
};

export function IntelligencePanel({ intelligence }: IntelligencePanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!intelligence.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
          <Database className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">No intelligence yet</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground/80">
          Extracted bank accounts, UPI IDs, and links will appear here
        </p>
      </div>
    );
  }

  // Group intelligence by type
  const groupedIntel = intelligence.reduce((acc, intel) => {
    if (!acc[intel.intel_type]) {
      acc[intel.intel_type] = [];
    }
    acc[intel.intel_type].push(intel);
    return acc;
  }, {} as Record<string, Intelligence[]>);

  const handleExport = () => {
    const data = JSON.stringify(intelligence, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelligence-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          {intelligence.length} items extracted
        </span>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 rounded-xl border-white/10">
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </div>
      <ScrollArea className="h-[500px]">
        <div className="space-y-8 pr-4">
          {Object.entries(groupedIntel).map(([type, items]) => {
            const Icon = typeIcons[type] ?? CreditCard;
            const style = typeStyles[type] ?? "border-white/10 bg-muted/30";
            return (
              <div key={type} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", style)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h4 className="font-medium">{typeLabels[type] ?? type}</h4>
                  <Badge variant="secondary" className="rounded-lg">{items.length}</Badge>
                </div>
                <div className="space-y-2 pl-12">
                  {items.map((intel) => (
                    <div
                      key={intel.id}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors hover:bg-white/[0.02]",
                        style
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm">{intel.value}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Confidence: {intel.confidence}%</span>
                          <span>{formatDistanceToNow(new Date(intel.extracted_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(intel.value, intel.id)} className="flex-shrink-0 rounded-lg">
                        {copiedId === intel.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}