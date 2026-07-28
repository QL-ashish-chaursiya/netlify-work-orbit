import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { RoleRequirementInput } from "@/features/projects/types";
import type { Tables } from "@/lib/database.types";

export function useCreateRoleRequirement(projectId: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async (input: RoleRequirementInput): Promise<Tables<"project_role_requirements">> => {
      if (!profile) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("project_role_requirements")
        .insert({
          project_id: projectId,
          title: input.title,
          headcount: input.headcount,
          required_skills: input.required_skills,
          created_by: profile.id,
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roleRequirements(projectId) });
    },
  });
}
