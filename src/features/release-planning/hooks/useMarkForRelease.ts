import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { plannedForReleaseKey } from "@/features/release-planning/hooks/useAllocationsPlannedForRelease";
import { calendarAllocationsKey } from "@/features/release-planning/hooks/useActiveAllocationsForCalendar";

interface MarkForReleaseVars {
  allocationId: string;
  planned_release_date: string;
}

// Only meaningful on `active` allocations — that guard lives in the UI
// (MarkForReleaseDialog's caller), not as a DB constraint.
export function useMarkForRelease() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async ({ allocationId, planned_release_date }: MarkForReleaseVars) => {
      const { data, error } = await supabase
        .from("allocations")
        .update({ status: "planned_for_release", planned_release_date })
        .eq("id", allocationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations(orgId) });
      // queryKeys.allocations(orgId) is a *different* key branch from
      // allocationsByProject/allocationsByProfile (["allocations", orgId] vs
      // ["allocations", "by-project", id]), so invalidating one never
      // touches the other — without these, AllocationsForProject on the
      // Project Details page (and ResourceProfileDrawer/MyProfilePage) kept
      // showing the pre-release status until a hard refresh re-fetched it.
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationsByProject(data.project_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationsByProfile(data.profile_id) });
      queryClient.invalidateQueries({ queryKey: plannedForReleaseKey(orgId) });
      queryClient.invalidateQueries({ queryKey: calendarAllocationsKey(orgId) });
    },
  });
}
