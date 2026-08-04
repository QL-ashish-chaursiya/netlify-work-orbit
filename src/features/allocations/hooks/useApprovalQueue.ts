import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";

// Pending requests this user can act on: routed_to = me, OR I'm Admin/RM (who
// can pick up any pending request per the BRD). Admin/RM branch fetches
// broadly since RLS already narrows to the org; the non-approver branch
// narrows server-side by routed_to to avoid an awkward .or() filter.
//
// Requests the caller raised themselves are deliberately still included here
// (not filtered out) so they stay visible in the queue — the
// requests_update_approver RLS policy still blocks a requester from deciding
// their own request, even an Admin/RM, but that's surfaced as a clear
// "You can't approve or reject your own request." error the moment they
// click Approve/Reject (see useDecideAllocationRequest), rather than by
// hiding the row.
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
