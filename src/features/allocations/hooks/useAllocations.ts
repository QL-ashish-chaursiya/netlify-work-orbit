import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// All allocations visible in the current org (RLS-scoped — no client-side org filter).
export function useAllocations() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.allocations(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
