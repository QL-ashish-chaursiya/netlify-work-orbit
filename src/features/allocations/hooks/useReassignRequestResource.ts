import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Lets an approver pick a different resource for a conflict-flagged request
// instead of just marking the conflict resolved — reassigning to someone
// without the same overlapping demand and putting the request back in the
// normal queue (pending) so it can be approved/rejected the usual way. This
// deliberately doesn't re-run automatic conflict detection: the approver
// picked this alternative on purpose, so it's trusted rather than re-flagged.
export function useReassignRequestResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, newProfileId }: { requestId: string; newProfileId: string }) => {
      const { data, error } = await supabase
        .from("allocation_requests")
        .update({ requested_profile_id: newProfileId, status: "pending" })
        .eq("id", requestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["request-conflicts"] });
    },
  });
}
