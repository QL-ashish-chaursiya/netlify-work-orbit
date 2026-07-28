import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";

// Allocations for one profile — feeds utilization calcs and the resource drawer.
export function useAllocationsByProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.allocationsByProfile(profileId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*")
        .eq("profile_id", profileId as string)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}
