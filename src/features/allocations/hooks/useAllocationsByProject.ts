import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";

// Allocations for one project — powers AllocationsForProject, the component
// meant to slot into the Projects module's ProjectDetailPage placeholder.
export function useAllocationsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.allocationsByProject(projectId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*")
        .eq("project_id", projectId as string)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
