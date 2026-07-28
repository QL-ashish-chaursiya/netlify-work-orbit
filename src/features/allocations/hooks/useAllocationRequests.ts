import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// All allocation requests in the org — general list/history view (RLS-scoped).
export function useAllocationRequests() {
  const { profile } = useAuthRole();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: queryKeys.allocationRequests(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocation_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

// Small helper for pulling a handful of specific requests by id (e.g. the
// "other side" of a request_conflicts row) without re-fetching the whole list.
export function useRequestsByIds(ids: string[]) {
  const sortedIds = [...ids].sort();

  return useQuery({
    queryKey: ["allocation-requests", "by-ids", sortedIds],
    queryFn: async () => {
      if (sortedIds.length === 0) return [];
      const { data, error } = await supabase.from("allocation_requests").select("*").in("id", sortedIds);
      if (error) throw error;
      return data;
    },
    enabled: sortedIds.length > 0,
  });
}
