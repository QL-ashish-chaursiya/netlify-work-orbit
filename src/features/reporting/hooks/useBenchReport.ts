import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables } from "@/lib/database.types";
import { fetchUtilizationRows } from "@/features/reporting/hooks/useUtilizationData";
import { fetchIdleThresholds } from "@/features/reporting/hooks/useIdleThresholds";
import { FALLBACK_IDLE_THRESHOLD_PERCENT, type BenchRow } from "@/features/reporting/types";

// Per-profile threshold resolution: a business-function-specific override wins,
// falling back to the org-wide default row (business_function_id: null), and
// finally to FALLBACK_IDLE_THRESHOLD_PERCENT if the org hasn't configured
// idle_thresholds at all yet.
export function resolveThreshold(
  businessFunctionId: string | null,
  thresholds: Tables<"idle_thresholds">[],
): number {
  const specific =
    businessFunctionId != null
      ? thresholds.find((t) => t.business_function_id === businessFunctionId)
      : undefined;
  if (specific) return Number(specific.threshold_percent);

  const orgDefault = thresholds.find((t) => t.business_function_id === null);
  if (orgDefault) return Number(orgDefault.threshold_percent);

  return FALLBACK_IDLE_THRESHOLD_PERCENT;
}

async function fetchBenchReport(businessFunctionId?: string | null): Promise<BenchRow[]> {
  const [rows, thresholds] = await Promise.all([fetchUtilizationRows(), fetchIdleThresholds()]);

  const bench = rows
    .map((row) => ({ ...row, thresholdPercent: resolveThreshold(row.businessFunctionId, thresholds) }))
    .filter((row) => row.utilizationPercent < row.thresholdPercent);

  return businessFunctionId ? bench.filter((row) => row.businessFunctionId === businessFunctionId) : bench;
}

export function useBenchReport(filters: { businessFunctionId?: string | null } = {}) {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;
  const businessFunctionId = filters.businessFunctionId ?? null;

  return useQuery({
    queryKey: [...queryKeys.benchReport(orgId), businessFunctionId],
    queryFn: () => fetchBenchReport(businessFunctionId),
    enabled: !!orgId,
  });
}
