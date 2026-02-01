import { useState } from "react";
import { Send, Loader2, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { engageHoneypot, type HoneypotResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ApiTester() {
  const [conversationId, setConversationId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<HoneypotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!message.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await engageHoneypot({
        conversation_id: conversationId || `test-${Date.now()}`,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const sampleMessages = [
    "Your bank account has been compromised. Click here to verify: http://scam.xyz/verify",
    "Congratulations! You've won $1,000,000. Send your UPI ID to claim: prize@scam",
    "This is Microsoft Support. Your computer has a virus. Please send $500 to fix it.",
    "I'm stuck abroad, please send money to my account 1234567890123456",
    "URGENT: Your KYC will expire. Share OTP to complete verification.",
    "Transfer failed. Send to UPI: scammer@paytm. Account: 9876543210123456 IFSC: HDFC0001234",
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conversationId" className="text-muted-foreground">
              Conversation ID (optional)
            </Label>
            <Input
              id="conversationId"
              placeholder="Auto-generated if empty"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              className="rounded-xl border-white/10 bg-muted/30 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message" className="text-muted-foreground">
              Scam message
            </Label>
            <Textarea
              id="message"
              placeholder="Paste or type a scam message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px] rounded-xl border-white/10 bg-muted/30 font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleMessages.map((sample, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setMessage(sample)}
                className="rounded-full border-white/10 text-xs"
              >
                Sample {i + 1}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleTest}
            disabled={isLoading || !message.trim()}
            className="w-full rounded-xl bg-gradient-cyber py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Send to Honeypot
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {response && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-card/50 p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-semibold">Response</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-white/5 bg-muted/20 p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Detection & stage
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={response.scam_detected ? "destructive" : "secondary"}
                      className="rounded-lg"
                    >
                      {response.scam_detected ? "⚠️ Scam" : "✓ No scam"}
                    </Badge>
                    {response.scam_type && (
                      <Badge variant="outline" className="capitalize rounded-lg">
                        {response.scam_type}
                      </Badge>
                    )}
                    {response.conversation_stage && (
                      <Badge variant="secondary" className="capitalize rounded-lg">
                        <Zap className="mr-1 h-3 w-3" />
                        {response.conversation_stage}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {response.scam_confidence}%
                    {response.confidence_score != null &&
                      ` · Agent: ${Math.round(response.confidence_score * 100)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Turns: {response.engagement_metrics.turns}
                  </p>
                </div>

                {response.agent_reply && (
                  <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Victim reply
                    </h4>
                    <p className="text-sm leading-relaxed">{response.agent_reply}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Extracted intelligence
                </h4>
                <ScrollArea className="h-[160px]">
                  <pre className="rounded-xl bg-muted/30 p-4 font-mono text-xs text-foreground">
                    {JSON.stringify(response.extracted_intelligence, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  View raw JSON
                </summary>
                <ScrollArea className="mt-2 h-[200px]">
                  <pre className="rounded-xl bg-muted/30 p-4 font-mono text-xs text-foreground">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </ScrollArea>
              </details>
            </div>
          )}

          {!response && !error && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Send a message to see the victim reply and extracted intelligence
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
