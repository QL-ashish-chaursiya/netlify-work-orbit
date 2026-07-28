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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations(orgId) });
      queryClient.invalidateQueries({ queryKey: plannedForReleaseKey(orgId) });
      queryClient.invalidateQueries({ queryKey: calendarAllocationsKey(orgId) });
    },
  });
}
