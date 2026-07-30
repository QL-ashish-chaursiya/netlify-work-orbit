import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { attachAllocationNames } from "@/features/release-planning/hooks/attachAllocationNames";
import type { AllocationWithNames } from "@/features/release-planning/types";

// Allocations already planned_for_release, landing within the next `days`
// days — optionally narrowed to a set of project ids (PM's own projects).
// Reuses attachAllocationNames from release-planning rather than duplicating
// the profile/project name-join logic.
export function useUpcomingReleases(days = 14, projectIds?: string[]) {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;
  const scopeKey = projectIds ? [...projectIds].sort().join(",") : "all";

  return useQuery({
    queryKey: ["dashboard", "upcoming-releases", orgId, days, scopeKey],
    queryFn: async (): Promise<AllocationWithNames[]> => {
      const today = format(new Date(), "yyyy-MM-dd");
      const until = format(addDays(new Date(), days), "yyyy-MM-dd");

      let query = supabase
        .from("allocations")
        .select("*")
        .eq("status", "planned_for_release")
        .gte("planned_release_date", today)
        .lte("planned_release_date", until)
        .order("planned_release_date", { ascending: true });

      if (projectIds) {
        if (projectIds.length === 0) return [];
        query = query.in("project_id", projectIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return attachAllocationNames(data);
    },
    enabled: !!orgId,
  });
}
