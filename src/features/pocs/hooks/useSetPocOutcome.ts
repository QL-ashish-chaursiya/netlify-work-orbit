import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { SetOutcomeInput } from "@/features/pocs/types";
import type { Tables } from "@/lib/database.types";

interface SetPocOutcomeArgs extends SetOutcomeInput {
  pocId: string;
}

export function useSetPocOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pocId, outcome, outcome_notes }: SetPocOutcomeArgs): Promise<Tables<"pocs">> => {
      const { data, error } = await supabase
        .from("pocs")
        .update({ outcome, outcome_notes: outcome_notes ?? null })
        .eq("id", pocId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (poc) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.poc(poc.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pocs(poc.organization_id) });
    },
  });
}
