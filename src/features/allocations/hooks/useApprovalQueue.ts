import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// Pending requests this user can act on: routed_to = me, OR I'm Admin/RM (who
// can pick up any pending request per the BRD). Admin/RM branch fetches
// broadly since RLS already narrows to the org; the non-approver branch
// narrows server-side by routed_to to avoid an awkward .or() filter.
export function useApprovalQueue() {
  const { profile, hasRole } = useAuthRole();
  const routedTo = profile?.id;
  const isApproverRole = hasRole("admin") || hasRole("resource_manager");

  return useQuery({
    queryKey: queryKeys.approvalQueue(routedTo),
    queryFn: async () => {
      let query = supabase.from("allocation_requests").select("*").eq("status", "pending");
      if (!isApproverRole) {
        query = query.eq("routed_to", routedTo as string);
      }
      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}
