import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { plannedForReleaseKey } from "@/features/release-planning/hooks/useAllocationsPlannedForRelease";
import { calendarAllocationsKey } from "@/features/release-planning/hooks/useActiveAllocationsForCalendar";

interface ConfirmReleaseVars {
  allocationId: string;
}

export function useConfirmRelease() {
  const queryClient = useQueryClient();
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async ({ allocationId }: ConfirmReleaseVars) => {
      const { data, error } = await supabase
        .from("allocations")
        .update({ status: "released", actual_release_date: new Date().toISOString().slice(0, 10) })
        .eq("id", allocationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations(orgId) });
      // See the matching comment in useMarkForRelease — allocationsByProject/
      // allocationsByProfile are separate key branches from queryKeys.allocations
      // and need their own invalidation, or AllocationsForProject on the
      // Project Details page shows the stale status until a hard refresh.
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationsByProject(data.project_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationsByProfile(data.profile_id) });
      queryClient.invalidateQueries({ queryKey: plannedForReleaseKey(orgId) });
      queryClient.invalidateQueries({ queryKey: calendarAllocationsKey(orgId) });
    },
  });
}
