import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import type { ProjectStatus, Tables, TablesUpdate } from "@/lib/database.types";

interface UpdateProjectStatusInput {
  id: string;
  status: ProjectStatus;
  // Passed through explicitly (rather than read off cache) so invalidation
  // of the org's project list works even before this project's detail query
  // has ever been populated.
  organizationId: string;
}

// Callers transitioning TO 'closed' must check useProjectActiveAllocationCount
// first and block the action in the UI (BRD §5 Phase 3 / §7). This hook does
// not re-check that here — it still lets the guard_project_close Postgres
// trigger's error message pass through untouched if the UI check was stale.
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: UpdateProjectStatusInput): Promise<Tables<"projects">> => {
      const patch: TablesUpdate<"projects"> = { status };
      if (status === "closed") patch.closed_at = new Date().toISOString();
      if (status === "cancelled") patch.cancelled_at = new Date().toISOString();

      const { data, error } = await supabase.from("projects").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.project(id) });
      const previous = queryClient.getQueryData<Tables<"projects">>(queryKeys.project(id));
      if (previous) {
        queryClient.setQueryData<Tables<"projects">>(queryKeys.project(id), { ...previous, status });
      }
      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.project(id), context.previous);
      }
    },
    onSettled: (_data, _err, { id, organizationId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(organizationId) });
    },
  });
}
