import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// The requester withdraws their own pending request. requests_update_approver
// (migration 0011) has a `requested_by = auth.uid() AND status = 'pending'`
// clause specifically for this; the PGRST116 branch below just keeps the
// error message honest for the small remaining edge case (row no longer
// pending by the time this fires) rather than a raw Postgres error.
export function useWithdrawRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from("allocation_requests")
        .update({ status: "withdrawn" })
        .eq("id", requestId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error(
            "This request couldn't be withdrawn — current permissions only allow the approver or an Admin/Tech Lead to change it. Ask them to reject it instead.",
          );
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocation-requests"] });
    },
  });
}
