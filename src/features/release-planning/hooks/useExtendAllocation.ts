import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { plannedForReleaseKey } from "@/features/release-planning/hooks/useAllocationsPlannedForRelease";
import { calendarAllocationsKey } from "@/features/release-planning/hooks/useActiveAllocationsForCalendar";

interface ExtendAllocationVars {
  allocationId: string;
  new_expected_completion_date: string;
}

// Pulls the allocation back out of the release pipeline: status returns to
// active, the new completion date replaces the old one, and any previously
// set planned_release_date is cleared.
export function useExtendAllocation() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async ({ allocationId, new_expected_completion_date }: ExtendAllocationVars) => {
      const { data, error } = await supabase
        .from("allocations")
        .update({
          status: "active",
          expected_completion_date: new_expected_completion_date,
          planned_release_date: null,
        })
        .eq("id", allocationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations(orgId) });
      queryClient.invalidateQueries({ queryKey: plannedForReleaseKey(orgId) });
      queryClient.invalidateQueries({ queryKey: calendarAllocationsKey(orgId) });
    },
  });
}
