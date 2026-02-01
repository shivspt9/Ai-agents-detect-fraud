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
  AlertTriangle
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
  upi_id: QrCode,
  phishing_url: Link2,
  phone_number: Phone,
  email: Mail,
  crypto_wallet: Wallet,
};

const typeLabels: Record<string, string> = {
  bank_account: "Bank Account",
  upi_id: "UPI ID",
  phishing_url: "Phishing URL",
  phone_number: "Phone Number",
  email: "Email Address",
  crypto_wallet: "Crypto Wallet",
};

const typeColors: Record<string, string> = {
  bank_account: "text-destructive border-destructive/30 bg-destructive/10",
  upi_id: "text-warning border-warning/30 bg-warning/10",
  phishing_url: "text-secondary border-secondary/30 bg-secondary/10",
  phone_number: "text-accent border-accent/30 bg-accent/10",
  email: "text-primary border-primary/30 bg-primary/10",
  crypto_wallet: "text-purple-400 border-purple-400/30 bg-purple-400/10",
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">No intelligence extracted yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          The AI agent will extract scammer data during conversations
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

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-6 pr-4">
        {Object.entries(groupedIntel).map(([type, items]) => {
          const Icon = typeIcons[type] || AlertTriangle;
          
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", typeColors[type]?.split(' ')[0])} />
                <h4 className="text-sm font-medium">{typeLabels[type] || type}</h4>
                <Badge variant="outline" className="text-xs">
                  {items.length}
                </Badge>
              </div>
              
              <div className="space-y-2 pl-6">
                {items.map((intel) => (
                  <div
                    key={intel.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      typeColors[type]
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{intel.value}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs opacity-70">
                          Confidence: {intel.confidence}%
                        </span>
                        <span className="text-xs opacity-70">
                          • {formatDistanceToNow(new Date(intel.extracted_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(intel.value, intel.id)}
                      className="flex-shrink-0"
                    >
                      {copiedId === intel.id ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}