import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// The requester withdraws their own pending request.
//
// NOTE (RLS gap): 0002_supplementary_rls_and_guards.sql tightened
// `requests_update_approver` to `requested_by <> auth.uid() AND (admin OR RM
// OR routed_to = auth.uid())` — i.e. the *requester themselves* can never
// satisfy this UPDATE policy, even to withdraw their own row, since it's
// written purely as a self-approval guard with no separate "requester can
// withdraw" clause. In practice this call will come back with zero rows
// (same silent-block shape as self-approval) for the requester's own
// withdraw action. We can't edit supabase/migrations/**, so we detect that
// and surface an explicit, honest error instead of a silent no-op; a future
// migration should add an additional USING clause
// `(requested_by = auth.uid() AND status = 'pending')` scoped to withdrawal.
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
            "This request couldn't be withdrawn — current permissions only allow the approver or an Admin/Resource Manager to change it. Ask them to reject it instead.",
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
