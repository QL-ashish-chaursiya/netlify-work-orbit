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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations(orgId) });
      queryClient.invalidateQueries({ queryKey: plannedForReleaseKey(orgId) });
      queryClient.invalidateQueries({ queryKey: calendarAllocationsKey(orgId) });
    },
  });
}
