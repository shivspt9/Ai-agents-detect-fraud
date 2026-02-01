import { useState } from "react";
import { Send, Loader2, AlertCircle, CheckCircle } from "lucide-react";
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
      setError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setIsLoading(false);
    }
  };

  const sampleMessages = [
    "Your bank account has been compromised. Click here to verify: http://scam.xyz/verify",
    "Congratulations! You've won $1,000,000. Send your UPI ID to claim: prize@scam",
    "This is Microsoft Support. Your computer has a virus. Please send $500 to fix it.",
    "I'm stuck abroad, please send money to my account 1234567890123456",
  ];

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="conversationId">Conversation ID (optional)</Label>
          <Input
            id="conversationId"
            placeholder="auto-generated if empty"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            className="font-mono"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="message">Scam Message</Label>
          <Textarea
            id="message"
            placeholder="Enter a scam message to test the honeypot..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {sampleMessages.map((sample, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => setMessage(sample)}
              className="text-xs"
            >
              Sample {i + 1}
            </Button>
          ))}
        </div>

        <Button 
          onClick={handleTest} 
          disabled={isLoading || !message.trim()}
          className="w-full bg-gradient-cyber"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Test Honeypot API
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-medium">API Response</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Status */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h4 className="text-sm font-medium">Detection Status</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant={response.scam_detected ? "destructive" : "secondary"}>
                  {response.scam_detected ? "⚠️ Scam Detected" : "✓ No Scam"}
                </Badge>
                {response.scam_type && (
                  <Badge variant="outline" className="capitalize">
                    {response.scam_type}
                  </Badge>
                )}
                <Badge variant="outline">
                  Confidence: {response.scam_confidence}%
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Agent: {response.agent_active ? "Active" : "Inactive"}</p>
                <p>Turns: {response.engagement_metrics.turns}</p>
              </div>
            </div>

            {/* Agent Reply */}
            {response.agent_reply && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium">Agent Reply</h4>
                <p className="text-sm font-mono bg-muted p-3 rounded">
                  {response.agent_reply}
                </p>
              </div>
            )}
          </div>

          {/* Extracted Intelligence */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h4 className="text-sm font-medium">Extracted Intelligence</h4>
            <ScrollArea className="h-[150px]">
              <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(response.extracted_intelligence, null, 2)}
              </pre>
            </ScrollArea>
          </div>

          {/* Raw JSON */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              View Raw JSON Response
            </summary>
            <ScrollArea className="mt-2 h-[200px]">
              <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </ScrollArea>
          </details>
        </div>
      )}
    </div>
  );
}