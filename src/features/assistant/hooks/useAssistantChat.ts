import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { resolveEdgeFunctionError } from "@/features/employees/hooks/edgeFunctionError";
import type { AssistantMessage } from "@/features/assistant/types";

interface AskAssistantInput {
  message: string;
  history: AssistantMessage[];
}

// Calls the db-assistant edge function — a read-only Gemini-backed assistant
// scoped to the caller's own organization via RLS (see the function's own
// header comment for the full safety model). `history` is sent as plain
// {role, content} text turns; the function re-derives any tool-call context
// itself each request, nothing about tool internals is persisted client-side.
export function useAssistantChat() {
  return useMutation({
    mutationFn: async ({ message, history }: AskAssistantInput): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<{ answer?: string; error?: string }>("db-assistant", {
        body: {
          message,
          history: history.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      const errorMessage = await resolveEdgeFunctionError(error, data);
      if (errorMessage) throw new Error(errorMessage);
      return data?.answer ?? "I couldn't find an answer to that.";
    },
  });
}
