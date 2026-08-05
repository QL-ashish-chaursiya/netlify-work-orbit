import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { CreatePocInput } from "@/features/pocs/types";
import type { Tables, TablesInsert } from "@/lib/database.types";

// Sales Lead + Admin can log a POC (RLS `pocs_write`). Always starts
// `outcome: 'pending'` — outcome is set later via useSetPocOutcome.
export function useCreatePoc() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async (input: CreatePocInput): Promise<Tables<"pocs">> => {
      if (!profile) throw new Error("Not authenticated");

      const insert: TablesInsert<"pocs"> = {
        organization_id: profile.organization_id,
        client_name: input.client_name,
        opportunity_name: input.opportunity_name ?? null,
        requirement: input.requirement ?? null,
        presales_lead_id: input.presales_lead_id ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        priority: input.priority,
        justification: input.justification ?? null,
        outcome: "pending",
        created_by: profile.id,
      };

      const { data, error } = await supabase.from("pocs").insert(insert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (poc) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pocs(poc.organization_id) });
    },
  });
}
