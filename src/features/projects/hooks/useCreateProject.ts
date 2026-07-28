import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { CreateProjectInput } from "@/features/projects/types";
import type { Tables, TablesInsert } from "@/lib/database.types";

interface CreateProjectResult {
  project: Tables<"projects">;
  // Set when the project itself was created fine but the follow-up
  // project_owners insert failed — not catastrophic, the project still
  // exists, but the caller should surface this so the PM knows to add
  // themselves as an owner manually via ProjectOwnersList.
  ownerWarning: string | null;
}

// PMs can self-create projects (projects_insert RLS allows admin OR
// project_manager). Creating a project also registers the creator as its
// primary owner in project_owners — done as a second sequential insert since
// there's no DB trigger wiring that up automatically.
export function useCreateProject() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async (input: CreateProjectInput): Promise<CreateProjectResult> => {
      if (!profile) throw new Error("Not authenticated");

      const insert: TablesInsert<"projects"> = {
        organization_id: profile.organization_id,
        name: input.name,
        code: input.code?.trim() ? input.code.trim() : null,
        client_name: input.client_name?.trim() ? input.client_name.trim() : null,
        business_function_id: input.business_function_id ?? null,
        planned_start_date: input.planned_start_date ? input.planned_start_date : null,
        planned_end_date: input.planned_end_date ? input.planned_end_date : null,
        created_by: profile.id,
        status: "draft",
      };

      const { data: project, error } = await supabase.from("projects").insert(insert).select().single();
      if (error) throw error;

      let ownerWarning: string | null = null;
      const { error: ownerError } = await supabase
        .from("project_owners")
        .insert({ project_id: project.id, profile_id: profile.id, is_primary: true });
      if (ownerError) {
        console.error("Failed to register project creator as owner:", ownerError);
        ownerWarning = ownerError.message;
      }

      return { project, ownerWarning };
    },
    onSuccess: ({ project }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(project.organization_id) });
    },
  });
}
