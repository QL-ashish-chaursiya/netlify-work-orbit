import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { AllocationStatus } from "@/lib/database.types";
import type { MonthlyUtilizationPoint } from "@/features/reporting/types";

const TREND_MONTHS = 12;

// Statuses that represent bandwidth that was genuinely committed at some point
// (as opposed to `soft_reserved`, not yet confirmed, or `cancelled`, which never
// happened) — used to reconstruct a historical trend from current allocation rows.
const TREND_STATUSES: AllocationStatus[] = ["active", "planned_for_release", "released"];

interface TrendAllocationRow {
  profile_id: string;
  allocation_percent: number;
  start_date: string;
  expected_completion_date: string | null;
  planned_release_date: string | null;
  actual_release_date: string | null;
}

// Methodology (no historical snapshot table exists, so this is reconstructed
// from current rows — prioritizing an explainable trend over precision):
// - Denominator each month is the org's *current* active, non-Admin
//   headcount (same population as fetchUtilizationRows — every allocatable
//   role counts, only Admin is excluded). We don't track historical
//   headcount, so this is a simplification: it answers "what would average
//   utilization have looked like against today's headcount."
// - An allocation is counted in a given month if [start_date, effective_end]
//   overlaps that month, where effective_end = actual_release_date ??
//   planned_release_date ?? expected_completion_date ?? (still open-ended).
// - Per-month org average = (sum of per-profile allocation_percent overlapping
//   that month) / headcount — profiles with no overlapping allocation
//   contribute 0, same as the live utilization dashboard.
async function fetchMonthlyTrend(): Promise<MonthlyUtilizationPoint[]> {
  const [{ data: profiles, error: profilesError }, { data: allocations, error: allocationsError }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("status", "active").neq("primary_role", "admin"),
      supabase
        .from("allocations")
        .select("profile_id, allocation_percent, start_date, expected_completion_date, planned_release_date, actual_release_date")
        .in("status", TREND_STATUSES),
    ]);

  if (profilesError) throw profilesError;
  if (allocationsError) throw allocationsError;

  const headcount = profiles?.length ?? 0;
  const rows = (allocations ?? []) as TrendAllocationRow[];
  const now = new Date();

  const points: MonthlyUtilizationPoint[] = [];
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const bucketStart = startOfMonth(subMonths(now, i));
    const bucketEnd = endOfMonth(bucketStart);

    const sumsByProfile = new Map<string, number>();
    for (const allocation of rows) {
      const start = new Date(allocation.start_date);
      const effectiveEndRaw =
        allocation.actual_release_date ?? allocation.planned_release_date ?? allocation.expected_completion_date;
      const effectiveEnd = effectiveEndRaw ? new Date(effectiveEndRaw) : null;

      const overlapsBucket = start <= bucketEnd && (!effectiveEnd || effectiveEnd >= bucketStart);
      if (!overlapsBucket) continue;

      sumsByProfile.set(
        allocation.profile_id,
        (sumsByProfile.get(allocation.profile_id) ?? 0) + Number(allocation.allocation_percent),
      );
    }

    const totalUtilization = Array.from(sumsByProfile.values()).reduce((sum, value) => sum + value, 0);
    const averageUtilizationPercent = headcount > 0 ? Math.round((totalUtilization / headcount) * 100) / 100 : 0;

    points.push({
      month: format(bucketStart, "yyyy-MM"),
      label: format(bucketStart, "MMM yyyy"),
      averageUtilizationPercent,
    });
  }

  return points;
}

export function useMonthlyUtilizationTrend() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    // No dedicated query-keys entry exists for the trend view; scope it under
    // the utilization key (same underlying table) plus a distinguishing suffix.
    queryKey: [...queryKeys.utilization(orgId), "monthly-trend"],
    queryFn: fetchMonthlyTrend,
    enabled: !!orgId,
  });
}
