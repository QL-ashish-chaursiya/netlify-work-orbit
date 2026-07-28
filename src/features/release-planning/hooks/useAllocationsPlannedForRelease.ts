import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { AllocationWithNames } from "@/features/release-planning/types";
import { attachAllocationNames } from "@/features/release-planning/hooks/attachAllocationNames";

// query-keys.ts only has a generic `allocations(orgId)` key; this view needs
// its own cache slot, derived locally per the module brief rather than
// editing the shared factory.
export const plannedForReleaseKey = (orgId: string | undefined) =>
  ["allocations", "planned-for-release", orgId] as const;

// PM-facing list: allocations already marked planned_for_release, soonest
// planned release date first.
export function useAllocationsPlannedForRelease() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: plannedForReleaseKey(orgId),
    queryFn: async (): Promise<AllocationWithNames[]> => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*")
        .eq("status", "planned_for_release")
        .order("planned_release_date", { ascending: true });
      if (error) throw error;
      return attachAllocationNames(data);
    },
    enabled: !!orgId,
  });
}
