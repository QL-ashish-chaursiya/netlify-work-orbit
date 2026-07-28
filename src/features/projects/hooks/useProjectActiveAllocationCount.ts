import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";

// Reads the allocations table directly (read-only) to answer one question:
// "can this project be closed?" — this does not build allocation CRUD, which
// is the Allocations feature's job; it's just the local check the Projects
// status stepper needs to disable/warn on the Close transition (BRD §7).
export function useProjectActiveAllocationCount(projectId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.allocationsByProject(projectId ?? ""), "active-count"] as const,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("allocations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId as string)
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!projectId,
  });
}
