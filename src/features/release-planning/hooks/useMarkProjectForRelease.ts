import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { plannedForReleaseKey } from "@/features/release-planning/hooks/useAllocationsPlannedForRelease";
import { calendarAllocationsKey } from "@/features/release-planning/hooks/useActiveAllocationsForCalendar";

interface MarkProjectForReleaseVars {
  projectId: string;
  planned_release_date: string;
}

// Bulk counterpart to useMarkForRelease: fires when a project itself moves
// to `releasing` (see ProjectStatusStepper) — every currently-`active`
// allocation on the project is marked `planned_for_release` with the same
// date in one UPDATE, instead of doing it one allocation at a time.
export function useMarkProjectForRelease() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async ({ projectId, planned_release_date }: MarkProjectForReleaseVars) => {
      const { data, error } = await supabase
        .from("allocations")
        .update({ status: "planned_for_release", planned_release_date })
        .eq("project_id", projectId)
        .eq("status", "active")
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations(orgId) });
      // Prefix-matches both the project's allocation list and its nested
      // "active-count" query (ProjectStatusStepper's close-guard check).
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationsByProject(projectId) });
      queryClient.invalidateQueries({ queryKey: plannedForReleaseKey(orgId) });
      queryClient.invalidateQueries({ queryKey: calendarAllocationsKey(orgId) });
    },
  });
}
