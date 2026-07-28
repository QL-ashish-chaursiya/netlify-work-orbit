import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";

interface RemovePocResourceArgs {
  id: string;
  pocId: string;
}

export function useRemovePocResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: RemovePocResourceArgs): Promise<void> => {
      const { error } = await supabase.from("poc_resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { pocId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.poc(pocId) });
    },
  });
}
