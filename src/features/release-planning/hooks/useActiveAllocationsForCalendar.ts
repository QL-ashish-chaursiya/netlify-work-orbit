import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { AllocationWithNames } from "@/features/release-planning/types";
import { attachAllocationNames } from "@/features/release-planning/hooks/attachAllocationNames";

export const calendarAllocationsKey = (orgId: string | undefined) => ["allocations", "calendar", orgId] as const;

// Tech Lead + RM calendar view: active allocations approaching completion
// plus everything already queued for release, so both "coming up" and
// "already scheduled" show on one calendar.
export function useActiveAllocationsForCalendar() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: calendarAllocationsKey(orgId),
    queryFn: async (): Promise<AllocationWithNames[]> => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*")
        .in("status", ["active", "planned_for_release"])
        .or("planned_release_date.not.is.null,expected_completion_date.not.is.null")
        .order("planned_release_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return attachAllocationNames(data);
    },
    enabled: !!orgId,
  });
}
