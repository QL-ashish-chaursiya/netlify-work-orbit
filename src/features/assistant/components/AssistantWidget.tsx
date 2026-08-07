import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAssistantChat } from "@/features/assistant/hooks/useAssistantChat";
import type { AssistantMessage } from "@/features/assistant/types";

const WELCOME_MESSAGE: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me about your organization's data — bench strength, project status, who's over-allocated, pending approvals, POC outcomes, and more. I can only read data, never change it.",
};

// Floating launcher + a Sheet panel, mounted once in AppShell so it's
// available on every authenticated page. History is kept in local component
// state only (not persisted) — each question is answered fresh by the
// db-assistant edge function, which re-derives any data it needs itself.
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const askAssistant = useAssistantChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, askAssistant.isPending]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || askAssistant.isPending) return;

    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const historyForRequest = messages.filter((m) => m.id !== WELCOME_MESSAGE.id);
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    try {
      const answer = await askAssistant.mutateAsync({ message: text, history: historyForRequest });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: answer }]);
    } catch {
      // db-assistant already turns anything it can recover from (including
      // Groq tool-call failures) into a normal { answer } response — this
      // catch is only for the rare case the request itself never reached it
      // (network failure, function down). Either way, land it as a plain
      // assistant reply, not a red error toast — this is a "couldn't answer
      // that" moment for the user, not a system alarm.
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I don't have a way to answer that one right now — try rephrasing, or ask me something else.",
        },
      ]);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        aria-label="Open data assistant"
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg"
      >
        <Bot className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Data Assistant
            </SheetTitle>
            <SheetDescription>Read-only — scoped to your organization only.</SheetDescription>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            ))}
            {askAssistant.isPending && (
              <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking…</div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t px-4 py-3">
            <Input
              placeholder="Ask about bench, projects, approvals…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={askAssistant.isPending}
            />
            <Button size="icon" onClick={handleSend} disabled={askAssistant.isPending || !draft.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
