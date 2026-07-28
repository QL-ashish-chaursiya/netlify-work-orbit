import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { ConvertToProjectInput } from "@/features/pocs/types";
import type { Tables, TablesInsert } from "@/lib/database.types";

interface ConvertPocToProjectArgs {
  poc: Tables<"pocs">;
  input: ConvertToProjectInput;
}

interface ConvertPocToProjectResult {
  projectId: string;
}

// Closed-Won -> Project flow (BRD §5 Phase 6). This inserts directly into the
// shared `projects` table via a plain Supabase call — it's not the Projects
// feature's code, just this feature reading/writing a table it's allowed to
// touch — then links both sides: the new project's `source_poc_id` and the
// POC's `converted_project_id`.
export function useConvertPocToProject() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();

  return useMutation({
    mutationFn: async ({ poc, input }: ConvertPocToProjectArgs): Promise<ConvertPocToProjectResult> => {
      if (!profile) throw new Error("Not authenticated");

      const insert: TablesInsert<"projects"> = {
        organization_id: profile.organization_id,
        name: input.name,
        code: input.code ?? null,
        client_name: poc.client_name,
        business_function_id: poc.business_function_id,
        planned_start_date: input.planned_start_date ?? null,
        planned_end_date: input.planned_end_date ?? null,
        source_poc_id: poc.id,
        created_by: profile.id,
        status: "draft",
      };

      const { data: project, error } = await supabase.from("projects").insert(insert).select("id").single();
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("pocs")
        .update({ converted_project_id: project.id })
        .eq("id", poc.id);
      if (updateError) throw updateError;

      return { projectId: project.id };
    },
    onSuccess: (_result, { poc }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.poc(poc.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pocs(poc.organization_id) });
      // This feature doesn't own the projects list cache, but invalidating
      // the shared key (same shape the Projects feature uses) keeps it fresh
      // for whenever that feature's list is mounted.
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(poc.organization_id) });
    },
  });
}
