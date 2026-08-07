import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-keys";
import { useAuthRole } from "@/features/auth/hooks/useAuthSession";
import type { Tables, TablesInsert } from "@/lib/database.types";

export const SELF_APPROVAL_MESSAGE = "You can't approve or reject your own request.";

interface DecideInput {
  request: Tables<"allocation_requests">;
  decision: "approved" | "rejected";
  decision_notes?: string;
}

// Approve/reject a request. RLS (requests_update_approver, most recently
// 0014_tech_lead_replaces_resource_manager.sql) blocks a requester from
// deciding their own request UNLESS they're Admin — Admin can decide any
// request in their org, including one they raised themselves; Tech Lead (or
// a routed_to approver) still cannot. Depending on exactly which rows/columns
// are touched, a blocked self-decide can surface two different ways: a
// silent "zero rows" result from `.select().single()` (Postgres error
// PGRST116), or an explicit RLS violation on the UPDATE itself (Postgres
// error 42501) — both mean the same thing here, so both get the same
// friendly message instead of a raw error.
export function useDecideAllocationRequest() {
  const { profile, hasRole } = useAuthRole();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ request, decision, decision_notes }: DecideInput) => {
      if (!profile) throw new Error("Not authenticated");
      if (request.requested_by === profile.id && !hasRole("admin")) {
        throw new Error(SELF_APPROVAL_MESSAGE);
      }

      const { data: updated, error: updateError } = await supabase
        .from("allocation_requests")
        .update({
          status: decision,
          decided_by: profile.id,
          decided_at: new Date().toISOString(),
          decision_notes: decision_notes || null,
        })
        .eq("id", request.id)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === "PGRST116" || updateError.code === "42501") {
          throw new Error(SELF_APPROVAL_MESSAGE);
        }
        throw updateError;
      }
      if (!updated) {
        throw new Error(SELF_APPROVAL_MESSAGE);
      }

      if (decision === "approved" && updated.requested_profile_id) {
        const allocationInsert: TablesInsert<"allocations"> = {
          organization_id: updated.organization_id,
          project_id: updated.project_id,
          profile_id: updated.requested_profile_id,
          allocation_percent: updated.allocation_percent,
          status: updated.request_type === "hard_allocation" ? "active" : "soft_reserved",
          start_date: updated.start_date,
          expected_completion_date: updated.end_date,
          created_by: profile.id,
        };
        const { error: allocationError } = await supabase.from("allocations").insert(allocationInsert);
        if (allocationError) throw allocationError;
      }

      return updated;
    },
    onMutate: async ({ request, decision }) => {
      const queueKey = queryKeys.approvalQueue(profile?.id);
      await queryClient.cancelQueries({ queryKey: queueKey });
      const previous = queryClient.getQueryData<Tables<"allocation_requests">[]>(queueKey);
      queryClient.setQueryData<Tables<"allocation_requests">[] | undefined>(queueKey, (old) =>
        old?.filter((r) => r.id !== request.id),
      );
      return { previous, queueKey, decision };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(context.queueKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["allocation-requests"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.allocations(profile?.organization_id) });
    },
  });
}

// "Request info": leaves status untouched, just appends/updates decision_notes
// so the approver can ask a clarifying question without deciding yet. No new
// schema needed — subject to the same self-request RLS block as above.
export function useRequestMoreInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, note }: { requestId: string; note: string }) => {
      const { data, error } = await supabase
        .from("allocation_requests")
        .update({ decision_notes: note })
        .eq("id", requestId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "42501") {
          throw new Error(SELF_APPROVAL_MESSAGE);
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
