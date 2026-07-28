import { useMemo } from "react";
import { useUtilizationData } from "@/features/reporting/hooks/useUtilizationData";

// Pure client-side filter over the already-cached utilization query — no
// separate Supabase round trip or query key needed.
export function useOverAllocatedResources() {
  const utilization = useUtilizationData();

  const data = useMemo(() => (utilization.data ?? []).filter((row) => row.isOverAllocated), [utilization.data]);

  return { ...utilization, data };
}
