import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { Tables } from "@/lib/database.types";

interface AddPocResourceArgs {
  pocId: string;
  profileId: string;
}

// Links an engaged resource (a profile) to a POC. `allocation_id` is left
// null — this flow only records who's engaged on the POC itself; wiring that
// effort to a specific real allocation is a separate, later action.
export function useAddPocResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pocId, profileId }: AddPocResourceArgs): Promise<Tables<"poc_resources">> => {
      const { data, error } = await supabase
        .from("poc_resources")
        .insert({ poc_id: pocId, profile_id: profileId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { pocId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.poc(pocId) });
    },
  });
}
