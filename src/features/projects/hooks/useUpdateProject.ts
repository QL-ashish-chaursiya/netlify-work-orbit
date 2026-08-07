import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { CreateProjectInput } from "@/features/projects/types";
import type { Tables, TablesUpdate } from "@/lib/database.types";

// Edits the same fields ProjectForm collects on create. RLS (projects_update)
// already restricts this to Admin or an existing project owner.
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput): Promise<Tables<"projects">> => {
      const patch: TablesUpdate<"projects"> = {
        name: input.name,
        code: input.code?.trim() ? input.code.trim() : null,
        client_name: input.client_name?.trim() ? input.client_name.trim() : null,
        description: input.description?.trim() ? input.description.trim() : null,
        project_manager_id: input.project_manager_id ?? null,
        resource_manager_id: input.resource_manager_id ?? null,
        planned_start_date: input.planned_start_date ? input.planned_start_date : null,
        planned_end_date: input.planned_end_date ? input.planned_end_date : null,
      };
      const { data, error } = await supabase.from("projects").update(patch).eq("id", projectId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(project.organization_id) });
    },
  });
}
