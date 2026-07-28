import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { projectOwnersKey } from "@/features/projects/hooks/useProjectOwners";
import type { Tables } from "@/lib/database.types";

interface AddProjectOwnerInput {
  profileId: string;
  isPrimary?: boolean;
}

export function useAddProjectOwner(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, isPrimary = false }: AddProjectOwnerInput): Promise<Tables<"project_owners">> => {
      const { data, error } = await supabase
        .from("project_owners")
        .insert({ project_id: projectId, profile_id: profileId, is_primary: isPrimary })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectOwnersKey(projectId) });
    },
  });
}
