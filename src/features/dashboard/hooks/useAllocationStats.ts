import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

export interface AllocationStats {
  activeCount: number;
  // Share of "ever committed" bandwidth (active + released) that's still
  // active right now — the ring's percent for the Active Allocations card.
  activeSharePercent: number;
  pendingRequestCount: number;
  // Share of all-time requests still awaiting a decision.
  pendingRequestSharePercent: number;
}

// Two small org-wide counts the existing reporting hooks don't already
// cover (those are all utilization/bench-shaped, not allocation/request
// counts) — status columns only, counted client-side; RLS already scopes
// both queries to the caller's org.
async function fetchAllocationStats(): Promise<AllocationStats> {
  const [{ data: allocations, error: allocError }, { data: requests, error: reqError }] = await Promise.all([
    supabase.from("allocations").select("status"),
    supabase.from("allocation_requests").select("status"),
  ]);
  if (allocError) throw allocError;
  if (reqError) throw reqError;

  const activeCount = (allocations ?? []).filter((a) => a.status === "active").length;
  const releasedCount = (allocations ?? []).filter((a) => a.status === "released").length;
  const activeSharePercent =
    activeCount + releasedCount > 0 ? Math.round((activeCount / (activeCount + releasedCount)) * 100) : activeCount > 0 ? 100 : 0;

  const pendingRequestCount = (requests ?? []).filter((r) => r.status === "pending").length;
  const totalRequests = requests?.length ?? 0;
  const pendingRequestSharePercent = totalRequests > 0 ? Math.round((pendingRequestCount / totalRequests) * 100) : 0;

  return { activeCount, activeSharePercent, pendingRequestCount, pendingRequestSharePercent };
}

export function useAllocationStats() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["dashboard", "allocation-stats", orgId],
    queryFn: fetchAllocationStats,
    enabled: !!orgId,
  });
}
