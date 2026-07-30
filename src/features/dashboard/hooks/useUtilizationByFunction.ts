import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import { fetchUtilizationRows } from "@/features/reporting/hooks/useUtilizationData";

export interface FunctionUtilization {
  businessFunctionId: string;
  name: string;
  averageUtilizationPercent: number;
}

// Current-month utilization averaged per business function — the "By
// function" view for the trend chart. A full trailing-8-month-by-function
// matrix would need a historical snapshot table we don't have; this gives a
// real, current breakdown instead of fabricating history per function.
async function fetchUtilizationByFunction(): Promise<FunctionUtilization[]> {
  const [rows, { data: functions, error }] = await Promise.all([
    fetchUtilizationRows(),
    supabase.from("business_functions").select("id, name"),
  ]);
  if (error) throw error;

  const nameById = new Map((functions ?? []).map((f) => [f.id, f.name]));
  const sums = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    if (!row.businessFunctionId) continue;
    const bucket = sums.get(row.businessFunctionId) ?? { total: 0, count: 0 };
    bucket.total += row.utilizationPercent;
    bucket.count += 1;
    sums.set(row.businessFunctionId, bucket);
  }

  return Array.from(sums.entries())
    .map(([businessFunctionId, { total, count }]) => ({
      businessFunctionId,
      name: nameById.get(businessFunctionId) ?? "Unassigned",
      averageUtilizationPercent: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.averageUtilizationPercent - a.averageUtilizationPercent);
}

export function useUtilizationByFunction() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["dashboard", "utilization-by-function", orgId],
    queryFn: fetchUtilizationByFunction,
    enabled: !!orgId,
  });
}
